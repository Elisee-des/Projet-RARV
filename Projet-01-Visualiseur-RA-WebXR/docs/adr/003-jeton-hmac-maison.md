# ADR 003 — Jeton signé maison plutôt qu'une bibliothèque JWT

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 2, étape 2.7

## Contexte

Le viewer, chargé dans une iframe d'une autre origine, doit prouver à l'API
qu'il a été autorisé par le LMS pour un objet donné et un apprenant donné.

## Décision

Un jeton **signé HMAC-SHA256** de fabrication interne :
`base64url(charge utile JSON) . base64url(signature)`.

## Raisons

**Le besoin est étroit.** « Ce navigateur a été autorisé par le LMS, pour cet
objet, jusqu'à telle heure. » Pas de chiffrement — la charge utile ne contient
rien de secret. Pas de rotation de clés. Pas d'algorithme négociable. Pas de
fédération d'émetteurs.

**Les JWT apportent une surface d'attaque avec leur souplesse.** Le champ `alg`
négociable a produit une famille entière de vulnérabilités (`alg: none`,
confusion RS256/HS256). Un format sans champ d'algorithme ne peut pas en
souffrir.

**Zéro dépendance.** Le projet s'est construit sur une connexion réseau qui a
fait échouer un téléchargement de 23 Mo. Chaque paquet évité est un risque
d'installation en moins.

**~90 lignes, entièrement testées.** Signature falsifiée, charge utile modifiée,
jeton expiré, jeton vide, jeton absurde : tous couverts.

## Détails

- `hash_equals` pour comparer les signatures — comparaison à temps constant,
  contre les attaques par mesure de temps
- Clé de signature : `APP_KEY` de Laravel
- Durée de vie : 120 minutes par défaut
- Le champ `scope` distingue consultation et édition ([Lot 8](../../SUIVI-PROJET-01.md))

## Conséquences

**Acceptées :**
- Format propriétaire, non interopérable avec un fournisseur d'identité tiers
- Si le projet devait accepter des jetons émis par un système externe, il
  faudrait passer à une bibliothèque JWT — la substitution est localisée dans
  une seule classe

**Obtenues :**
- Aucune dépendance de sécurité à maintenir
- Comportement entièrement compris et testé

## Alternatives écartées

**`firebase/php-jwt`** — solide et léger, mais résout un problème
d'interopérabilité que le projet n'a pas.

**Laravel Sanctum** — pensé pour des jetons d'API persistants liés à un
utilisateur en base. Ici, le jeton est éphémère, sans compte, et porte une
autorisation contextuelle. Aurait aussi imposé une table et un téléchargement.

**URL signées de Laravel** — utilisées pour les assets, où elles conviennent
parfaitement. Inadaptées ici : la signature porte sur une URL, pas sur des
revendications transportables dans un en-tête `Authorization`.
