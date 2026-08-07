<?php

namespace App\Support\Xapi;

use App\Models\XapiStatement;

/**
 * Transport des déclarations vers un Learning Record Store.
 *
 * L'intérêt de l'abstraction : le format des déclarations produit par
 * StatementBuilder est identique quel que soit le destinataire. Passer d'une
 * démonstration locale à un vrai LRS ne change qu'une variable
 * d'environnement, jamais le code métier.
 */
interface LrsClient
{
    /**
     * Transmet une déclaration déjà enregistrée en base.
     * Met à jour son état d'envoi. Ne lève jamais : la traçabilité ne doit
     * pas faire échouer la consultation de l'apprenant.
     */
    public function envoyer(XapiStatement $declaration): bool;

    /** Nom du pilote, affiché dans le tableau de bord. */
    public function nom(): string;
}
