# Projet 02 — Laboratoire de formation interactif 3D

> **En une phrase.** Atelier de maintenance virtuel parcouru à la première
> personne dans le navigateur : l'apprenant se déplace entre huit postes de
> travail, y déclenche panneaux, vidéos et documents, passe un quiz noté
> corrigé côté serveur, et repart avec une attestation.

**En ligne** : <https://rarv.kodemeet.com/labo/>

---

## 1. Côté apprenant

### 1.1 Navigation à la première personne

| Fonction | Détail |
|---|---|
| **Desktop** | Verrouillage du pointeur, déplacement ZQSD/WASD, course |
| **Mobile** | Joystick virtuel tactile, glisser pour regarder |
| Collisions | **Capsule contre BVH**, sur un mesh de collision dédié et simplifié |
| Gravité | Détection du sol, gestion des marches et pentes douces |
| Bornes | Impossible de sortir de la salle ou de tomber sous le sol |
| Reprise | Position restaurée à la réouverture |

**Collisions par capsule/BVH plutôt qu'un moteur physique complet** : on ne simule rien, on empêche seulement de traverser un mur. Un moteur physique aurait coûté des dépendances et des images par seconde pour un besoin que `three-mesh-bvh` couvre entièrement.

### 1.2 Confort visuel — traité comme une exigence, pas une option

Le mal des transports est le premier motif d'abandon d'un parcours 3D à la première personne.

- Aucun *head bob* par défaut
- Champ de vision réglable
- Vignettage optionnel au déplacement
- `prefers-reduced-motion` respecté
- **Mini-carte** de la salle avec la position du joueur et les postes restants
- **Indicateurs hors champ** : « ← 2 postes par ici » — dans une salle fermée, l'apprenant ne sait pas où aller
- Bouton **« aller au poste suivant »** : déplacement guidé pour qui ne sait pas jouer aux FPS

Sans cette dernière issue de secours, un apprenant bloqué contre un mur abandonne.

### 1.3 Interaction avec les postes

- Raycast depuis le centre de l'écran, plus raycast au pointeur
- Surbrillance de l'objet ciblé, étiquette contextuelle
- Déclenchement **au clic** ou **par proximité** selon le poste
- Repères visuels à distance : halo, icône flottante
- États : non visité, en cours, terminé
- Contrôles verrouillés pendant une activité — pas de déplacement en plein quiz

### 1.4 Quatre types d'activité

| Type | Nombre | Détail |
|---|:--:|---|
| **Panneau d'information** | 3 | Texte riche et images, en modale HTML |
| **Vidéo** | 2 | Sous-titres `.vtt`, suivi de lecture, terminé à 90 % |
| **Document** | 2 | Fiche technique PDF téléchargeable |
| **Quiz noté** | 1 | 10 questions, seuil de réussite 70 % |

Les modales sont en **HTML par-dessus le canvas**, jamais en texte 3D : accessibles, stylables, testables.

Les vidéos gèrent les politiques d'autoplay — `playsinline` et démarrage sur geste utilisateur, sans quoi rien ne se lance sur iPhone, et sans message d'erreur.

### 1.5 Progression et fin de parcours

- HUD permanent : postes visités, score, temps écoulé
- Sauvegarde automatique, tolérante aux coupures réseau
- **File d'attente hors-ligne** : les événements sont bufférisés et rejoués à la reconnexion
- Reprise : « Reprendre où vous en étiez ? » avec restauration de la position
- Écran de fin : récapitulatif, score, temps, postes manqués
- **Attestation de réussite en PDF**, générée côté serveur

### 1.6 Parcours accessible sans 3D

Une page listant les huit postes et toutes leurs activités, utilisable au clavier et au lecteur d'écran. Elle sert trois fois : obligation d'accessibilité, support des tests automatisés, et plan de repli si la 3D est indisponible.

---

## 2. Correction serveur — le point technique central

**La bonne réponse ne quitte jamais le backend.**

| Mesure | Détail |
|---|---|
| `is_correct` jamais exposé | Une ressource API dédiée le retire, et **un test automatisé échoue** s'il réapparaît |
| Correction | Le client envoie les choix, le serveur calcule le score |
| Tentatives | Limitées, liées à l'apprenant, verrouillées après soumission |
| Chronomètre | Validé côté serveur |
| Explications | Renvoyées **après** soumission seulement |

