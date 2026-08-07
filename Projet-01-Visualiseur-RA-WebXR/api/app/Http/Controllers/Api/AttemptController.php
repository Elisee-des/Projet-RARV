<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAttemptRequest;
use App\Http\Requests\SubmitAttemptRequest;
use App\Models\Attempt;
use App\Models\Quiz;
use App\Support\QuizGrader;
use App\Support\ViewerContext;
use App\Support\Xapi\LabXapiTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Étapes 2.5 à 2.7 — Cycle de vie d'une tentative de quiz.
 *
 * Les quatre règles anti-triche de l'étape 2.7 sont appliquées ici :
 *
 *   1. l'apprenant vient du jeton signé, jamais du corps de la requête
 *   2. le quiz doit appartenir à l'environnement autorisé par ce jeton
 *   3. `max_attempts` est vérifié à l'ouverture
 *   4. une tentative soumise est définitivement verrouillée (409)
 *
 * Le chronomètre, lui, est contrôlé par `QuizGrader` au moment de corriger.
 */
class AttemptController extends Controller
{
    /**
     * Étape 2.5 — Ouvre une tentative.
     */
    public function store(StoreAttemptRequest $request): JsonResponse
    {
        $environnement = ViewerContext::environnement($request);
        $userRef = ViewerContext::userRef($request);

        $quiz = Quiz::findOrFail($request->integer('quizId'));

        abort_unless(
            $environnement->points
                ->where('activity_type', 'quiz')
                ->pluck('activity_id')
                ->contains($quiz->id),
            404,
            'Ce quiz n\'appartient pas à cet environnement.'
        );

        $deja = $quiz->nombreTentatives($userRef);

        if ($deja >= $quiz->max_attempts) {
            return response()->json([
                'message' => 'Nombre de tentatives épuisé.',
                'maxAttempts' => $quiz->max_attempts,
                'attemptsUsed' => $deja,
            ], 409);
        }

        // Une tentative ouverte et jamais soumise est réutilisée plutôt que
        // dupliquée : un rechargement de page en plein quiz ne doit pas
        // consommer une tentative supplémentaire.
        $tentative = $quiz->attempts()
            ->where('user_ref', $userRef)
            ->whereNull('submitted_at')
            ->latest('started_at')
            ->first();

        $reprise = $tentative !== null;

        if (! $reprise) {
            $tentative = $quiz->attempts()->create([
                'user_ref' => $userRef,
                'view_session_id' => $request->input('sessionId'),
                'attempt_number' => $deja + 1,
                'started_at' => now(),
            ]);
        }

        $ecoule = (int) $tentative->started_at->diffInSeconds(now());

        return response()->json([
            'attemptId' => $tentative->id,
            'attemptNumber' => $tentative->attempt_number,
            'attemptsRemaining' => max(0, $quiz->max_attempts - $deja - 1),
            'startedAt' => $tentative->started_at->toIso8601String(),
            'timeLimitS' => $quiz->time_limit_s,

            // Temps restant calculé par le SERVEUR : un chronomètre client
            // remis à zéro par un rechargement ne donnerait aucun délai
            // supplémentaire.
            'timeRemainingS' => $quiz->time_limit_s === null
                ? null
                : max(0, $quiz->time_limit_s - $ecoule),

            'resumed' => $reprise,
        ], $reprise ? 200 : 201);
    }

    /**
     * Étape 2.6 — Corrige la tentative côté serveur et la verrouille.
     */
    public function submit(
        SubmitAttemptRequest $request,
        Attempt $attempt,
        QuizGrader $correcteur,
        LabXapiTracker $traceur,
    ): JsonResponse {
        $userRef = ViewerContext::userRef($request);

        // Une tentative appartient à un apprenant et à un seul.
        abort_unless($attempt->user_ref === $userRef, 403, 'Cette tentative ne vous appartient pas.');

        if ($attempt->estSoumise()) {
            return response()->json([
                'message' => 'Tentative déjà soumise.',
                'submittedAt' => $attempt->submitted_at->toIso8601String(),
            ], 409);
        }

        /** @var list<array{questionId: int, choiceIds: list<int>}> $reponses */
        $reponses = $request->input('answers', []);

        $attempt = $correcteur->corriger($attempt, $reponses);

        /** @var list<array<string, mixed>> $resultats */
        $resultats = $attempt->getAttribute('resultats');

        // Étape 9.4 — `answered` par question, puis `scored`. Émises ICI et non
        // à la clôture de session : un quiz est un acte daté, et l'apprenant
        // qui ferme son onglet après avoir répondu ne doit pas perdre sa trace.
        $traceur->tracerTentative($attempt, $resultats);

        $quiz = $attempt->quiz;
        $utilisees = $quiz->nombreTentatives($userRef);

        return response()->json([
            'attemptId' => $attempt->id,
            'submittedAt' => $attempt->submitted_at->toIso8601String(),

            'score' => $attempt->score,
            'maxScore' => $attempt->max_score,
            'percentage' => $attempt->pourcentage(),
            'passScore' => $quiz->pass_score,
            'passed' => $attempt->passed,
            'timedOut' => $attempt->timed_out,

            'attemptNumber' => $attempt->attempt_number,
            'attemptsRemaining' => max(0, $quiz->max_attempts - $utilisees),

            'results' => $resultats,
        ]);
    }

    /**
     * État d'une tentative — utilisé par la reprise de session (étape 7.3).
     */
    public function show(Request $request, Attempt $attempt): JsonResponse
    {
        abort_unless($attempt->user_ref === ViewerContext::userRef($request), 403);

        $ecoule = (int) $attempt->started_at->diffInSeconds(now());
        $limite = $attempt->quiz->time_limit_s;

        return response()->json([
            'attemptId' => $attempt->id,
            'attemptNumber' => $attempt->attempt_number,
            'startedAt' => $attempt->started_at->toIso8601String(),
            'submitted' => $attempt->estSoumise(),
            'score' => $attempt->score,
            'maxScore' => $attempt->max_score,
            'passed' => $attempt->passed,
            'timedOut' => $attempt->timed_out,
            'timeRemainingS' => $limite === null ? null : max(0, $limite - $ecoule),
        ]);
    }
}
