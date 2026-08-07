<?php

namespace App\Support\Xapi;

use App\Models\ViewSession;
use App\Models\XapiStatement;
use App\Support\CompletionPolicy;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orchestration de la traçabilité (étape 7.4).
 *
 * Les déclarations sont d'abord ENREGISTRÉES, puis envoyées. Cet ordre est
 * volontaire : si le LRS est injoignable, la trace n'est pas perdue — elle
 * reste « en_attente » et pourra être rejouée par `rarv:xapi:rejouer`.
 */
class XapiTracker
{
    public function __construct(
        private readonly StatementBuilder $constructeur,
        private readonly CompletionPolicy $completion,
        private readonly LrsClient $lrs,
    ) {}

    /**
     * Trace la clôture d'une session. Retourne le nombre de déclarations.
     *
     * N'échoue jamais : une panne de traçabilité ne doit pas se traduire par
     * une erreur affichée à l'apprenant.
     */
    public function tracerCloture(ViewSession $session): int
    {
        try {
            $complete = $this->completion->estComplete($session);
            $declarations = $this->constructeur->pourSession($session, $complete);

            foreach ($declarations as $donnees) {
                $modele = XapiStatement::create([
                    'id' => $donnees['id'],
                    'view_session_id' => $session->id,
                    'actor_ref' => $session->user_ref,
                    'verb' => $donnees['verb']['id'],
                    'object_iri' => $donnees['object']['id'],
                    'statement' => $donnees,
                ]);

                $this->lrs->envoyer($modele);
            }

            return count($declarations);
        } catch (Throwable $erreur) {
            Log::error('[xapi] traçabilité de session échouée', [
                'session' => $session->id,
                'erreur' => $erreur->getMessage(),
            ]);

            return 0;
        }
    }

    /** Rejoue les déclarations restées en attente ou en échec. */
    public function rejouer(int $limite = 100): int
    {
        $envoyees = 0;

        XapiStatement::query()
            ->whereIn('etat_envoi', ['en_attente', 'echec'])
            ->where('tentatives', '<', 5)
            ->orderBy('created_at')
            ->limit($limite)
            ->each(function (XapiStatement $declaration) use (&$envoyees) {
                if ($this->lrs->envoyer($declaration)) {
                    $envoyees++;
                }
            });

        return $envoyees;
    }
}
