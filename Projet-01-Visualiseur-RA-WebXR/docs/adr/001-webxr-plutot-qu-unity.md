# ADR 001 — WebXR plutôt qu'Unity

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 0

## Contexte

Le module doit permettre à un apprenant de poser un équipement industriel dans
son atelier depuis une leçon de LMS. Deux familles de solutions existent : une
application mobile native (Unity + ARCore/ARKit, ou Flutter avec greffons RA) ou
la RA dans le navigateur (WebXR).

## Décision

**WebXR, 100 % web.**

## Raisons

**La friction d'installation tue l'usage.** Une leçon de LMS se consulte en
quelques minutes, souvent une seule fois. Demander l'installation d'une
application depuis un magasin — avec compte, mise à jour et validation de
l'employeur sur un téléphone professionnel — pour trois minutes de consultation
est disproportionné. Un lien qui s'ouvre immédiatement n'a pas ce coût.

**Une seule base de code.** Le viewer sert le desktop, Android et iOS. Une
application native aurait imposé deux builds, deux cycles de publication et deux
files d'attente de validation, pour un contenu qui change à chaque nouvel objet
pédagogique.

**Déploiement continu.** Corriger une annotation ne demande pas une nouvelle
version en magasin.

**Cohérence avec la compétence visée.** Le projet démontre l'intégration d'une
expérience immersive dans un système de formation, pas la maîtrise d'un moteur
de jeu.

## Conséquences

**Acceptées :**
- Moins de puissance graphique qu'Unity — sans importance pour un objet technique
  de quelques dizaines de milliers de triangles
- Support iOS partiel, traité par [ADR 002](002-double-chemin-ra.md)
- HTTPS obligatoire, y compris en développement

**Obtenues :**
- Le module s'ouvre depuis n'importe quel lien du LMS
- Le même code sert la 3D desktop, la RA mobile et l'éditeur du back-office

## Alternatives écartées

**Unity + Vuforia** — la meilleure option pour la reconnaissance d'objets réels,
mais c'est l'objet d'un autre projet du portfolio. Ici, la détection de plan
suffit, et Unity aurait imposé son propre écosystème sans rien apporter à la
partie LMS.

**Flutter + greffons RA** — mêmes contraintes de magasin d'applications, avec un
écosystème RA moins mûr et sans réutilisation possible du code front existant.

**`<model-viewer>` de Google** — gère WebXR et Quick Look à lui seul, avec des
points d'annotation intégrés. Cinq fois plus rapide à mettre en place, mais ne
démontre presque aucune compétence 3D et se plie mal à des besoins précis
(réticule de placement, pastilles à états, superposition sur mesure). Conservé
comme solution de repli, jamais activé.
