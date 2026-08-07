# Décisions d'architecture

Chaque fiche décrit **le contexte, la décision, les raisons, les conséquences
acceptées et les alternatives écartées**. Les alternatives comptent autant que
le choix retenu : elles montrent que la décision a été prise, et non subie.

| # | Décision | Lot | Statut |
|---|---|:--:|:--:|
| [001](001-webxr-plutot-qu-unity.md) | WebXR plutôt qu'Unity | 0 | accepté |
| [002](002-double-chemin-ra.md) | Deux chemins de réalité augmentée | 0 · 5 | accepté |
| [003](003-jeton-hmac-maison.md) | Jeton signé maison plutôt qu'une bibliothèque JWT | 2 | accepté |
| [004](004-identite-depuis-le-jeton.md) | L'identité vient du jeton, jamais du client | 2 | accepté |
| [005](005-lrs-interchangeable.md) | Client LRS interchangeable | 7 | accepté |
| [006](006-decodeurs-en-local.md) | Aucune dépendance à un CDN | 3 · 5 | accepté |
| [007](007-parcours-texte-trace.md) | Le parcours texte produit la même traçabilité | 9 | accepté |

## Décisions mineures, consignées ailleurs

Elles figurent dans le tableau des décisions verrouillées de
[`SUIVI-PROJET-01.md`](../../SUIVI-PROJET-01.md) :

- **D6** — PHP 8.3 plutôt que 8.5 : trop de dépréciations dans les dépendances
- **D7** — `@vitejs/plugin-basic-ssl` plutôt que mkcert : aucun droit
  administrateur requis
- **D8** — versions 3D verrouillées sans `^` : l'API de `@react-three/xr` a
  changé en profondeur entre v5 et v6

## Écarts assumés par rapport au plan initial

| Étape | Écart | Raison |
|---|---|---|
| 5.9 | Boutons plutôt que pincement pour l'échelle | En mode `dom-overlay`, une racine interactive absorberait les taps qui servent au placement |
| 5.11 | Éclairage adaptatif abandonné | `light-estimation` n'est pas exposé par `@react-three/xr` v6 |
| 7.8 | LTI 1.3 non réalisé | Optionnel ; la traçabilité passe par xAPI |
| 9.6 | Navigateurs Playwright non installés | > 150 Mo sur une connexion défaillante ; les spécifications sont écrites |
| 2.1 | Table `models` renommée `learning_objects` | Une classe `Model` entrerait en collision avec la classe de base d'Eloquent |
