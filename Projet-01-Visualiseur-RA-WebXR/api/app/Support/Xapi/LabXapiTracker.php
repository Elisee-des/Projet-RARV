<?php

namespace App\Support\Xapi;

use App\Models\Attempt;
use App\Models\LearnerProgress;
use App\Models\ViewSession;
use App\Models\XapiStatement;
use App\Support\LabCompletion;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Étape 9.4 — Orchestration de la traçabilité du module « labo-formation ».
 *
 * Même posture que le traceur du module « viewer-ra » :
 *
 * 1. **Enregistrer d'abord, envoyer ensuite.** Si le LRS est injoignable, la
 *    trace n'est pas perdue : elle reste « en_attente » et sera rejouée par
 *    `rarv:xapi:rejouer`.
 *
 * 2. **N'échouer jamais.** Une panne de traçabilité ne doit pas se traduire par
 *    une erreur affichée à l'apprenant. Une formation qui s'interrompt parce
 *    qu'un LRS tiers ne répond pas serait un très mauvais compromis.
 */
class LabXapiTracker
{
    public function __construct(
        private readonly LabStatementBuilder $constructeur,
        private readonly LabCompletion $completion,
        private readonly LrsClient $lrs,
    ) {}

    /**
     * Trace la clôture d'un parcours. Retourne le nombre de déclarations.
     */
    public function tracerCloture(ViewSession $session): int
    {
        try {
            $session->loadMissing('environment.points');
            $environnement = $session->environment;

            if ($environnement === null) {
                return 0;
            }

            $progression = LearnerProgress::query()
                ->where('user_ref', $session->user_ref)
                ->where('environment_id', $environnement->id)
                ->first();

            // La complétion est RELUE, pas déduite de la session : elle dépend
            // aussi du score au quiz, qui vit dans `attempts`.
            $complete = $progression !== null
                && $this->completion->postesRequisManquants($environnement, $progression->completes()) === []
                && $this->completion->quizReussi($environnement, (string) $session->user_ref);

            return $this->enregistrer(
                $this->constructeur->pourSession($session, $progression, $complete),
                $session->id,
                $session->user_ref
            );
        } catch (Throwable $erreur) {
            Log::error('[xapi-labo] traçabilité de session échouée', [
                'session' => $session->id,
                'erreur' => $erreur->getMessage(),
            ]);

            return 0;
        }
    }

    /**
     * Trace une tentative de quiz soumise : `answered` par question, puis
     * `scored`.
     *
     * @param  list<array<string, mixed>>  $resultats
     */
    public function tracerTentative(Attempt $tentative, array $resultats): int
    {
        try {
            $session = $tentative->view_session_id
                ? ViewSession::find($tentative->view_session_id)
                : null;

            return $this->enregistrer(
                $this->constructeur->pourTentative($tentative, $resultats, $session),
                $tentative->view_session_id,
                $tentative->user_ref
            );
        } catch (Throwable $erreur) {
            Log::error('[xapi-labo] traçabilité de tentative échouée', [
                'tentative' => $tentative->id,
                'erreur' => $erreur->getMessage(),
            ]);

            return 0;
        }
    }

    /**
     * @param  list<array<string, mixed>>  $declarations
     */
    private function enregistrer(array $declarations, ?string $sessionId, ?string $userRef): int
    {
        foreach ($declarations as $donnees) {
            $modele = XapiStatement::create([
                'id' => $donnees['id'],
                'view_session_id' => $sessionId,
                'actor_ref' => $userRef,
                'verb' => $donnees['verb']['id'],
                'object_iri' => $donnees['object']['id'],
                'statement' => $donnees,
            ]);

            $this->lrs->envoyer($modele);
        }

        return count($declarations);
    }
}
