# Projet 01 — Visualiseur d'objets pédagogiques en réalité augmentée

> **En une phrase.** Module de formation embarquable dans un LMS : l'apprenant
> explore un équipement industriel en 3D depuis sa leçon, puis le pose à taille
> réelle dans son atelier via la caméra de son téléphone — et chaque
> consultation est tracée jusqu'au Learning Record Store.

**En ligne** : <https://rarv.kodemeet.com/lecon/pompe-centrifuge-01>

---

## 1. Côté apprenant

### 1.1 Exploration 3D dans le navigateur

Le modèle se charge et se manipule sans installation ni greffon.

| Fonction | Détail |
|---|---|
| Manipulation | Rotation, zoom, à la souris comme au doigt |
| Cadrage automatique | Calculé depuis la **sphère englobante** du modèle — aucune valeur codée en dur, le viewer fonctionne à l'identique avec n'importe quel objet |
| Bornes de caméra | Distance limitée à 0,9× → 8× le rayon, sol infranchissable : impossible de se perdre ou de traverser l'objet |
| Chargement | Barre de progression **réelle** (octets reçus), vignette floutée en fond |
| Éclairage | Environnement construit par *lightformers*, ombre de contact au sol |

### 1.2 Annotations

Cinq points d'explication accrochés à des pièces précises de l'équipement.

- **Ancrées en espace local du modèle** — elles suivent ses rotations et son échelle, condition indispensable en réalité augmentée
- **Occultées par la géométrie** : une pastille passant derrière une pièce disparaît, ce qui préserve le repère spatial
- **Décollées de la surface** le long de leur normale, sans quoi elles se masqueraient elles-mêmes
- États visuels : non visitée, visitée, active
- Fiche riche : rôle de la pièce, points de contrôle, défaillances courantes, encadrés de sécurité
- Recentrage animé de la caméra à l'ouverture, **en conservant la direction de vue** — l'apprenant garde ses repères
- Navigation par flèches, toujours accessible même lorsqu'une pastille est masquée

### 1.3 Réalité augmentée

Deux chemins distincts, imposés par les plateformes.

| Plateforme | Technologie | Ce qui est possible |
|---|---|---|
| **Android** | WebXR `immersive-ar` | Détection du sol, placement, annotations 3D interactives |
| **iOS** | AR Quick Look (`.usdz`) | Placement à l'échelle réelle ; annotations non interactives |
| **Desktop** | — | Bascule vers le téléphone par QR code |

Sur Android :

- **Réticule de détection** projeté sur le sol par *hit-test* continu
- Placement au toucher, à **l'échelle réelle** (1 unité glTF = 1 mètre)
- Ombre de contact — c'est elle qui « pose » l'objet dans la pièce
- Ajustement de la taille de 50 % à 200 %, rotation par crans de 15°
- Repositionnement à tout moment
- Pastilles **3D** en RA, les éléments HTML n'étant pas composés par WebXR
- Sortie propre, avec retour à l'état antérieur

### 1.4 Bascule ordinateur → téléphone

Le LMS se consulte sur ordinateur ; la réalité augmentée se vit sur téléphone.

1. Sur ordinateur, un QR code est généré et affiché
2. Le téléphone le scanne et **poursuit la même session**
3. L'ordinateur se met à jour **tout seul** : « ✅ Consulté en RA sur mobile — 3 annotations vues »

Le jeton est à **usage unique**, valable dix minutes. Les deux appareils alimentent un seul relevé, recousu par le `registration` xAPI.

### 1.5 Parcours texte accessible

Le contenu est intégralement consultable **sans 3D** — au clavier seul, au lecteur d'écran, ou sur une machine sans WebGL, où il s'affiche alors **automatiquement**.

Point essentiel : **il journalise comme le parcours 3D**. Un apprenant qui consulte tout en version texte obtient sa complétion et ses déclarations xAPI. Sans cela, l'accessibilité créerait une seconde classe d'apprenants, non traçables.

Construit sur `<details>` natif : clavier, lecteur d'écran et recherche dans la page fonctionnent sans JavaScript.

---

## 2. Côté formateur

### 2.1 Back-office de création

Un formateur crée un objet annoté **sans développeur**.

| Fonction | Détail |
|---|---|
| Téléversement | `.glb`, `.usdz` iOS, vignette |
| **Contrôle du budget** | Le fichier est **inspecté** : triangles comptés, poids mesuré, pièces dénombrées |
| Refus motivé | « 900 000 triangles pour un maximum de 150 000. Simplifiez la géométrie sous Blender » |
| Refus d'un modèle d'une seule pièce | Sans pièces distinctes, les annotations n'ont rien à désigner |
| Calibrage RA | Échelle, axe vertical, placement conseillé (sol, table, mur) |
| Cycle de vie | Brouillon → prévisualisation → publication |

L'inspecteur GLB lit l'en-tête du conteneur et sa charge utile JSON **sans charger la géométrie** — il ne se laisse pas tromper par un simple renommage.

### 2.2 Éditeur visuel d'annotations

Le formateur **clique sur une pièce du modèle** ; un raycast relève le point d'impact et la normale à la surface, et le formulaire s'ouvre à cet endroit.

