# ADR 005 — Client LRS interchangeable

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 7, étapes 7.4 et 7.5

## Contexte

Le plan prévoyait un Learning Record Store de test — Learning Locker sous Docker
ou SCORM Cloud — pour recevoir les déclarations xAPI. **Docker n'est pas
installé sur la machine de développement**, et la connexion réseau a déjà fait
échouer un téléchargement de 23 Mo.

Deux réponses paresseuses existaient : simuler l'envoi en journalisant dans un
fichier, ou reporter toute la traçabilité.

## Décision

Une **interface `LrsClient` à deux implémentations**, choisie par variable
d'environnement.

```
RARV_LRS_DRIVER=local   → LocalLrs : déclarations en base, visibles au tableau de bord
RARV_LRS_DRIVER=http    → HttpLrs  : POST /statements vers un LRS réel
```

**Le format des déclarations est strictement identique.** Seul le transport
change.

## Raisons

**Une contrainte d'environnement ne doit pas dégrader la conception.** Le
problème était « pas de LRS local », pas « pas besoin de xAPI ». L'abstraction
répond au premier sans céder sur le second.

**Le pilote local n'est pas une simulation.** Les déclarations produites sont de
vraies déclarations xAPI 1.0.3, conservées, inspectables, rejouables. Basculer
vers SCORM Cloud ne change pas une ligne de code métier.

**La persistance avant l'envoi est un besoin réel, pas un artefact.** Les
déclarations sont **enregistrées, puis transmises**. Un LRS injoignable ne fait
donc rien perdre : `php artisan rarv:xapi:rejouer` réémet ce qui est resté en
attente. C'est indispensable en production, indépendamment de Docker.

## Détails

- `X-Experience-API-Version` obligatoire — sans lui, tout LRS conforme rejette
  en 400, souvent sans message clair
- Toute erreur d'envoi est journalisée et avalée : **la traçabilité ne doit
  jamais interrompre la consultation d'un apprenant**
- Le journal en base sert aussi d'audit : ce qui a été transmis, quand, et avec
  quel résultat

## Conséquences

- Le tableau de bord affiche le pilote actif — la démonstration ne prétend rien
- Une table de plus (`xapi_statements`), qui a de toute façon sa raison d'être
  pour le rejeu et l'audit
- Reste à faire : brancher un vrai LRS et joindre une capture des relevés

## Alternatives écartées

**Journaliser dans un fichier** — aucune inspection possible, aucun rejeu,
aucune valeur de démonstration.

**Reporter la traçabilité** — c'était renoncer à l'argument central du projet.

**Installer Docker** — hors du périmètre, et sans garantie sur cette connexion.
