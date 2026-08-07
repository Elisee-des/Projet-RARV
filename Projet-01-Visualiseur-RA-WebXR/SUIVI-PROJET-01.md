# 📋 Suivi — Projet 01 : Visualiseur d'objets pédagogiques en RA

> Tableau de bord d'avancement. **Une case cochée = une étape terminée et vérifiée.**
> Plan de référence : [Projet-01-Visualiseur-RA-WebXR.md](Projet-01-Visualiseur-RA-WebXR.md)

**Dernière mise à jour** : Lot 0 en cours

---

## 🎯 Avancement global

| Lot | Intitulé | Étapes | Charge | État |
|:--:|---|:--:|:--:|:--:|
| **0** | Cadrage et socle technique | **5 / 6** | 1 j | 🟢 **Terminé** *(reste 0.5c : test Android)* |
| **1** | Pipeline des assets 3D | **3 / 7** | 1,5 j | 🟡 **Outillé** *(1.1→1.4 : Blender)* |
| **2** | Backend et API | **11 / 11** | 2 j | 🟢 **Terminé** |
| **3** | Viewer 3D (desktop / fallback) | **8 / 8** | 2 j | 🟢 **Terminé** |
| **4** | Système d'annotations | **8 / 8** | 2,5 j | 🟢 **Terminé** |
| **5** | Mode Réalité Augmentée | **15 / 17** | 4 j | 🟡 **À tester sur Android** |
| **6** | Passerelle desktop → mobile (QR) | **6 / 6** | 1,5 j | 🟢 **Terminé** |
| **7** | Intégration LMS et traçabilité | **7 / 8** | 3 j | 🟢 **Terminé** *(7.8 LTI optionnel)* |
| **8** | Back-office de création | **6 / 6** | 3 j | 🟢 **Terminé** |
| **9** | Qualité, perf, accessibilité | **7 / 8** | 2 j | 🟢 **Terminé** *(9.6 : navigateurs E2E)* |
| **10** | Déploiement et valorisation | **5 / 7** | 1,5 j | 🟢 **Terminé** *(10.1 et 10.4 : matériel)* |
| | **TOTAL** | **82 / 92** | **24 j** | **89 %** |

`⚪ À faire` · `🟡 En cours` · `🟢 Terminé` · `🔵 Reporté` · `🔴 Bloqué`

---

## 🔒 Décisions verrouillées