- Position convertie en **espace local du modèle** — une position en espace monde ferait décrocher les pastilles dès que l'objet tourne
- Le nom de la pièce pré-remplit l'étiquette
- Réordonnancement par glisser-déposer **et** par flèches — le glisser seul serait inutilisable au clavier
- Modification, suppression, prévisualisation

### 2.3 Tableau de bord

| Indicateur | Question à laquelle il répond |
|---|---|
| Consultations | Combien d'apprenants ont ouvert le module ? |
| Taux de passage en RA | La réalité augmentée est-elle réellement utilisée ? |
| Durée moyenne | Le module est-il survolé ou travaillé ? |
| Taux de complétion | Combien vont au bout ? |
| **Annotations classées de la moins vue à la plus vue** | **Quel contenu personne ne consulte ?** |

La dernière ligne débouche sur une action concrète : *« l'annotation n°4 n'est ouverte que par 20 % des apprenants — sa pastille est mal placée »*.

S'y ajoute le journal des déclarations xAPI, avec leur état d'envoi.

---

## 3. Intégration et traçabilité

### 3.1 Composant embarquable

```html
<script src="/js/rarv-viewer.js" defer></script>
<rarv-viewer objet="pompe-centrifuge-01" jeton="…" hauteur="620"></rarv-viewer>
```

- **Web Component en Shadow DOM** : ni les styles du LMS ni ceux du viewer ne se contaminent
- Communication par `postMessage`, **ciblée sur l'origine du parent** — jamais `*`
- Événements DOM standards : `rarv:ready`, `rarv:progress`, `rarv:completed`, `rarv:ar`
- La page hôte ne connaît rien du fonctionnement interne : le composant est intégrable dans un LMS tiers sans adaptation

### 3.2 Chaîne xAPI

Une consultation produit une séquence conforme :

```
initialized → interacted (une par annotation) → experienced → completed → terminated
```

- Acteur identifié **par compte**, jamais par courriel : un LMS fournit un identifiant opaque
- `registration` portant l'identifiant de session — c'est lui qui recoud la séquence quand deux appareils l'alimentent
- Durées au format ISO 8601, extensions pour le type d'appareil et le passage en RA
- **Client LRS interchangeable** : pilote `local` (base de données, inspectable) ou `http` (Learning Locker, SCORM Cloud…). Format identique, seul le transport change
- Déclarations **enregistrées avant envoi** : un LRS injoignable ne fait rien perdre, `rarv:xapi:rejouer` réémet

### 3.3 Règle de complétion configurable

`all_annotations` · `min_duration` · `both` — modifiable par variable d'environnement, sans toucher au code.

---

## 4. Sécurité

| Mesure | Détail |
|---|---|
| Jetons signés | HMAC-SHA256, durée de vie courte, comparaison à temps constant |
| **Identité issue du jeton** | Un client ne peut pas ouvrir une session au nom d'un autre apprenant — un test le prouve |
| Portée `edit` distincte | Un jeton de consultation ne peut pas écrire dans le contenu |
| URL d'assets signées | Liste blanche des fichiers déclarés, traversée de répertoire impossible |
| Purification HTML | **À l'écriture**, côté serveur, par liste blanche — seconde barrière côté client |
| Limitation de débit | Par **session** et non par IP : plusieurs apprenants derrière un même NAT ne se bloquent pas mutuellement |
| En-têtes | CSP adaptée aux workers WebAssembly, `nosniff`, `Permissions-Policy` |

---

## 5. Qualité

| | |
|---|---|
| Tests backend | **237** tests PHPUnit, 1 095 assertions |
| Tests front | **27** tests Vitest |
| Tests E2E | Spécifications Playwright écrites |
| Typage | TypeScript strict, `tsc` sans erreur |
| Profilage | Panneau `?debug` : fps, draw calls, triangles, ressources GPU |
| Gestion d'erreur | WebGL absent, contexte GPU perdu, caméra refusée, `.glb` illisible, API muette |
| Accessibilité | Navigation clavier complète, `prefers-reduced-motion`, parcours texte |
| Bundle initial | **215 Ko** (66 Ko gzip) — Three.js chargé à la demande |

---

## 6. Ce qui n'est pas fait

Annoncé plutôt que dissimulé.

- **Modèle 3D définitif** — celui en ligne est un modèle de substitution généré par script (13 pièces nommées, 1 056 triangles). Le pipeline de remplacement est outillé et documenté ; il attend Blender.
- **Chemin iOS non testé sur appareil** — le `.usdz` est produit par un convertisseur écrit pour le projet et validé structurellement, mais aucun iPhone ne l'a ouvert.
- **LTI 1.3** — l'intégration LMS passe par un Web Component ; la certification LTI n'a pas été entreprise.
- **Navigateurs Playwright non installés** — les tests E2E sont écrits, leur exécution demande un téléchargement de 150 Mo.

---

## 7. Pile technique

**Front** React 19 · TypeScript · Three.js · React Three Fiber · WebXR · react-icons
**Backend** Laravel 13 · PHP 8.3 · MySQL · API REST · jetons HMAC
**Traçabilité** xAPI 1.0.3 · client LRS interchangeable
**Intégration** Web Component · iframe · postMessage
**Outillage** Vite · Vitest · PHPUnit · Playwright · scripts glTF maison
