# ADR 007 — Le parcours texte produit la même traçabilité que la 3D

**Statut** : accepté · **Date** : 2026-08-07 · **Lot** : 9, étape 9.4

## Contexte

Un module 3D exclut de fait plusieurs publics : utilisateurs de lecteurs
d'écran, personnes naviguant au clavier seul, postes sans accélération
matérielle, machines virtuelles d'entreprise.

L'usage courant consiste à afficher un message d'erreur — « votre navigateur ne
supporte pas la 3D » — éventuellement accompagné d'un résumé du contenu.

## Décision

Un **parcours texte complet**, disponible en permanence par un bouton et affiché
**automatiquement** quand WebGL est indisponible. Surtout : **il journalise
exactement comme le parcours 3D**.

Ouvrir une fiche en version texte émet `annotation_opened`. Les consulter toutes
déclenche `completed` et la séquence xAPI. Un apprenant en version texte apparaît
au tableau de bord du formateur au même titre qu'un autre.

## Raisons

**Sans traçabilité, l'accessibilité crée une seconde classe d'apprenants.** Un
formateur qui consulte son tableau de bord verrait « 12 consultations, 8
terminées » — sans savoir que trois personnes ont suivi la formation par un
chemin non compté. En formation réglementaire, ne pas pouvoir prouver qu'une
personne a suivi un module revient à ce qu'elle ne l'ait pas suivi.

**Ce n'est pas un contenu dégradé.** Les mêmes fiches, le même texte, les mêmes
encadrés de sécurité. Seule la représentation spatiale disparaît — et pour un
texte sur la garniture mécanique, elle n'apportait rien.

**Le coût est faible, le bénéfice triple.** Le même composant sert
l'accessibilité, le repli sans WebGL, et le support des tests de bout en bout —
que la 3D ne permet pas d'automatiser.

## Mise en œuvre

`<details>` natif plutôt qu'un accordéon maison : clavier, lecteur d'écran,
recherche dans la page et impression fonctionnent sans une ligne de JavaScript.

L'ouverture d'un `<details>` déclenche l'événement de journalisation — le même
que le clic sur une pastille 3D.

## Conséquences

- Une même annotation ouverte dans les deux parcours n'est comptée qu'une fois
  (déduplication par identifiant côté serveur)
- Le contenu HTML des fiches passe par le même filtre d'assainissement
- Le parcours texte est le seul chemin couvert par les tests Playwright ; la 3D
  et la RA relèvent de la checklist manuelle

## Alternative écartée

**Message d'erreur + résumé non tracé** — l'usage courant. Rejeté : il transforme
une contrainte d'accessibilité en trou de traçabilité, ce qui est pire que le
problème initial.
