# ADR 006 — Aucune dépendance à un CDN

**Statut** : accepté · **Date** : 2026-08-07 · **Lots** : 3 et 5

## Contexte

Trois briques de l'écosystème Three.js vont chercher des ressources distantes
par défaut :

| Brique | Ressource distante | Poids |
|---|---|---|
| `DRACOLoader` | décodeur sur `gstatic.com` | ~250 Ko |
| `KTX2Loader` | transcodeur Basis | ~530 Ko |
| `<Environment preset>` de drei | HDRI sur un dépôt GitHub | 1 à 5 Mo |
| `<Text>` de drei | police via troika | ~150 Ko |

## Décision

**Rien n'est chargé depuis un domaine tiers.**

- Décodeurs Draco et Basis copiés dans `public/` par un script exécuté avant
  chaque `dev` et `build`
- Éclairage construit avec des `Lightformer`, pas un preset HDRI
- Numéros des pastilles RA dessinés sur un `canvas`, pas rendus avec `<Text>`

## Raisons

**Une démonstration ne doit pas dépendre d'un tiers pour s'afficher.** Un
entretien se déroule parfois sur un réseau d'entreprise filtré. Voir un modèle
ne pas apparaître parce que `gstatic.com` est bloqué est un échec évitable.

**La politique de sécurité de contenu l'interdit de toute façon.** L'étape 10.2
pose `default-src 'self'`. Une CSP stricte et des ressources distantes sont
incompatibles ; autant régler le problème à la source.

**Formation professionnelle rime souvent avec réseau contraint.** Le public visé
— techniciens de maintenance, ateliers, sites industriels — travaille rarement
sur un réseau ouvert.

**L'échec est silencieux.** Un décodeur Draco absent ne produit pas d'erreur
visible : le modèle n'apparaît pas, sans plus d'explication.

## Conséquences

**Acceptées :**
- ~840 Ko de décodeurs dans `dist/`, chargés uniquement si le modèle est compressé
- Éclairage par `Lightformer` moins réaliste qu'un vrai HDRI — sans importance
  pour un objet technique, et préférable en RA où un environnement synthétique
  produit des reflets sans rapport avec la pièce réelle
- Un script de copie à maintenir

**Obtenues :**
- Le module fonctionne sur un réseau filtré, et hors ligne après premier chargement
- Compatible avec une CSP stricte, sans exception

## Découverte associée

Le découpage du bundle (étape 9.3) a révélé que `@react-three/xr` embarque
**~3,9 Mo de modèles de pièces** pour son émulateur (`living_room`,
`office_large`, `meeting_room`, `office_small`). Ils sont en chargement différé
et l'émulateur est désactivé — aucun apprenant ne les téléchargera — mais ils
occupent la place dans `dist/`. À exclure du paquet de déploiement.
