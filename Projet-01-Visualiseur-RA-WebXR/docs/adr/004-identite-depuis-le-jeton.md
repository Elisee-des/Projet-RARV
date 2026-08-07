# ADR 004 — L'identité de l'apprenant vient du jeton, jamais du client

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 2, étape 2.4

## Contexte

L'ouverture d'une session de consultation demande : quel objet, quel apprenant,
quel contexte de cours, quel type d'appareil. Le chemin le plus court consiste à
tout accepter depuis le corps de la requête.

## Décision

**Le slug de l'objet, l'identifiant d'apprenant et le contexte LMS proviennent
exclusivement du jeton signé.** Seules les informations invérifiables par nature
— type d'appareil, support XR — viennent du client.

```php
// L'objet et l'apprenant proviennent du jeton, jamais du corps.
$viewer = $request->attributes->get('viewer');

$session = $objet->sessions()->create([
    'user_ref'    => $viewer['userRef'] ?? null,
    'lms_context' => $viewer['lmsContext'] ?? null,
    'device_type' => $request->input('deviceType', 'other'),  // déclaratif
]);
```

## Raisons

**Sans cela, la traçabilité ne vaut rien.** Un relevé de formation où n'importe
qui peut écrire au nom d'un autre n'est pas un relevé — c'est une suggestion.
Dans un contexte de formation réglementaire (habilitation, sécurité), c'est
rédhibitoire.

**Le jeton est déjà la preuve d'autorisation.** Redemander au client ce que le
jeton affirme n'ajoute qu'un chemin de contournement.

**Le coût est nul.** La règle ne complique pas le code : elle le simplifie, en
supprimant des champs à valider.

## Vérification

Un test envoie délibérément une fausse identité et vérifie qu'elle est ignorée :

```php
->postJson('/api/sessions', ['userRef' => 'usurpateur', 'lmsContext' => 'faux-cours'])
// ...
$this->assertSame('learner-42', $session->user_ref);
```

## Portée

La même règle s'applique partout :

- **Bascule QR** — la session cible doit appartenir à l'objet du jeton (403 sinon)
- **Éditeur d'annotations** — le jeton porte sur un seul objet ; changer le slug
  dans l'URL renvoie 403
- **Passage en RA** — dérivé des événements reçus, jamais déclaré par le client

## Conséquences

- Le LMS doit émettre le jeton **côté serveur**, au rendu de la leçon. Un test
  vérifie que le secret partagé n'apparaît jamais dans le HTML.
- En développement, une route locale reproduit ce geste — inexistante hors
  environnement `local`, ce que vérifie également un test.
