# Visualiseur d'objets pédagogiques en réalité augmentée

> Module de formation embarquable dans un LMS : un apprenant pose un équipement
> industriel **à taille réelle dans son atelier** depuis son navigateur, consulte
> ses annotations techniques, et l'ensemble remonte au format **xAPI** vers un
> Learning Record Store.

**Sans installation. Sans compte. Sans casque.**

---

## Le problème

Afficher un objet 3D dans un navigateur, n'importe qui le fait en un week-end.
Ce qui manque aux plateformes de formation, c'est le **raccordement** : une
expérience immersive qui ne dit rien au LMS n'est pas un contenu pédagogique,
c'est une animation.

Ce projet traite le raccordement : sessions, journal d'événements, correction
côté serveur, déclarations xAPI, composant embarquable, tableau de bord formateur.
La 3D n'y est que l'interface.

---

## Ce que ça fait

| | |
|---|---|
| **Réalité augmentée sans application** | WebXR sur Android, AR Quick Look sur iOS. Détection du sol, placement à l'échelle réelle, ancrage stable |
| **Annotations ancrées** | 5 points accrochés à des pièces précises, qui suivent les rotations et disparaissent derrière la géométrie |
| **Bascule ordinateur → téléphone** | Un QR code transfère la session en cours ; l'ordinateur affiche en direct ce que fait le téléphone |
| **Traçabilité xAPI** | Séquence complète `initialized → interacted → experienced → completed → terminated`, vers un LRS |
| **Intégration LMS** | Web Component `<rarv-viewer>` + `postMessage`, embarquable dans n'importe quelle page de cours |
| **Contenu administrable** | Un formateur téléverse un modèle, pose ses annotations à la souris, publie — sans développeur |
| **Accessible sans 3D** | Version texte complète au clavier, qui produit **la même traçabilité** que le parcours 3D |

---

## Démonstration

```
/                              vitrine publique avec QR code
/lecon/pompe-centrifuge-01     fausse leçon LMS, viewer embarqué
/dashboard                     tableau de bord formateur (authentifié)
/admin/objets                  back-office de création (authentifié)
{viewer}/                      viewer autonome
{viewer}/?debug                + panneau de profilage
{viewer}/editeur/{slug}?t=…    éditeur visuel d'annotations
{viewer}/ar/{token}            reprise de session après scan du QR
```

Compte de démonstration : `formateur@example.com` / `password`

---

## Architecture

```
┌─ Leçon LMS (Laravel/Blade) ──────────────────┐
│  <rarv-viewer objet="…" jeton="…">           │   ← jeton émis CÔTÉ SERVEUR
│    └─ iframe ─────────────────────────────┐  │
│       │  Viewer 3D (React + Three.js)     │  │
│       │  WebXR · annotations · version    │  │
│       │  texte · bascule QR               │  │
│       └───────────────────────────────────┘  │
│  ↕ postMessage : ready · progress · completed │
└───────────────────────────────────────────────┘
                    ↓ API REST (jeton signé HMAC)
┌─ Laravel ─────────────────────────────────────┐
│  Catalogue · sessions · événements · assets   │
│  Back-office · éditeur d'annotations          │
│  Constructeur xAPI → client LRS               │
└───────────────────────────────────────────────┘
                    ↓
            LRS (local ou distant)
```

---

## Pile technique

**Front** — React 19 · TypeScript · Vite · Three.js · React Three Fiber · drei ·
@react-three/xr (WebXR)

**Back** — Laravel 13 · PHP 8.3 · SQLite / MySQL · jetons signés HMAC-SHA256

**Traçabilité** — xAPI 1.0.3 · client LRS interchangeable (`local` / `http`)

**Tests** — PHPUnit · Vitest · Playwright

---

## Décisions d'architecture

Chacune est documentée dans [`docs/adr/`](docs/adr/), avec les alternatives écartées.

| # | Décision | En une phrase |
|---|---|---|
| [001](docs/adr/001-webxr-plutot-qu-unity.md) | **WebXR plutôt qu'Unity** | Zéro installation vaut mieux que de meilleurs pixels |
| [002](docs/adr/002-double-chemin-ra.md) | **Deux chemins de RA** | Safari iOS n'implémente pas WebXR — ce n'est pas contournable |
| [003](docs/adr/003-jeton-hmac-maison.md) | **Jeton HMAC maison** | Le besoin ne justifiait pas une bibliothèque JWT |
| [004](docs/adr/004-identite-depuis-le-jeton.md) | **L'identité vient du jeton** | Jamais du corps de la requête |
| [005](docs/adr/005-lrs-interchangeable.md) | **Client LRS interchangeable** | Même format de déclarations, transport configurable |
| [006](docs/adr/006-decodeurs-en-local.md) | **Aucun CDN** | Une démo ne doit pas dépendre de `gstatic.com` pour s'afficher |
| [007](docs/adr/007-parcours-texte-trace.md) | **Le parcours texte journalise** | Sinon l'accessibilité crée des apprenants invisibles |

---

## Démarrage

**Prérequis** — PHP 8.3+, Composer, Node 20+

```bash
# API
cd api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000

# Viewer (autre terminal)
cd viewer
npm install
npm run dev          # https://localhost:5173
```

> Le viewer tourne en **HTTPS** : WebXR et l'accès caméra exigent un contexte
> sécurisé, y compris en développement. Acceptez l'avertissement de certificat
> une fois par appareil.

---

## Tests

```bash
cd api    && php artisan test      # 171 tests · 644 assertions
cd viewer && npm run test          #  23 tests
cd viewer && npm run typecheck
cd viewer && npm run e2e           # nécessite : npm run e2e:navigateurs
```

Ce qui ne s'automatise pas — la réalité augmentée, faute de sol réel simulable —
est couvert par la checklist manuelle de
[`docs/matrice-de-tests.md`](docs/matrice-de-tests.md).

---

## Quelques points saillants

**Le budget de performance est appliqué, pas recommandé.** Le back-office ouvre
le fichier `.glb` téléversé, compte ses triangles et refuse un modèle hors budget
— ou composé d'une seule pièce, auquel cas les annotations n'auraient rien à
désigner.

**L'identité de l'apprenant ne vient jamais du client.** Un test envoie
`userRef: "usurpateur"` dans le corps de la requête et vérifie que la session est
bien enregistrée au nom porté par le jeton signé.

**La bascule QR partage une session, elle ne la duplique pas.** Le téléphone
reprend le `sessionId` de l'ordinateur ; le `registration` xAPI recoud la séquence.

**Le HTML des fiches est purifié à l'écriture**, côté serveur, là où le contenu
entre dans le système — pas à l'affichage.

---

## État et limites

| | |
|---|---|
| ✅ | Lots 0, 2 à 10 terminés — 171 tests back, 23 front |
| ⚠️ | Le modèle 3D est un **modèle de substitution généré par script** (13 pièces, 1 056 triangles). Le Lot 1 le remplacera par un modèle réel |
| ⚠️ | Le chemin **iOS est codé mais non testé** — pas d'iPhone disponible. Le fichier `.usdz` reste à produire |
| ⚠️ | Les navigateurs Playwright ne sont pas installés ; les spécifications le sont |
| ⬜ | LTI 1.3 (étape 7.8) non réalisé — la traçabilité passe par xAPI |

Suivi détaillé, décision par décision :
[`SUIVI-PROJET-01.md`](SUIVI-PROJET-01.md)
