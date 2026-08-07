<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearnerProgress;
use App\Support\Attestation;
use App\Support\LabCompletion;
use App\Support\ViewerContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
// Le type de retour couvre à la fois le PDF et les réponses JSON d'erreur :
// `Illuminate\Http\Response` et `JsonResponse` sont deux branches distinctes,
// et seul leur ancêtre Symfony les réunit.
use Symfony\Component\HttpFoundation\Response;

/**
 * Étape 7.6 — Délivrance de l'attestation.
 *
 * 🔒 **La complétion est REVÉRIFIÉE ici**, pas seulement relue (étape 10.9).
 *
 * `learner_progress.completed_at` a été posé par `LabCompletion` lors d'une
 * écriture antérieure, mais les données ont pu bouger depuis : un poste rendu
 * obligatoire, un seuil de quiz relevé, un environnement modifié. On rejoue
 * donc la règle au moment de délivrer — c'est le seul instant qui compte,
 * puisque c'est celui qui produit le document.
 */
class AttestationController extends Controller
{
    public function show(
        Request $request,
        LabCompletion $regle,
        Attestation $attestation
    ): Response {
        $environnement = ViewerContext::environnement($request);
        $userRef = ViewerContext::userRef($request);

        $progression = LearnerProgress::query()
            ->where('user_ref', $userRef)
            ->where('environment_id', $environnement->id)
            ->first();

        if ($progression === null) {
            return response()->json([
                'message' => 'Aucune progression enregistrée pour cet apprenant.',
            ], 404);
        }

        $progression->setRelation('environment', $environnement);

        $manquants = $regle->postesRequisManquants($environnement, $progression->completes());
        $quizReussi = $regle->quizReussi($environnement, $userRef);

        if ($manquants !== [] || ! $quizReussi) {
            return response()->json([
                'message' => 'La formation n’est pas encore validée.',
                'missingRequired' => $manquants,
                'quizPassed' => $quizReussi,
            ], 409);
        }

        // La règle vient d'être rejouée : si la date manquait, on la pose.
        if ($progression->completed_at === null) {
            $regle->appliquer($progression);
        }

        $pdf = $attestation->generer($progression);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf(
                'attachment; filename="%s"',
                $attestation->nomFichier($progression)
            ),
            // Une attestation reflète l'état à l'instant de sa demande : elle ne
            // doit jamais sortir d'un cache, sous peine d'afficher un score
            // périmé après une nouvelle tentative.
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /**
     * Étape 7.5 — Recommencer le parcours.
     *
     * ⚠️ Remet la progression à zéro, **mais pas les tentatives de quiz** :
     * `max_attempts` est une règle d'évaluation, pas un état de parcours. La
     * contourner en cliquant sur « Recommencer » viderait la décision D5 de son
     * sens. L'écran de fin le dit explicitement à l'apprenant.
     */
    public function reinitialiser(Request $request): JsonResponse
    {
        $environnement = ViewerContext::environnement($request, avecPoints: false);
        $userRef = ViewerContext::userRef($request);

        LearnerProgress::query()
            ->where('user_ref', $userRef)
            ->where('environment_id', $environnement->id)
            ->delete();

        return response()->json([
            'message' => 'Progression réinitialisée.',
            'attemptsPreserved' => true,
        ]);
    }
}