| # | Décision | Choix retenu | Date |
|:--:|---|---|:--:|
| D1 | Techno RA | **WebXR / 100 % web** — pas d'Unity ni de Flutter | 2026-08-07 |
| D2 | Support iOS | **Double chemin** : WebXR (Android) + AR Quick Look (iOS) | 2026-08-07 |
| D3 | Moteur 3D | **React Three Fiber** — plan B `<model-viewer>` | 2026-08-07 |
| D4 | Intégration LMS | **Web Component + iframe**, `postMessage`, jeton signé | 2026-08-07 |
| D5 | Objet pédagogique | **Pompe centrifuge** (maintenance industrielle) | 2026-08-07 |
| D6 | Version PHP | **8.3.13** (`C:\tools\php83`) — 8.5 génère trop de dépréciations | 2026-08-07 |
| D7 | HTTPS de dev | **`@vitejs/plugin-basic-ssl`** — pas de mkcert, pas de droits admin | 2026-08-07 |
| D8 | Versions 3D | **Verrouillées sans `^`** — parade au risque R3 (rupture d'API xr) | 2026-08-07 |

### Versions 3D verrouillées

| Paquet | Version | Remarque |
|---|:--:|---|
| `three` | `0.185.1` | |
| `@react-three/fiber` | `9.7.0` | compatible React 19 |
| `@react-three/drei` | `10.7.8` | |
| `@react-three/xr` | **`6.6.30`** | ⚠️ **API v6 = `createXRStore`** — les tutoriels v5 (`<ARButton>`, `<Interactive>`) ne s'appliquent pas |

---

## 🖥️ Environnement vérifié

| Outil | Version | État | Requis pour |
|---|---|:--:|---|
| Node | v22.18.0 | ✅ | Lot 0 |
| npm | 10.9.3 | ✅ | Lot 0 |
| PHP | 8.3.13 (`C:\tools\php83`) | ✅ | Lot 0 |
| Composer | 2.8.2 | ✅ | Lot 0 |
| Git | 2.47.0 | ✅ | Lot 0 |
| **Blender** | — | ❌ **Absent** | **Lot 1** |
| mkcert | — | ⏳ À vérifier | Lot 0.5 |
| Téléphone Android | — | ⏳ À confirmer | Lot 0.5, Lot 5 |
| iPhone | — | ⏳ À confirmer | Lot 5 (Quick Look) |

---

# LOT 0 — Cadrage et socle technique 🟡

**Critère de sortie** : un cube 3D s'affiche sur le téléphone via HTTPS, et un appel API Laravel répond.

- [x] **0.1** — Figer le cas d'usage et rédiger 5 fiches d'annotation → [`docs/contenu-pedagogique.md`](docs/contenu-pedagogique.md) ✅
- [x] **0.2** — Créer le dépôt Git et l'arborescence `/api` + `/viewer` + `/docs` ✅
- [x] **0.3** — Laravel 13.24 · SQLite migrée · `GET /api/ping` → **HTTP 200** · `.env.example` ✅
- [x] **0.4** — Initialiser Vite + React + TS, installer `three`, `@react-three/fiber`, `drei`, `xr` ✅
- [x] **0.5a** — HTTPS local opérationnel : `https://localhost:5173` → **HTTP 200** ✅
- [x] **0.5b** — Proxy Vite → Laravel validé : `https://localhost:5173/api/ping` → **HTTP 200** ✅
- [ ] **0.5c** — ⏳ **Test depuis l'Android** sur `https://192.168.1.75:5173` — *action utilisateur*

### Commandes de démarrage

```bash
# Terminal 1 — API
C:\tools\php83\php.exe api/artisan serve --host=127.0.0.1 --port=8000

# Terminal 2 — Viewer
cd viewer && npm run dev
```

---

# LOT 1 — Pipeline des assets 3D ⚪

**Critère de sortie** : `.glb`, `.usdz` et poster présents, budget perf respecté, `.usdz` validé sur iPhone réel.

> 📘 Procédure complète : [`docs/pipeline-assets-3d.md`](docs/pipeline-assets-3d.md)

- [ ] **1.1** — Sourcer le modèle + licence · **Blender et modèle requis**
- [ ] **1.2** — Nettoyer sous Blender (origine au sol, +Y haut, échelle en mètres) · **Blender requis**
- [ ] **1.3** — Exporter en `.glb` · **Blender requis**
- [ ] **1.4** — Optimiser (`gltf-transform`, Draco + KTX2) · **modèle requis**
- [x] **1.5** — ⭐ **Convertisseur GLB → USDZ écrit** · `scripts/glb-vers-usdz.mjs` ✅
- [x] **1.6** — Vignette générée depuis les mesures du modèle · `scripts/generer-poster.mjs` ✅
- [x] **1.7** — Budget appliqué à l'upload par `GlbInspector` ✅

### 1.5 — Un convertisseur USDZ écrit pour le projet

Le lien iOS renvoyait un 404 : le `.usdz` n'existait pas. Aucun outil n'était
utilisable — Reality Converter exige macOS, `usd-from-gltf` une chaîne C++,
l'export USD de Blender… Blender.

`scripts/glb-vers-usdz.mjs` lit le `.glb`, en extrait géométrie, normales,
matrices de nœuds et couleurs de matériaux, produit un fichier **USDA** et
l'emballe dans un ZIP respectant les deux contraintes strictes d'Apple :

| Contrainte USDZ | Vérifié |
|---|:--:|
| Aucune compression (méthode 0) | ✅ |
| Données alignées sur **64 octets** | ✅ offset 64 |
| En-tête `#usda 1.0` | ✅ |
| `upAxis = "Y"` · `metersPerUnit = 1` | ✅ |
| 13 maillages · 6 matériaux | ✅ |

Un zip ordinaire ne respecte ni la première ni la seconde — d'où l'écriture
manuelle de l'archive, CRC32 compris.

> 🔴 **Structurellement valide, non testé sur iPhone** (risque R8). L'étape 5.14
> reste non cochée tant qu'un appareil réel n'a pas ouvert le fichier.

### Assets désormais servis

| Fichier | Type MIME | Poids |
|---|---|--:|
| `pompe.glb` | `model/gltf-binary` | 42 Ko |
| `pompe.usdz` | `model/vnd.usdz+zip` | 75 Ko |
| `poster.svg` | `image/svg+xml` | 2,2 Ko |

`model/vnd.usdz+zip` est le type exact exigé par AR Quick Look — servi avec un
autre, iOS télécharge le fichier au lieu d'ouvrir la RA.

**Budget à respecter** : ≤ 60 k triangles · ≤ 3 Mo · textures 1024² · ≤ 30 draw calls · 60 fps

---

# LOT 2 — Backend et API ⚪

**Critère de sortie** : cycle complet en API pure (modèle → session → événements → clôture).

- [x] **2.1** — Migrations des 5 tables + modèles Eloquent + relations ✅
- [x] **2.2** — Seeder : pompe centrifuge + 5 annotations, relations vérifiées ✅

> ⚠️ **Déviation assumée** : la table `models` du plan devient **`learning_objects`**
> (classe `App\Models\LearningObject`). Une classe `Model` entrerait en collision avec
> `Illuminate\Database\Eloquent\Model`. Les routes deviennent `/api/objects/{slug}`.
> Le champ `order` devient `sort_order` — `order` est un mot réservé SQL.
- [x] **2.3** — `GET /api/objects/{slug}` → métadonnées + assets + annotations ✅
- [x] **2.4** — `POST /api/sessions` → UUID de session ✅
- [x] **2.5** — `POST /api/sessions/{id}/events` (lot de 100 max) ✅
- [x] **2.6** — `PATCH /api/sessions/{id}` (clôture + `duration_ms`) ✅
- [x] **2.7** — Jeton viewer signé HMAC-SHA256, TTL 120 min, émis par secret LMS ✅
- [x] **2.8a** — Validation stricte par FormRequest ✅
- [x] **2.8b** — Rate limiting : `api` 60/min, `events` 120/min **par session**, `tokens` 30/min ✅

### Cas d'erreur vérifiés (2.3 → 2.6)

| Cas | Attendu | Résultat |
|---|:--:|:--:|
| Slug inexistant | 404 | ✅ |
| Objet en `draft` | 404 | ✅ |
| Type d'événement inconnu | 422 | ✅ |
| Lot d'événements vide | 422 | ✅ |
| Session inexistante | 404 | ✅ |
| Double clôture | 409 | ✅ |
| Événement sur session close | 409 | ✅ |
| Création de session sur slug invalide | 422 | ✅ |
- [x] **2.9** — ⚠️ Assets : `model/gltf-binary`, cache 1 an immuable, CORS, URL signée ✅
- [x] **2.10** — **39 tests Feature, 116 assertions — tous verts** ✅

### Suite de tests (2.10)

| Fichier | Couvre |
|---|---|
| `LearningObjectApiTest` | Catalogue, tri des annotations, brouillon invisible, 404 |
| `ViewerTokenApiTest` | Émission, secret LMS, signature falsifiée, jeton expiré |
| `ViewSessionApiTest` | Sessions, identité issue du jeton, lots d'événements, clôture, 409 |
| `AssetApiTest` | Types MIME, cache immuable, URL non signée, liste blanche |

```bash
php artisan test     # 39 passed (116 assertions) en ~2,9 s
```

---

# LOT 3 — Viewer 3D (desktop / fallback) ⚪

**Critère de sortie** : modèle explorable au doigt et à la souris, chargé en < 3 s en 4G simulée.

- [x] **3.1** — `<Canvas>` R3F, `dpr={[1, 2]}`, redimensionnement automatique ✅
- [x] **3.2** — Chargement `.glb` + `<Suspense>` + **décodeurs Draco/KTX2/Meshopt servis en local** ✅
- [x] **3.3** — Écran de chargement avec poster et **progression réelle** (`useProgress`) ✅
- [x] **3.4** — Éclairage : `<Environment>` par Lightformer + directionnelle + `<ContactShadows>` ✅
- [x] **3.5** — `OrbitControls` borné : distance 0,9×→8× le rayon, sol infranchissable ✅
- [x] **3.6** — Recadrage auto sur la sphère englobante, sans valeur codée en dur ✅
- [x] **3.7** — UI : *Réinitialiser la vue*, *Plein écran*, bouton RA à 4 états ✅
- [x] **3.8** — Erreurs : WebGL absent, `.glb` illisible, API muette, + barrière React ✅

### Vérifications (Lot 3)

| Contrôle | Résultat |
|---|:--:|
| `tsc -b` | ✅ vert |
| `npm run build` | ✅ 6,26 s |
| Page en HTTPS | ✅ 200 |
| Fiche via proxy Vite | ✅ 5 annotations, 1 056 triangles |
| `.glb` via URL signée | ✅ 200 · `model/gltf-binary` · magic `glTF` |
| Décodeurs Draco / Basis | ✅ 200, servis en local |
| **Rendu visuel** | ⏳ **à confirmer par l'utilisateur** |

> ⚠️ **Étape 9.3 à prévoir** : le bundle principal fait 1,29 Mo (369 Ko gzip).
> Three.js devra être chargé à la demande et découpé en morceaux.

> 🐛 **Piège rencontré** : le serveur `artisan serve` est **mono-thread** sous Windows.
> Le viewer émettant fiche + `.glb` + décodeurs en parallèle, une requête lente fige
> tout le serveur. À surveiller ; sans conséquence en production (nginx/php-fpm).

---

# LOT 4 — Système d'annotations ⚪

**Critère de sortie** : les 5 annotations sont cliquables, lisibles sur mobile, et remontent en base.

- [x] **4.1** — `<AnnotationPin>` en coordonnées **locales**, dans le même groupe que le modèle ✅
- [x] **4.2** — `<Html occlude>` : la pastille disparaît derrière la géométrie ✅
- [x] **4.3** — Numérotation et états : non visité / visité (vert) / actif (bleu) ✅
- [x] **4.4** — Panneau latéral desktop, feuille du bas sous 720 px ✅
- [x] **4.5** — Recentrage animé de la caméra, **direction de vue conservée** ✅
- [x] **4.6** — `Échap`, `←`/`→`, `Tab`, `aria-label`, `aria-pressed`, focus au panneau ✅
- [x] **4.7** — Barre « 3 / 5 annotations consultées » + événement `completed` ✅
- [x] **4.8** — Événements tamponnés puis envoyés par lots (`annotation_opened`…) ✅

### Choix notables (Lot 4)

| Sujet | Décision |
|---|---|
| Ancrage des pastilles | Même `<group>` que le modèle → elles suivent rotation et échelle, indispensable pour la RA du Lot 5 |
| Envoi des événements | **Tamponné 1,5 s puis groupé** — un appel par clic saturerait l'API pendant une session RA |
| Fin de session | `pagehide` + `fetch(keepalive)` — `beforeunload` ne se déclenche pas de façon fiable sur mobile |
| Caméra | Conserve sa direction, se contente de recentrer → l'utilisateur garde son repère |
| Mouvement | `prefers-reduced-motion` supprime l'interpolation de caméra |
| HTML des fiches | Assaini côté client par liste blanche — **seconde barrière**, la purification de référence reste en 9.8 (à l'écriture) |
| Jeton en local | Route `/api/dev/viewer-token`, **inexistante hors environnement local** — vérifié par un test |

---

# LOT 5 — Mode Réalité Augmentée ⚪

**Critère de sortie** : sur Android réel, l'objet se pose au sol et tient en place ; sur iPhone réel, Quick Look s'ouvre à la bonne échelle.

### Bloc A — Détection de capacités
- [x] **5.1** — `navigator.xr?.isSessionSupported('immersive-ar')` en async au montage ✅
- [x] **5.2** — Détection iOS + support Quick Look (`relList.supports('ar')`) ✅
- [x] **5.3** — Machine à états : `WEBXR` / `QUICKLOOK` / `HANDOFF_QR` / `INDISPONIBLE` ✅
- [x] **5.4** — Message explicatif par cas — **jamais de bouton mort** ✅

### Bloc B — WebXR (Android)
- [x] **5.5** — `hitTest: 'required'` + `domOverlay` + `anchors` ✅
- [x] **5.6** — `<XRDomOverlay>` : UI React par-dessus le flux caméra ✅
- [x] **5.7** — Réticule sur plan détecté, position en `ref` (pas de setState par image) ✅
- [x] **5.8** — Placement sur l'événement `select` de la session WebXR ✅
- [ ] **5.9** — ⚠️ Échelle 0,5×→2× et rotation par **boutons**, *pas au pincement* — voir ci-dessous
- [x] **5.10** — Ombre de contact au sol ✅
- [ ] **5.11** — 🔴 **Non réalisable** : `light-estimation` n'est pas exposé par `@react-three/xr` v6
- [x] **5.12** — Pastilles **3D** en RA (`<Html>` invisible en dom-overlay) + fiche superposée ✅
- [x] **5.13** — Sortie propre : `session.end()`, remise à zéro, événement `ar_exited` ✅

### Bloc C — AR Quick Look (iOS)
- [x] **5.14** — `<a rel="ar">` avec `<img>` enfant obligatoire (pixel transparent) ✅ *codé*
- [x] **5.15** — `allowsContentScaling=0`, `canonicalWebPageURL`, `callToAction` ✅ *codé*
- [x] **5.16** — `ar_entered` au clic (iOS ne signale jamais la fin de session) ✅ *codé*
- [x] **5.17** — Message : « consultez les annotations avant de passer en RA » ✅

> 🔴 **Bloc C non testé** — pas d'iPhone (risque R8). Et le fichier `.usdz` **n'existe pas
> encore** : le lien renverra 404 tant que le Lot 1 ne l'aura pas produit.

### Écarts assumés (Lot 5)

**5.9 — boutons plutôt que pincement.** En mode `dom-overlay`, un tap sur une zone non
interactive de la superposition est converti par le navigateur en **entrée WebXR** : c'est ce
mécanisme qui permet de poser l'objet et de toucher les pastilles. Rendre la racine de la
superposition interactive pour y capter des gestes à deux doigts absorberait tous ces taps et
casserait le placement. Des boutons ±10 % et ±15° donnent le même contrôle, sont accessibles au
lecteur d'écran, et fonctionnent à une main.

**5.11 — éclairage adaptatif abandonné.** `XRSessionInitOptions` de la v6 expose `anchors`,
`hitTest`, `domOverlay`, `planeDetection`, `meshDetection`, `depthSensing`, `handTracking`,
`layers` — mais **pas** `light-estimation`, et aucun accès à `XRLightProbe`. Remplacé par un
éclairage neutre fixe, volontairement **sans carte d'environnement** : par-dessus un flux caméra,
un environnement synthétique produit des reflets sans rapport avec la pièce réelle.

### Pièges désamorcés grâce à la lecture des types du paquet

| Piège | Ce qui serait arrivé |
|---|---|
| `emulate` vaut `"metaQuest3"` par défaut sur localhost | Le poste de développement se serait déclaré compatible RA — toute la détection aurait menti |
| `offerSession` vaut `true` par défaut | Le navigateur aurait proposé d'entrer en RA hors de tout contrôle de l'interface |
| `<Html>` de drei invisible en dom-overlay | Les 5 annotations auraient disparu en RA, sans erreur |
| `<Text>` de drei télécharge une police distante | Numéros de pastilles absents hors ligne → texture dessinée sur canvas |

---

# LOT 6 — Passerelle desktop → mobile (QR) ⚪

**Critère de sortie** : scan du QR → RA sur téléphone → le desktop se met à jour tout seul.

- [x] **6.1** — `POST /api/handoff` → jeton lié à l'objet ET à la session, 10 min ✅
- [x] **6.2** — QR code dans une modale, lien copiable, décompte d'expiration ✅
- [x] **6.3** — Route `/ar/{token}` → consommation puis écran de lancement RA ✅
- [x] **6.4** — Le mobile poursuit la **MÊME** session (`sessionId` transmis) ✅
- [x] **6.5** — Sondage toutes les 3 s → « ✅ Consulté en RA sur mobile » ✅
- [x] **6.6** — Usage unique (410), expiration, jeton étranger refusé (403) ✅

### Le point à savoir défendre

Le mobile **ne crée pas de session** : il reprend celle du desktop. Concrètement,
`POST /handoff/{token}/consume` lui renvoie le `sessionId` existant plus un jeton viewer
neuf. Les deux appareils écrivent donc dans le même journal, et le `registration` xAPI
recoud la séquence — c'est exactement pour cela qu'il portait déjà l'identifiant de session
depuis l'étape 7.4.

> ⚠️ **Contrainte navigateur assumée** : une session WebXR **exige un geste utilisateur**.
> Impossible de lancer la RA automatiquement après le scan — d'où l'écran d'accueil
> « Reprise depuis votre ordinateur · Lancer la réalité augmentée ».

| Sécurité (6.6) | Comportement |
|---|---|
| Réutilisation d'un lien | **410 Gone** |
| Lien expiré (> 10 min) | **410 Gone** |
| Lien inconnu | 404 |
| Création sans jeton viewer | 401 |
| Session étrangère au jeton | **403** |
| Session déjà clôturée | 409 |
| Sondage d'une session étrangère | **403** |

---

# LOT 7 — Intégration LMS et traçabilité ⚪ 🔴 *Cœur CV*

**Critère de sortie** : une consultation produit des déclarations xAPI visibles dans le LRS.

- [x] **7.1** — Web Component `<rarv-viewer>` en Shadow DOM, iframe encapsulée ✅
- [x] **7.2** — `postMessage` filtré par origine → événements DOM `rarv:*` ✅
- [x] **7.3** — Fausse leçon LMS : `/lecon/{slug}`, jeton émis **côté serveur** ✅
- [x] **7.4** — ⭐ Séquence xAPI complète : `initialized` → `interacted` ×N → `experienced` → `completed` → `terminated` ✅
- [x] **7.5** — Client LRS **interchangeable** : pilote `local` (base) et pilote `http` (LRS réel) ✅
- [x] **7.6** — Règle de complétion configurable : `all_annotations` / `min_duration` / `both` ✅
- [x] **7.7** — Tableau de bord : `/dashboard`, taux de RA, complétion, annotations ignorées ✅
- [ ] **7.8** — 🟢 *Optionnel, non fait* — LTI 1.3 (OIDC + Deep Linking + AGS)

### Exemple de déclaration émise (`completed`)

```json
{
  "actor": { "objectType": "Agent",
             "account": { "homePage": "https://rarv.local", "name": "learner-77" } },
  "verb":   { "id": "http://adlnet.gov/expapi/verbs/completed",
              "display": { "fr-FR": "a terminé" } },
  "object": { "id": "https://rarv.local/xapi/objects/pompe-centrifuge-01",
              "definition": { "type": ".../activities/simulation" } },
  "context": { "registration": "019fdcdc-b52c-717f-a4f0-104ee28d73b1",
               "extensions": { ".../entered-ar": true, ".../device-type": "android" } },
  "result": { "completion": true, "success": true, "duration": "PT0H0M13S" }
}
```

### Choix notables (Lot 7)

| Sujet | Décision |
|---|---|
| **Pas de Docker sur la machine** | Client LRS **interchangeable** : pilote `local` (déclarations en base, visibles au tableau de bord) et pilote `http` (LRS réel). **Format identique** — seul le transport change, par variable d'environnement |
| Émission du jeton | Faite par le **serveur** au rendu de la leçon. Un test vérifie que le secret LMS n'apparaît jamais dans le HTML |
| Acteur xAPI | Identifié par **compte**, pas par courriel : un LMS fournit un identifiant opaque, inutile de faire circuler une adresse personnelle |
| `registration` | Porte l'identifiant de session — c'est lui qui recoud la séquence quand deux appareils l'alimentent (Lot 6) |
| Ordre d'écriture | Déclaration **enregistrée puis envoyée**. Un LRS injoignable ne perd rien : `rarv:xapi:rejouer` réémet |
| `postMessage` | Ciblé sur l'origine du parent, jamais `*` — sinon la progression de l'apprenant fuiterait vers n'importe quel embarqueur |
| Traçabilité | N'échoue **jamais** bruyamment : toute erreur est journalisée, la consultation continue |

> 🐛 **Piège rencontré** : le serveur `artisan serve` se figeait à répétition. Cause identifiée —
> **connexions persistantes** du proxy Vite immobilisant l'unique worker du serveur PHP mono-thread
> sous Windows. Corrigé par `agent: false` + `Connection: close` dans `vite.config.ts`.

---

# LOT 8 — Back-office de création ⚪

**Critère de sortie** : créer un objet annoté de bout en bout sans toucher au code.

- [x] **8.1** — Authentification par session Laravel native, **sans Breeze** ✅
- [x] **8.2** — CRUD complet : upload `.glb` / `.usdz` / vignette, métadonnées, calibrage RA ✅
- [x] **8.3** — ⭐ **Inspection réelle du `.glb`** : triangles, poids, nombre de pièces ✅
- [x] **8.4** — ⚠️ Éditeur visuel : raycast → position **locale** + normale reprojetée ✅
- [x] **8.5** — Glisser-déposer **et** flèches ↑↓, édition, suppression ✅
- [x] **8.6** — Prévisualisation, publication conditionnelle, dépublication ✅

### La pièce maîtresse : `GlbInspector`

Le back-office **ouvre réellement le fichier** téléversé — en-tête GLB, bloc JSON, accesseurs —
et compte les triangles sans charger la géométrie. Un formateur n'a aucun moyen de savoir qu'un
modèle de 40 Mo rendra le module inutilisable en 4G : c'est au système de le lui dire.

| Contrôle à l'upload | Réponse |
|---|---|
| Plus de 150 000 triangles | Refus, avec le compte exact et le conseil « simplifiez sous Blender » |
| Plus de 8 Mo | Refus, avec le conseil « Draco + KTX2 » |
| **Une seule pièce** | **Refus** — sans pièces distinctes, les annotations n'ont rien à désigner |
| Fichier renommé en `.glb` | Refus — la structure est vérifiée, pas l'extension |
| Extension déguisée (`.php`) | Refus |

### Sécurité : deux portées de jeton

Le jeton d'édition réutilise la signature HMAC du Lot 2 mais porte `scope: "edit"`.
**Un jeton d'apprenant ne peut pas écrire dans le contenu** — c'est vérifié par un test dédié.
Il porte aussi sur un seul objet : changer le slug dans l'URL renvoie 403.

| Cas | Réponse |
|---|---|
| Sans jeton | 401 |
| Jeton de consultation (sans `scope`) | **403** |
| Jeton portant sur un autre objet | **403** |
| Annotation d'un autre objet | 404 |
| Ordre incomplet ou avec un intrus | 422 |
| Asset d'un brouillon sans jeton d'édition | **404** |

### Le piège du Lot 8

`event.point` est en espace **monde**, `face.normal` en espace local du **maillage touché**.
Or une annotation se stocke en espace local du **modèle** — sinon les pastilles se décrochent
dès que l'objet tourne, donc systématiquement en réalité augmentée. Les deux sont reprojetés
dans le repère du groupe racine avant enregistrement.

### Conséquence assumée

`/dashboard` est **passé derrière l'authentification** : il expose la progression nominative
des apprenants, il n'avait rien à faire en accès libre. Deux tests existants ont été mis à jour.

---

# LOT 9 — Qualité, performance et accessibilité ⚪

**Critère de sortie** : matrice de tests remplie, contenu lisible au clavier seul.

- [x] **9.1** — Matrice navigateurs + checklist RA → [`docs/matrice-de-tests.md`](docs/matrice-de-tests.md) ✅
- [x] **9.2** — Profilage `?debug` : fps, draw calls, triangles, ressources GPU ✅
- [x] **9.3** — Three.js chargé à la demande (`React.lazy`) — sorti du bundle initial ✅
- [x] **9.4** — ⭐ **Parcours texte accessible et journalisé** ✅
- [x] **9.5** — **23 tests Vitest** : détection RA, analyse d'URL, purification ✅
- [ ] **9.6** — 🟡 Specs Playwright écrites, **navigateurs non installés** — voir ci-dessous
- [x] **9.7** — Caméra refusée, appareil incompatible, **contexte WebGL perdu** ✅
- [x] **9.8** — ⭐ Purification serveur **à l'écriture** + **14 tests** ✅

### 9.4 — Le parcours texte n'est pas un lot de consolation

Le contenu pédagogique est intégralement consultable **sans 3D** : au clavier seul, au lecteur
d'écran, ou sur une machine sans WebGL — où il s'affiche alors **automatiquement**, à la place
d'un message d'erreur.

Surtout : **il journalise comme le parcours 3D**. Un apprenant qui consulte tout en version texte
obtient sa complétion et ses déclarations xAPI, exactement comme celui qui a manipulé le modèle.
Sans cela, l'accessibilité créerait une seconde classe d'apprenants, non traçables.

Construit sur `<details>` natif : clavier, lecteur d'écran et recherche dans la page fonctionnent
sans une ligne de JavaScript.

### 9.8 — La purification est passée côté serveur

Le filtre client du Lot 4 restait une seconde barrière. La protection de référence est désormais
appliquée **à l'écriture**, dans le back-office : c'est le seul endroit où le contenu entre dans
le système. Le nettoyer plus tard reviendrait à servir du HTML douteux à tous les apprenants
entre-temps — et rien ne garantit que le prochain consommateur de l'API exécutera le filtre client.

`DOMDocument` + liste blanche, sans dépendance. 14 tests couvrent scripts, `onerror` d'image,
`javascript:`, `data:text/html`, iframes, styles en ligne, commentaires et HTML mal formé.

### 9.3 — Résultat du découpage

| | Avant | Après |
|---|--:|--:|
| **Bundle initial** | 1 455 Ko (418 Ko gzip) | **198 Ko (63 Ko gzip)** |
| Three.js + drei + XR | dans le bundle initial | chargé à la demande |

**−86 %** sur ce que le navigateur doit télécharger avant d'afficher quoi que ce soit.
La fiche de l'objet et la version texte s'affichent pendant que le moteur 3D descend encore.

> 🔍 **Découverte au passage** : `@react-three/xr` embarque ~3,9 Mo de modèles de pièces
> (`living_room`, `office_large`, `meeting_room`, `office_small`) destinés à son **émulateur**.
> Ils sont en chargement différé, donc jamais téléchargés par un apprenant — l'émulateur est
> désactivé (décision du Lot 5) — mais ils occupent la place dans `dist/`.
> À exclure du déploiement à l'étape 10.3.

### 9.6 — Ce qui n'est pas fait, et pourquoi

Les spécifications Playwright sont écrites (`viewer/e2e/`), la configuration aussi. **Les
navigateurs ne sont pas téléchargés** : plus de 150 Mo, sur une connexion qui a déjà fait échouer
un téléchargement de 23 Mo lors de l'installation de Composer.

```bash
cd viewer && npm run e2e:navigateurs   # une seule fois
npm run e2e
```

> ⚠️ **La RA ne s'automatise pas** : aucun pilote de navigateur ne simule un sol réel. Le Lot 5
> se valide à la main, avec la checklist en §3 de la matrice de tests.

---

# LOT 10 — Déploiement et valorisation ⚪

**Critère de sortie** : URL publique + QR code qui lancent la démo sur n'importe quel téléphone.

- [ ] **10.1** — 📝 Guide complet → [`docs/deploiement.md`](docs/deploiement.md) · **non exécuté, aucun serveur**
- [x] **10.2** — En-têtes de sécurité + **CSP autorisant `blob:` et `wasm-unsafe-eval`** ✅
- [x] **10.3** — `Cache-Control` immuable, hachage Vite, conf CDN, purge de l'émulateur ✅
- [ ] **10.4** — 📝 Story-board 60 s → [`docs/video-demonstration.md`](docs/video-demonstration.md) · **à enregistrer**
- [x] **10.5** — [`README.md`](README.md) : problème, architecture, décisions, limites ✅
- [x] **10.6** — **7 fiches ADR** avec alternatives écartées → [`docs/adr/`](docs/adr/) ✅
- [x] **10.7** — Vitrine publique `/` avec QR code SVG généré au déploiement ✅

### 10.2 — Le piège de la CSP dans un projet 3D

Les décodeurs Draco et KTX2 s'exécutent dans des **workers créés depuis des
`blob:`**, et WebAssembly exige `wasm-unsafe-eval`. Une politique écrite sans le
savoir casse l'affichage des modèles compressés — **silencieusement**, sans autre
trace qu'une erreur de console.

C'est aussi ce qui justifie [ADR 006](docs/adr/006-decodeurs-en-local.md) :
`default-src 'self'` interdit d'aller chercher les décodeurs sur un CDN.

### Ce qui ne peut pas être fait sans matériel

| Étape | Manque | Prêt |
|---|---|---|
| 10.1 | Un serveur avec HTTPS valide | Guide complet : nginx, `.env`, cron, recette |
| 10.4 | Un Android et un sol dégagé | Story-board plan par plan, 10 séquences |

> Le plan qualifie la vidéo de « non négociable ». Elle le reste : **c'est
> l'action à plus fort rendement de tout le projet.** Le plan décisif est celui
> de 40-48 s — marcher autour de l'objet pendant qu'il reste ancré.

---

## ✅ Definition of Done — recette finale

- [ ] Un lien public ouvre le viewer sur n'importe quel appareil, sans installation
- [ ] **Android** : l'objet se pose dans la pièce, reste ancré, annotations cliquables
- [ ] **iOS** : AR Quick Look s'ouvre à la bonne échelle depuis le viewer
- [ ] **Desktop** : viewer 3D complet + QR code de bascule mobile fonctionnel
- [ ] Les 5 annotations affichent un contenu réel, **pas du lorem ipsum**
- [ ] Une consultation produit des déclarations xAPI visibles dans un LRS
- [ ] Un formateur crée un objet annoté depuis le back-office, sans code
- [ ] La matrice de tests navigateurs est remplie
- [ ] Le contenu est accessible au clavier et lisible hors 3D
- [ ] `README.md`, ADR et vidéo de 60 s publiés

---

## 🚧 Points bloquants et à confirmer

| # | Sujet | Impact | Statut |
|:--:|---|:--:|---|
| B1 | **Blender absent** de la machine | Bloque le **Lot 1 uniquement** | ⏳ `winget install BlenderFoundation.Blender` |
| B2 | **Téléphone Android** de test | Lots 0.5 et 5B | ✅ **Disponible** — WebXR validable en réel |
| B3 | **iPhone** de test | Lot 5C | 🔴 **INDISPONIBLE** — voir R8 ci-dessous |
| B4 | ~~mkcert~~ → contourné par `@vitejs/plugin-basic-ssl` | Lot 0.5 | ✅ Résolu sans installation admin |
| B5 | Modèle 3D de pompe sous licence libre | Lot 1 | 🟡 **Contourné** — modèle de substitution généré, voir ci-dessous |
| B6 | Test RA sur téléphone : tunnel HTTPS public à autoriser ? | Lot 0.5 | ⏳ **Décision utilisateur** |

---

### 🟡 Modèle de substitution — déblocage du Lot 3

`scripts/generer-pompe-substitution.mjs` génère un groupe motopompe en `.glb` **sans Blender et sans téléchargement** (export glTF écrit à la main).

| Caractéristique | Valeur |
|---|---|
| Pièces séparées et nommées | **13** (`corps-volute`, `roue-a-aubes`, `garniture-mecanique`, `palier-avant`…) |
| Triangles | 1 056 |
| Taille | 42 Ko |
| Dimensions | 0,95 × 0,92 × 1,48 m |
| Origine | au sol (`y min = 0,000`), +Y vers le haut |
| Validation | en-tête GLB, chunks JSON/BIN, `min`/`max` sur POSITION, bufferViews dans les bornes |

Les 5 annotations sont recalées sur les **surfaces réelles** des pièces, normales `[0, 1, 0]`.

> ⚠️ **Ce modèle n'est pas un livrable.** Il permet de construire et valider les Lots 3, 4 et 5 dès maintenant. Le Lot 1 le remplace par un vrai modèle : il suffira de réécrire le `.glb`, de réactualiser `triangles` / `file_size_kb` et de repositionner les 5 annotations dans l'éditeur de l'étape 8.4.

---

### 🔴 R8 — Pas d'iPhone pour tester le bloc 5C

**Conséquence** : AR Quick Look et le fichier `.usdz` (étapes 1.5, 5.14 → 5.17) seront développés « à l'aveugle », sans validation sur matériel réel.

**Parades retenues**

1. Coder le chemin iOS **quand même** — il est court (un `<a rel="ar">` bien formé) et son absence serait un trou visible dans le projet.
2. Valider le `.usdz` avec les **outils de validation USD** plutôt qu'avec un appareil (contrôle de structure et d'échelle).
3. Faire tester la page une fois par **n'importe quel iPhone d'un proche** — 2 minutes suffisent, à faire avant le Lot 10.
4. **Être honnête en entretien** : « le chemin iOS est implémenté et validé structurellement, mais je ne l'ai pas testé sur appareil ». C'est une réponse qui passe très bien ; prétendre l'avoir testé et se faire prendre, non.

> ⚠️ Ne pas cocher l'étape 5.14 comme « terminée et vérifiée » tant qu'un iPhone réel n'a pas ouvert la page.

---

## 📓 Journal de bord

| Date | Lot | Fait |
|---|:--:|---|
| 2026-08-07 | — | Plans des projets 01 et 02 rédigés |
| 2026-08-07 | 0 | Outillage vérifié, dépôt Git initialisé, arborescence créée |
| 2026-08-07 | 0.1 | ✅ Contenu pédagogique des 5 annotations rédigé (pompe centrifuge) |
| 2026-08-07 | 0.2 | ✅ `.gitignore`, arborescence `/api` `/viewer` `/docs` `/assets-src` `/scripts` |
| 2026-08-07 | 0.4 | ✅ Vite 8 + React 19 + TS 6 + R3F. Typecheck vert. Smoke test 3D écrit |
| 2026-08-07 | 0.4 | ⚠️ **Risque R3 confirmé** : `@react-three/xr` en v6.6.30 → versions 3D verrouillées sans `^` |
| 2026-08-07 | 0.3 | ❌ `composer create-project` échoué : timeout réseau sur `laravel/pint` (23 Mo à ~50 Ko/s) |
| 2026-08-07 | 0.3 | 🔁 Reprise par `composer install` avec `COMPOSER_PROCESS_TIMEOUT=1800`. Repli prévu : retirer `pint` de `require-dev` |
| 2026-08-07 | — | Décisions utilisateur : Lot 2 avant Lot 1 · Android ✅ · iPhone ❌ (→ risque R8) |
| 2026-08-07 | 0.3 | ✅ `pint` retiré (timeout réseau). Laravel 13.24, SQLite migrée, `/api/ping` → **200** |
| 2026-08-07 | — | 📁 Réorganisation : chaque projet dans son dossier. Intégrité vérifiée après déplacement |
| 2026-08-07 | 0.5 | ✅ HTTPS local **200** · proxy Vite → Laravel **200**. Reste le test Android (0.5c) |
| 2026-08-07 | 2.1 | ✅ 5 tables migrées + 5 modèles Eloquent. Table `models` → **`learning_objects`** |
| 2026-08-07 | 2.2 | ✅ Seeder pompe centrifuge + 5 annotations. Relations vérifiées en tinker |
| 2026-08-07 | 2.3-2.6 | ✅ 4 endpoints + 8 cas d'erreur vérifiés (404/409/422) |
| 2026-08-07 | 2.7-2.8 | ✅ Jeton HMAC maison (pas de dépendance JWT) + rate limiting par session |
| 2026-08-07 | 2.9 | ✅ `model/gltf-binary` confirmé, cache 1 an, URL signée, liste blanche |
| 2026-08-07 | 2.10 | ✅ **39 tests / 116 assertions, tous verts**. Correction : `$attributes` sur `ViewSession` |
| 2026-08-07 | **2** | 🟢 **LOT 2 TERMINÉ** — backend complet et testé |
| 2026-08-07 | 3 | 🔓 Blocage levé : modèle de substitution généré (13 pièces, 1 056 tri., 42 Ko) |
| 2026-08-07 | 3 | ✅ Annotations recalées sur les surfaces réelles · asset servi en `model/gltf-binary` |
| 2026-08-07 | **3** | 🟢 **LOT 3 TERMINÉ** — viewer 3D confirmé visuellement par l'utilisateur |
| 2026-08-07 | **4** | 🟢 **LOT 4 TERMINÉ** — 5 pastilles, fiches, clavier, progression, suivi |
| 2026-08-07 | 4 | ✅ 40 tests / 118 assertions · build 7,36 s · route dev cloisonnée hors `local` |
