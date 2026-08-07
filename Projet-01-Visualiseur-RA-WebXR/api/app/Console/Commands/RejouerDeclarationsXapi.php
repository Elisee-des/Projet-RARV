<?php

namespace App\Console\Commands;

use App\Support\Xapi\LrsClient;
use App\Support\Xapi\XapiTracker;
use Illuminate\Console\Command;

/**
 * Rejeu des déclarations xAPI non transmises.
 *
 * Un LRS indisponible ne doit pas faire perdre la trace : les déclarations
 * restent en base à l'état « en_attente » ou « echec » et sont réémises ici.
 * À planifier toutes les cinq minutes en production.
 */
class RejouerDeclarationsXapi extends Command
{
    protected $signature = 'rarv:xapi:rejouer {--limite=100 : Nombre maximum de déclarations à rejouer}';

    protected $description = 'Réémet vers le LRS les déclarations xAPI en attente ou en échec';

    public function handle(XapiTracker $traceur, LrsClient $lrs): int
    {
        $this->info("LRS : {$lrs->nom()}");

        $envoyees = $traceur->rejouer((int) $this->option('limite'));

        if ($envoyees === 0) {
            $this->line('Aucune déclaration à rejouer.');
        } else {
            $this->info("{$envoyees} déclaration(s) transmise(s).");
        }

        return self::SUCCESS;
    }
}
