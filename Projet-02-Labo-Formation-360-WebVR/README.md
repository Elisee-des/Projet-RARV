# Laboratoire de formation interactif à 360°

> Environnement de formation 3D navigable dans le navigateur, où l'apprenant déclenche des quiz et
> des vidéos en se déplaçant dans un atelier de maintenance. Les quiz sont **corrigés côté
> serveur**, la progression est sauvegardée, et l'ensemble remonte en **xAPI** vers un Learning
> Record Store avec un tableau de bord formateur.

**Sans installation, sans casque, sans compte.**

---

## Le problème

Une formation à la maintenance industrielle se heurte à un mur pratique : l'atelier, les machines
et le formateur ne sont pas disponibles en même temps que l'apprenant. Les alternatives
habituelles — diaporama, vidéo, e-learning à clics — ne mettent jamais l'apprenant *dans* le lieu,
et ne mesurent pas grand-chose.

Ce projet met l'atelier dans un onglet : on s'y déplace, on s'approche d'un poste, on y fait
quelque chose, et le formateur voit ce qui a été compris.

---

## Essayer

| Écran | Ce qu'on y voit |
|---|---|
| **/** | Présentation, et ce qui n'est pas terminé |
| **/atelier** | La formation en 3D |
| **/accessible** | La **même** formation au clavier, sans WebGL |
| **/lecon** | La formation embarquée dans une page de cours LMS |
| **/formateur** | Complétion, score moyen, questions les plus ratées, export CSV |
| **/tracabilite** | Les déclarations xAPI émises |

Aucune authentification : une identité d'apprenant est attribuée à la première visite et suit d'un
écran à l'autre.

---

## Décisions d'architecture

Chacune est détaillée dans [`docs/adr/`](docs/adr/).

| # | Décision | Pourquoi |
|:--:|---|---|
| **D1** | **Scène 3D navigable**, pas des panoramas 360° | Le déplacement libre est ce qui a de la valeur technique. Plan B assumé : basculer sur des panoramas — toute la couche pédagogique reste identique |
| **D2** | **React Three Fiber**, pas A-Frame | L'interface (quiz, panneaux, HUD) est la moitié du travail ; le modèle à entités d'A-Frame se marie mal avec une UI React complexe |
| **D3** | **Capsule contre BVH** (`three-mesh-bvh`), pas un moteur physique | On ne simule rien, on empêche de traverser un mur. Un moteur physique complet serait surdimensionné |
| **D4** | **Lightmaps précalculées** | Un éclairage temps réel avec ombres effondre le framerate mobile. C'est la décision qui détermine si le projet est jouable sur téléphone |
| **D5** | **Correction du quiz côté serveur** | Le front ne reçoit jamais l'indicateur de bonne réponse. Évident en formation notée, et raté par presque tous les projets de portfolio |
| **D6** | **Backend mutualisé** avec le Projet 01 | Sessions, journal, jeton signé et chaîne xAPI existaient déjà et étaient testés. Une seule plateforme, deux modules |
| **D7** | **Atelier de maintenance** comme environnement | Prolonge le fil des trois projets, et permet de poser la pompe centrifuge du Projet 01 dans la salle |

---

## Les quatre points à défendre

### 1. La correction est côté serveur, et un test le prouve

Le navigateur envoie des identifiants de cases cochées. Rien d'autre. La ressource API des
questions exclut explicitement `is_correct`, le modèle `Choice` le masque à la sérialisation, et un
test échoue si la chaîne apparaît dans le **corps brut** d'une réponse HTTP.

La règle va plus loin qu'il n'y paraît : une déclaration xAPI part vers un service **tiers**. Un
test dédié vérifie qu'aucun corrigé n'y figure — y inscrire les réponses attendues publierait le
barème, et ce serait le contournement le plus discret de toute la posture.

### 2. Les collisions sont une capsule contre un BVH

Le BVH est bâti sur un **mesh de collision dédié de 180 triangles**, jamais sur la géométrie
visible. Tester une capsule contre une salle détaillée coûterait cent fois plus cher pour un
résultat *pire* — un personnage qui accroche sur chaque poignée.

Le même BVH ressert au système d'interaction pour savoir si un poste est masqué par un mur.

**Le défaut que la recette a révélé** : une capsule nue ne franchit aucune marche. La première
parade — soulever la capsule et juger au résultat — faisait *escalader le socle de la pompe*,
parce qu'une fois soulevée de 25 cm la calotte inférieure passe au-dessus d'un obstacle de 40 cm.
La version retenue lance une **sonde verticale** : *à quelle hauteur est le sol devant moi ?*

