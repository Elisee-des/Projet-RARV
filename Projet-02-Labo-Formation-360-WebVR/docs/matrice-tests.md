# Matrice de tests — étape 10.1

> Ce document distingue **ce qui a été vérifié** de **ce qui ne l'a pas été**.
> Un tableau où tout est vert sans que rien n'ait été branché ne vaut rien ; et
> en entretien, prétendre avoir testé sur un matériel qu'on n'a pas est le
> meilleur moyen de se faire prendre.

**Dernière mise à jour** : 2026-08-07

---

## 1. Vérifications automatisées

Elles tournent à la demande et ne dépendent d'aucun matériel.

| Suite | Commande | Portée | Résultat |
|---|---|---|:--:|
| Backend | `php artisan test` | 205 tests — API, correction serveur, xAPI, attestation, purification HTML | ✅ |
| Unitaires front | `npm test` | 29 tests — assainissement, machine à états, file hors-ligne | ✅ |
| Bout en bout | `npm run test:e2e` | 10 tests — parcours accessible, quiz, reprise, navigation | ✅ |
| Collisions | `npm run recette:collisions` | 13 cas — capsule contre BVH, sur le vrai `collision.glb` | ✅ |
| Assets | `npm run recette:assets` | Structure PDF, table xref, encodage | ✅ |
| Chaîne | `npm run recette:chaine` | API, assets servis, décodeurs | ✅ |
| Types | `npm run typecheck` | TypeScript strict, `erasableSyntaxOnly` | ✅ |

> ⚠️ **Ce que les tests E2E ne couvrent pas, et pourquoi.** Ils passent par le
> parcours accessible, jamais par la 3D — c'est un choix, pas un renoncement :
> piloter une scène WebGL depuis un navigateur automatisé demanderait de simuler
> des déplacements, d'attendre la caméra, de deviner qu'un poste est visé. Le
> test serait lent, fragile, et échouerait pour des raisons sans rapport avec la
> pédagogie. Le parcours 2D traverse **la même chaîne serveur**.
> La 3D se vérifie donc à la main, ci-dessous.

---

## 2. Navigateurs — vérifié à la main

| Plateforme | Navigateur | 3D | Parcours 2D | Quiz | État |
|---|---|:--:|:--:|:--:|---|
| Windows 11 | Chromium (Playwright) | — | ✅ | ✅ | Automatisé |
| Windows 11 | Chrome | ⏳ | ⏳ | ⏳ | **À confirmer par l'utilisateur** |
| Windows 11 | Firefox | ⏳ | ⏳ | ⏳ | **Non testé** |
| macOS | Safari | ⏳ | ⏳ | ⏳ | 🔴 **Pas de Mac disponible** |
| Android | Chrome | ⏳ | ⏳ | ⏳ | Appareil disponible — **à faire** |
| iOS | Safari | ⏳ | ⏳ | ⏳ | 🔴 **Pas d'iPhone** — voir B11 |
| Meta Quest | Quest Browser | — | — | — | 🔴 **Pas de casque** — Lot 8 non commencé |

### Ce que l'absence d'iPhone laisse non vérifié

L'étape 6.7 traite les politiques d'autoplay iOS : `playsInline`, lecture sur
geste utilisateur uniquement, son coupé au départ. **Le code applique la règle,
il n'a pas été exécuté sur un appareil Apple.** C'est le point **B11** du suivi,
et c'est la même honnêteté que le risque R8 du Projet 01.

Deux mitigations : le chemin est court et suit une règle documentée, et le
lecteur se replie sur le contenu écrit si la lecture échoue — donc même en cas
de rejet silencieux, le poste reste validable.

---

## 3. Budget de performance

