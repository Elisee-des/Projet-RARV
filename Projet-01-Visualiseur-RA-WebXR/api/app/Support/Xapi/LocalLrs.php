<?php

namespace App\Support\Xapi;

use App\Models\XapiStatement;

/**
 * Pilote « local » — le LRS de démonstration.
 *
 * Les déclarations restent en base et sont consultables dans le tableau de
 * bord formateur. Elles sont strictement au même format que celles envoyées
 * à un LRS réel : ce n'est pas une simulation approximative, c'est le même
 * contenu avec un autre transport.
 */
class LocalLrs implements LrsClient
{
    public function envoyer(XapiStatement $declaration): bool
    {
        $declaration->forceFill([
            'etat_envoi' => 'envoye',
            'tentatives' => $declaration->tentatives + 1,
            'envoye_at' => now(),
            'derniere_erreur' => null,
        ])->save();

        return true;
    }

    public function nom(): string
    {
        return 'local (base de données)';
    }
}
