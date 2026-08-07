# ADR-001 — Socle backend mutualisé entre les Projets 01 et 02

- **Statut** : Accepté
- **Date** : 2026-08-07
- **Étape** : Projet 02 — Lot 0, étape 0.6
- **Décideur** : utilisateur

---

## Contexte

Le Projet 02 (laboratoire de formation 360° WebVR) a besoin d'un backend Laravel : sessions
d'apprentissage, journal d'événements, jeton signé pour l'intégration LMS, émission xAPI vers un
LRS, service d'assets 3D, tableau de bord formateur.

Le Projet 01 (visualiseur RA) dispose déjà de ces briques, développées et testées :

| Brique | Emplacement | État |
|---|---|:--:|
| Sessions d'apprentissage | `app/Models/ViewSession.php` | ✅ testé |
| Journal d'événements par lots | `app/Models/SessionEvent.php`, `SessionEventController` | ✅ testé |
| Jeton viewer HMAC-SHA256 + middleware | `app/Support/ViewerToken.php`, `EnsureViewerToken` | ✅ testé |
| Émission xAPI | `app/Support/Xapi/` (`StatementBuilder`, `LrsClient`, `LocalLrs`, `HttpLrs`, `XapiTracker`) | 🟡 écrit, non recetté |
| Règle de complétion | `app/Support/CompletionPolicy.php` | 🟡 écrit |
| Service d'assets (`model/gltf-binary`, cache immuable, URL signée) | `app/Http/Controllers/Api/AssetController.php` | ✅ testé |
| Rate limiting par session | `AppServiceProvider` | ✅ testé |

Suite de tests existante : **40 tests / 118 assertions, tous verts**.

Le §11 du plan du Projet 02 évalue la réutilisabilité de ces briques à 90–100 %.

## Décision

**Le Projet 02 utilise le backend Laravel du Projet 01.** Il n'y a qu'une seule application
Laravel pour les deux modules.

L'ajout consiste en 8 migrations et leurs modèles, sans toucher à l'existant :

```
environments · interaction_points · quizzes · questions
choices · attempts · attempt_answers · learner_progress
```

Les tables `view_sessions`, `session_events` et `xapi_statements` sont **partagées** par les deux
modules. Le Projet 02 réutilise donc son journal d'événements et sa chaîne xAPI sans une ligne de
code supplémentaire.

Le front du Projet 02 (`/lab`) reste une application Vite distincte de `/viewer`, avec son propre
proxy vers `http://127.0.0.1:8000`.

## Conséquences

**Positives**

- Lot 2 du Projet 02 : ~2,5 j → **~1,5 j** (il ne reste que le domaine quiz/scoring à écrire)
- Lot 9 du Projet 02 : ~3 j → **~1 j** (xAPI, Web Component et jeton déjà là)
- Le tableau de bord formateur devient **inter-modules** — c'est un meilleur écran de démo
- Le pitch d'entretien devient « une plateforme de formation immersive à deux modules »
  plutôt que deux démos isolées

**Négatives, assumées**

- Une régression dans le socle casse les deux projets à la fois. Parade : la suite de tests
  existante doit rester verte à chaque migration ajoutée — elle sert de filet.
- Les deux projets ne peuvent plus être publiés comme deux dépôts indépendants sans
  extraction préalable du socle.
- Le champ `user_ref` et la notion de session sont désormais communs : toute évolution de leur
  schéma doit être pensée pour les deux modules.

## Dette assumée — emplacement du dossier

Le backend reste physiquement dans `Projet-01-Visualiseur-RA-WebXR/api/`, alors qu'il sert
désormais les deux modules. C'est incohérent à la lecture du dépôt.

**Non déplacé maintenant** : le dossier n'est pas encore suivi par Git (aucun commit sur les deux
projets), un déplacement se ferait donc sans filet, sur du code qui tourne, et pour un gain
purement cosmétique.

**À lever au Lot 11 (déploiement)**, quand le dépôt sera de toute façon restructuré pour
publication : promotion en `api/` à la racine, `/viewer` et `/lab` à côté. Le coût du déplacement
est faible — le proxy Vite cible une URL (`http://127.0.0.1:8000`), pas un chemin de fichier.

> Tracé dans le suivi comme point **B3**.

## Alternatives écartées

| Alternative | Pourquoi écartée |
|---|---|
| **Backend séparé** — un Laravel neuf dans `Projet-02/api` | Isolation totale, mais ~4 j de reconstruction de briques déjà testées, et deux socles à maintenir en parallèle. Le gain d'isolation ne justifie pas le coût sur un projet de portfolio. |
| **Package Composer local partagé** — deux applications, un socle extrait | Techniquement le plus propre et très défendable en entretien. Écarté pour l'instant : ~1 j de mise en place **et** un refactor du Projet 01 à faire immédiatement, sur un socle qui n'a pas encore fini sa recette (Lots 6 à 10 ouverts). Reste la cible naturelle si les deux projets devaient un jour être publiés séparément. |

## Références

- Plan Projet 02, étape 0.6 et §11 « Mutualisation avec les autres projets »
- [SUIVI-PROJET-01.md](../../../Projet-01-Visualiseur-RA-WebXR/SUIVI-PROJET-01.md) — état du socle
