# ADR-002 — Décisions techniques D1 à D7

- **Statut** : Accepté
- **Date** : 2026-08-07
- **Étape** : Lot 11, étape 11.7

> Une fiche par décision, avec **les alternatives écartées et pourquoi**. Une ADR qui ne dit que
> ce qu'on a choisi ne sert à rien : l'information utile est ce qu'on a refusé.

---

## D1 — Vraie scène 3D, pas des panoramas 360°

**Contexte.** « 360° » admet deux lectures très différentes en coût.

| Approche | Coût | Ce que ça démontre |
|---|:--:|---|
| Panoramas équirectangulaires reliés par des hotspots | Faible | Peu de compétence 3D |
| **Scène 3D navigable** ✅ | Élevé | Moteur 3D, collisions, performance, interaction |

**Décision.** Scène navigable. Le déplacement libre en vue subjective est ce que l'énoncé décrit,
et c'est ce qui a de la valeur technique.

**Plan B assumé.** Si la production 3D dérape, basculer sur des panoramas rendus depuis Blender.
Toute la couche pédagogique reste identique — c'est précisément pourquoi l'architecture sépare
l'environnement des activités. Le parcours 2D de l'étape 10.4 en est la preuve vivante : la
formation fonctionne déjà sans aucune 3D.

---

## D2 — React Three Fiber, pas A-Frame

**Écarté : A-Frame.** Plus rapide à démarrer — HTML déclaratif, VR intégrée — mais son modèle à
entités masque le moteur et se marie mal avec une UI React complexe.

**Décision.** R3F. Or ici l'interface — quiz, panneaux, lecteur vidéo, HUD, mini-carte, tableau de
bord — représente **la moitié du travail**. R3F donne la 3D *et* l'écosystème React, et partage la
stack avec le Projet 01.

**Ce que ça a effectivement permis.** Les quatre types d'activité sont des composants React
ordinaires. Ils ont été réutilisés **tels quels** dans le parcours accessible, qui ne charge aucune
3D. Avec A-Frame, il aurait fallu les réécrire.

---

## D3 — Capsule contre BVH, pas un moteur physique

| Option | Verdict |
|---|---|
| Capsule vs BVH (`three-mesh-bvh`) ✅ | Standard de l'écosystème, léger, précis |
| Moteur physique (`@react-three/rapier`) | **Surdimensionné** : on ne simule rien, on empêche de traverser un mur |
| Navmesh (`three-pathfinding`) | Contraint le déplacement à une surface pré-calculée — robuste, mais moins libre |

**Précision qui compte.** Le BVH est bâti sur un **mesh de collision dédié** de 180 triangles,
jamais sur la géométrie visible. Tester une capsule contre une salle détaillée coûterait cent fois
plus cher pour un résultat *pire* : un personnage qui accroche sur chaque chanfrein.

**Bénéfice imprévu.** Le même BVH sert au système d'interaction pour déterminer si un poste est
masqué par un mur. Aucune structure supplémentaire.

---

## D4 — Lightmaps précalculées, pas d'éclairage temps réel

**Décision.** L'éclairage est cuit dans des textures sous Blender ; la scène tourne ensuite avec
0 à 1 lumière temps réel.

**Pourquoi.** Un éclairage dynamique avec ombres effondre le framerate mobile. C'est la décision
qui détermine si le projet est jouable sur téléphone.

**État.** Non appliquée : le baking demande Blender, absent de la machine. Le branchement côté
Three.js est en place et attend ses textures ; les deux lumières provisoires disparaîtront avec.

---

## D5 — Correction du quiz côté serveur

**Décision.** Le front ne reçoit **jamais** l'indicateur de bonne réponse. Il envoie les
identifiants cochés, le serveur corrige, calcule le score et renvoie le résultat avec les
explications.

