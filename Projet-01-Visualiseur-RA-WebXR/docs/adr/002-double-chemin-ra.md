# ADR 002 — Deux chemins de réalité augmentée

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 0, appliqué au Lot 5

## Contexte

[ADR 001](001-webxr-plutot-qu-unity.md) retient WebXR. Or **Safari sur iOS
n'implémente pas la session `immersive-ar`**. Ce n'est ni un défaut de
configuration ni une question de version : la fonctionnalité est absente.

Ignorer ce point aurait signifié découvrir en fin de projet que la moitié des
téléphones ne peut pas ouvrir le module.

## Décision

**Deux chemins distincts, décidés dès le cadrage.**

| Plateforme | Technologie | Format | Annotations en RA |
|---|---|---|---|
| Android, Quest | WebXR `immersive-ar` + `hit-test` | `.glb` | ✅ pastilles 3D interactives |
| iOS | AR Quick Look (`<a rel="ar">`) | `.usdz` | ❌ consultables avant la RA |
| Desktop | Aucune — viewer 3D | `.glb` | ✅ + bascule QR vers mobile |

## Raisons

**La contrainte est structurelle.** Aucun contournement raisonnable n'existe :
les bibliothèques de RA par vision (AR.js, MindAR) fonctionnent sur iOS mais
demandent un marqueur imprimé, ce qui détruit le cas d'usage « posez la pompe
dans votre atelier ».

**Assumer vaut mieux que subir.** L'interface annonce explicitement la limite
iOS au lieu de laisser l'utilisateur constater que les pastilles ne réagissent
pas. Un bouton mort est pire qu'un message clair.

**Le troisième chemin est un produit, pas un pis-aller.** Le desktop n'ayant
aucune RA, la bascule par QR code (Lot 6) transfère la session vers le
téléphone — ce qui résout aussi le cas réel « le LMS se consulte sur ordinateur,
la RA se vit sur téléphone ».

## Conséquences

- Deux formats à produire pour chaque objet : `.glb` **et** `.usdz`
- Une machine à états de détection à quatre issues, testée unitairement
- Le chemin iOS est développé sans matériel de test — risque documenté (R8),
  signalé plutôt que dissimulé

## Alternatives écartées

**Ne servir qu'Android** — abandonne une part majeure des apprenants.

**AR.js / MindAR par marqueur** — fonctionne partout, mais impose d'imprimer une
cible. Incompatible avec le scénario visé.

**Attendre le support WebXR d'Apple** — pas une décision d'ingénierie.