| Métrique | Cible du plan | Mesuré | État |
|---|---|---|:--:|
| Triangles de la scène | ≤ 150 000 | **192** (blocking) | ✅ *(non représentatif — Lot 1)* |
| Mesh de collision | — | **180** | ✅ |
| Taille `.glb` | ≤ 8 Mo | **22 Ko** (blocking) | ✅ *(non représentatif)* |
| Lumières temps réel | 0 à 1 | 2 provisoires | 🟡 *(disparaissent avec les lightmaps, 1.7)* |
| Bundle initial (hors 3D) | — | **244 Ko** (77 Ko gzip) | ✅ |
| Bundle de l'atelier 3D | — | 1 096 Ko (218 Ko gzip) | 🟡 *(chargé à la demande)* |
| Page accessible | — | **9 Ko** + socle | ✅ |
| Framerate desktop | 60 fps | ⏳ | À relever dans le panneau de profilage |
| Framerate mobile | 30 fps | ⏳ | **À faire sur l'Android** |
| Chargement 4G | ≤ 8 s | ⏳ | **Non mesuré** |

> Les chiffres de la scène portent sur le **blocking**, pas sur la salle finale.
> Ils ne prouvent rien du budget réel : celui-ci ne pourra être mesuré qu'après
> l'habillage du Lot 1, qui attend Blender (point B1).

---

## 4. Accessibilité

| Contrôle | Moyen | État |
|---|---|:--:|
| Parcours complet sans 3D | Page `/accessible` | ✅ |
| Parcours complet au clavier seul | Test E2E `tout est atteignable au clavier` | ✅ |
| Fermeture des modales à `Échap` | Test E2E | ✅ |
| État jamais porté par la couleur seule | Icône + mot partout | ✅ |
| Progression annoncée au lecteur d'écran | `role="status"` + `aria-live` | ✅ |
| `prefers-reduced-motion` | Suivi système + réglage manuel | ✅ |
| Sous-titres des vidéos | Fichiers `.vtt` générés | ✅ |
| Contrastes des graphiques | Validateur de palette, contre la surface réelle | ✅ |
| Lecteur d'écran réel (NVDA / VoiceOver) | — | ⏳ **Non testé** |

> Le dernier point est le plus honnête à signaler : respecter les rôles ARIA
> n'est pas la même chose que vérifier au casque que l'enchaînement s'écoute
> bien. C'est un test qui demande une demi-heure et un lecteur d'écran installé.

---

## 5. Sécurité — étape 10.9

| Mesure | Où | Vérifiée par |
|---|---|:--:|
| Correction du quiz côté serveur | `QuizGrader` | 18 tests |
| `is_correct` jamais exposé | Ressource API + modèle | Test sur le corps HTTP brut |
| Aucun corrigé dans les déclarations xAPI | `LabStatementBuilder` | Test dédié |
| Purification HTML **serveur** | `HtmlSur` | 22 tests, vecteurs réels |
| Purification HTML **client** | `assainir` | 16 tests |
| URL signées pour tous les assets | `EnvironmentAssetController` | Tests d'API |
| Liste blanche des fichiers servis | Idem | Test « asset non déclaré » |
| Limitation de débit | `AppServiceProvider` | Par session, IP, et invité |
| Complétion revérifiée à la délivrance | `AttestationController` | Test « poste rendu obligatoire après coup » |
| Progression non falsifiable | `ProgressController` | Test « codes inconnus ignorés » |
| Pseudonymisation en mode démo | `Pseudonyme` | 2 tests, dont le corps xAPI |

---

## 6. Ce qui reste à faire

| # | Vérification | Bloqué par |
|:--:|---|---|
| 1 | Rendu 3D sur Android réel | Rien — à faire |
| 2 | Framerate mobile et chargement 4G | Idem |
| 3 | Autoplay vidéo sur iPhone | Pas d'appareil (B11) |
| 4 | Firefox et Safari desktop | Rien — à faire |
| 5 | Lecteur d'écran réel | Rien — à faire |
| 6 | Budget de performance réel | Blender absent (B1), Lot 1 |