**Écarté : la correction côté client**, même « juste pour l'affichage immédiat ». Dès que le
barème est dans le navigateur, il est lisible — et une évaluation notée dont on peut lire le
corrigé n'est plus une évaluation.

**Quatre barrières, pas une :**

1. la ressource API des questions n'expose pas `is_correct` ;
2. le modèle `Choice` le masque à la sérialisation, deuxième filet ;
3. un test échoue si la chaîne apparaît dans le **corps brut** d'une réponse HTTP ;
4. un test vérifie qu'aucun corrigé ne figure dans les déclarations xAPI — qui partent vers un
   service **tiers**.

La quatrième est celle qu'on oublie. C'est aussi la plus discrète à exploiter.

**Conséquences assumées.** Le chronomètre est calculé par le serveur, les tentatives sont
comptées en base, et « Recommencer » n'en rend aucune. Contourner cette dernière règle viderait la
décision de son sens.

---

## D6 — Backend mutualisé avec le Projet 01

Détaillée dans [ADR-001](ADR-001-socle-backend-mutualise.md).

**En bref.** Sessions, journal d'événements par lots, jeton HMAC signé, chaîne xAPI et service
d'assets existaient déjà et étaient testés. Les réutiliser a fait tomber le Lot 2 de 2,5 à 1,5 jour
et le Lot 9 de 3 à 1.

**Contrepartie assumée.** Une régression dans le socle casse les deux projets. La suite de tests
existante sert de filet, et elle est relancée à chaque migration ajoutée.

---

## D7 — Atelier de maintenance industrielle

**Écartés** : laboratoire de chimie (attendu, peu différenciant), salle de contrôle (éclairage
dynamique coûteux — contredit D4), salle de classe (le moins impressionnant).

**Décision.** Atelier technique. Trois raisons :

1. il prolonge le fil conducteur des trois projets ;
2. il permet de **poser la pompe centrifuge du Projet 01** dans la salle, comme équipement réel —
   cohérence de portfolio immédiate ;
3. le vocabulaire de sécurité — consignation, EPI, VAT — donne des questions de quiz crédibles, ce
   qui désamorce le risque du contenu bidon.

**Conséquence non anticipée, et heureuse.** Le contenu écrit au Lot 0 a été conçu pour que le
tableau de bord formateur ait quelque chose à dire : les deux postes facultatifs sont placés à
l'écart du parcours et portent chacun une question du quiz. En recette, cela donne exactement la
phrase visée — *« 67 % ratent la question sur les EPI, et l'armoire à EPI est le poste le moins
visité, à 0 % »*.

---

## Décisions prises en cours de route

Elles ne figuraient pas au plan et méritent d'être tracées.

| Sujet | Décision | Pourquoi |
|---|---|---|
| **Blocking par script** | Générer la salle grise sans Blender | A débloqué les Lots 3, 4 et 5 — sept jours de travail — et a *imposé* l'étape 1.2 que le plan déclare non négociable |
| **PDF écrits à la main** | Ni bibliothèque côté JS, ni côté PHP | Pour deux fiches d'une page et une attestation, une dépendance de plusieurs mégaoctets ne se justifie pas. Le format est du texte, les polices de base sont garanties |
| **Mode démonstration public** | `RARV_DEMO_PUBLIC` ouvre le tableau de bord et la traçabilité | Un recruteur doit tout ouvrir en un clic. Contrepartie : les identifiants d'apprenants sont **pseudonymisés**, jusque dans le corps des déclarations xAPI |
| **LTI 1.3 non retenue** | Étape 9.8 abandonnée | Plusieurs jours — OIDC, Deep Linking, AGS, Moodle en Docker — pour une intégration que le Web Component couvre déjà fonctionnellement |
| **LRS local plutôt que Learning Locker** | Pilote `local` par défaut | Format des déclarations identique ; `RARV_LRS_DRIVER=http` bascule. Personne en entretien n'attend le démarrage d'un conteneur pour voir trois déclarations |