`npm run recette:collisions` — 13 cas contre le vrai `collision.glb`.

### 3. L'attestation est générée par le serveur

PDF écrit sans dépendance, à partir de données **relues en base**. La règle de complétion est
**rejouée au moment de la délivrance** : un test rend un poste obligatoire après coup et vérifie
qu'une attestation déjà obtenue devient invalide.

### 4. Le parcours 2D rapporte trois fois

[`/accessible`](#essayer) est la formation complète sans 3D. C'est **une obligation
d'accessibilité**, **le support des tests de bout en bout** — la 3D ne s'automatise pas — et **le
plan de repli** si la production de la salle 3D dérape.

Il est possible parce que l'architecture le prévoyait : les activités n'ont jamais dépendu du
moteur de rendu.

---

## Démarrer en local

```powershell
# 1. Backend (mutualisé avec le Projet 01)
C:\tools\php83\php.exe "../Projet-01-Visualiseur-RA-WebXR/api/artisan" serve --port=8000

# 2. Assets de la formation, si le stockage est vide
cd lab
npm run blocking:generer     # salle + mesh de collision + repères nommés
npm run assets:generer       # fiches PDF + sous-titres

# 3. Front
npm run dev                  # https://localhost:5174
```

Le certificat est auto-signé (`@vitejs/plugin-basic-ssl`) : le navigateur affiche un
avertissement, qu'il faut accepter. HTTPS est nécessaire — WebXR l'exige, et le test sur téléphone
passe par là.

---

## Vérifier

```powershell
# Backend — API, correction, xAPI, attestation, purification HTML
C:\tools\php83\php.exe artisan test              # 225 tests

cd lab
npm test                     # 29 tests unitaires
npm run test:e2e             # 10 tests de bout en bout
npm run recette              # collisions, structure PDF, chaîne complète
npm run typecheck
```

L'état détaillé de ce qui est vérifié **et de ce qui ne l'est pas** :
[`docs/matrice-tests.md`](docs/matrice-tests.md).

---

## Ce qui n'est pas terminé

Un portfolio honnête dit où il s'arrête.

| Sujet | État |
|---|---|
| **Habillage 3D** | La salle est un *blocking* — volumes gris aux dimensions réelles, générés par script. Textures, matériaux et lightmaps demandent Blender, absent de la machine |
| **Vidéos de formation** | Non tournées. Les scripts sont écrits et minutés, les sous-titres générés ; le lecteur se replie sur le contenu écrit et le poste reste validable |
| **Mode casque VR** | Lot bonus, non commencé. Il impose de redévelopper toute l'interface en 3D — les modales HTML sont invisibles en VR |
| **LTI 1.3** | Non retenue. Plusieurs jours pour une intégration que le Web Component couvre déjà |
| **iOS, Firefox, Safari** | Non testés — pas de matériel. Le code applique les règles documentées, il n'a pas été exécuté dessus |

---

## Intégrer dans un LMS

```html
<script type="module" src="https://…/rarv-lab.js"></script>

<rarv-lab environment="atelier-maintenance-01" height="620"></rarv-lab>

<script>
  document.querySelector('rarv-lab')
    .addEventListener('rarv:completed', (e) => {
      lms.marquerModuleTermine(e.detail.score, e.detail.maxScore)
    })
</script>
```

Le composant fait **2,5 Ko** — séparé du bundle de l'application, car une page de cours n'a aucune
raison de télécharger React et Three.js pour afficher une iframe.

Quatre événements : `rarv:ready`, `rarv:progress`, `rarv:score`, `rarv:completed`.

---

## Structure

```
lab/                  front React + R3F, tests unitaires et E2E
  src/scene/          moteur 3D, collisions, repères du .glb
  src/ui/activites/   quiz, vidéo, panneau, document
  src/pages/          présentation, accessible, leçon, tableau de bord, traçabilité
  src/lms/            Web Component et protocole postMessage
  scripts/            générateurs et recettes
blender/              sources 3D (Lot 1)
docs/                 scénario, contenu, plan, ADR, matrice de tests
```

Le backend vit dans `../Projet-01-Visualiseur-RA-WebXR/api` — voir
[ADR-001](docs/adr/ADR-001-socle-backend-mutualise.md).

---

## Suivi

L'avancement détaillé, lot par lot, avec les défauts trouvés et les décisions prises :
[`SUIVI-PROJET-02.md`](SUIVI-PROJET-02.md).