C'est ce qui sépare un quiz de démonstration d'un quiz de production : dans le premier, il suffit d'ouvrir l'inspecteur du navigateur pour lire les réponses.

---

## 3. Côté formateur

- **Tableau de bord** : taux de complétion, score moyen, temps moyen
- **Questions les plus ratées** — l'indicateur qui fait réviser le contenu
- Postes les moins visités
- Journal des déclarations xAPI émises

---

## 4. Intégration et traçabilité

### 4.1 Composant embarquable

```html
<script type="module" src="/rarv-lab.js"></script>
<rarv-lab environment="atelier-maintenance-01" height="620"></rarv-lab>
```

Même principe que le module RA : Shadow DOM, `postMessage`, événements DOM. La barre de navigation **disparaît quand la page est embarquée** — un apprenant dans une leçon de LMS ne doit pas voir deux menus concurrents.

### 4.2 Chaîne xAPI

Vocabulaire propre au laboratoire, sur le socle d'envoi commun :

```
initialized → interacted (par poste) → answered (par question)
           → scored → completed → terminated
```

Le stockage, le client LRS et le rejeu des envois échoués sont **partagés avec le Projet 01**.

### 4.3 Mode démonstration

Une route d'invité délivre un jeton à qui le demande, avec un identifiant tiré au sort — pour qu'un recruteur teste en un clic, sans compte. Elle n'existe que si le mode démonstration est actif ; en production réelle, le jeton vient du serveur LMS.

---

## 5. Socle mutualisé avec le Projet 01

C'est une **décision d'architecture** (ADR-001), pas une commodité.

| Partagé | Propre au laboratoire |
|---|---|
| Application Laravel, base de données | Environnement 3D, postes d'interaction |
| Sessions et journal d'événements | Quiz, questions, choix, tentatives |
| Jetons signés HMAC | Progression de l'apprenant |
| Stockage et envoi xAPI | Attestations |
| Service des assets, URL signées | |

La table `view_sessions` porte une colonne `module` : les deux modules y écrivent avec des vocabulaires d'événements distincts. Un apprenant suivant les deux modules relève d'une **traçabilité unique**.

Concrètement : la charge du projet est passée de 30 à environ 26 jours, et le Lot 9 — intégration LMS et xAPI — de 3 jours à 1.

---

## 6. Performance

| Décision | Raison |
|---|---|
| **Lightmaps précalculées** sous Blender | Un éclairage temps réel avec ombres effondre le framerate mobile. C'est cette décision qui détermine si la salle est jouable sur téléphone |
| Mesh de collision dédié | Simplifié, séparé de la géométrie visible bien trop dense |
| Détection de perf au démarrage | Bascule automatique en qualité réduite |
| `dpr` plafonné à 2 | Au-delà, un écran haute densité coûte sans gain visible |
| Chargement différé | La scène n'est téléchargée que si l'on entre dans l'atelier |

**Budget** : ≤ 150 000 triangles · ≤ 60 draw calls · ≤ 8 Mo · 30 fps sur mobile.

---

## 7. Ce qui n'est pas fait

- **Habillage 3D de la salle** — le *blocking* est validé en navigation, mais la salle attend son habillage sous Blender. Toutes les fonctionnalités marchent avec les volumes actuels.
- **Mode VR casque** (WebXR `immersive-vr`) — bonus assumé, placé en dernier : il coûte trois jours, exige du matériel, et impose de redévelopper en 3D toute l'interface HTML. Sur un CV LMS, la traçabilité rapporte davantage.
- **LTI 1.3** — non retenu, l'intégration passant par le Web Component.
- **Vidéo de démonstration** de 90 secondes.

---

## 8. Pile technique

**Front** React 19 · TypeScript · Three.js · React Three Fiber · **three-mesh-bvh** · react-icons
**Backend** Laravel 13 · PHP 8.3 · MySQL — *mutualisé avec le Projet 01*
**Traçabilité** xAPI 1.0.3 · client LRS interchangeable
**Intégration** Web Component · iframe · postMessage
**Qualité** 29 tests Vitest · tests Feature PHPUnit partagés · spécifications Playwright
