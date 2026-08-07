<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Environment;
use App\Models\LearnerProgress;
use App\Models\Question;
use App\Models\Quiz;
use App\Support\Pseudonyme;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Étape 2.10 — Agrégats du tableau de bord formateur.
 *
 * Ces endpoints répondent à des questions de formateur, pas à des jauges
 * décoratives :
 *
 *   - « quels postes personne ne visite ? »
 *   - « quelle question est la plus ratée, et de quel poste vient-elle ? »
 *   - « combien d'apprenants arrivent au bout ? »
 *
 * Le lien entre une question ratée et le poste qui l'enseigne (`source_point_code`)
 * est ce qui rend le tableau de bord actionnable : il ne dit pas seulement que
 * ça rate, il dit où retravailler.
 */
class LabDashboardController extends Controller
{
    /**
     * Vue d'ensemble d'un environnement.
     */
    public function environment(string $slug): JsonResponse
    {
        $environnement = Environment::query()
            ->where('slug', $slug)
            ->with('points')
            ->firstOrFail();

        $progressions = LearnerProgress::query()
            ->where('environment_id', $environnement->id)
            ->get();

        $apprenants = $progressions->count();
        $termines = $progressions->whereNotNull('completed_at')->count();

        // Fréquentation par poste, à partir des progressions enregistrées.
        // C'est la source la plus fiable : les événements peuvent être perdus
        // en cas de coupure réseau, la progression est rejouée à la reconnexion.
        $visites = [];
        $completions = [];

        foreach ($progressions as $progression) {
            foreach ($progression->visites() as $code) {
                $visites[$code] = ($visites[$code] ?? 0) + 1;
            }
            foreach ($progression->completes() as $code) {
                $completions[$code] = ($completions[$code] ?? 0) + 1;
            }
        }

        $postes = $environnement->points->map(fn ($point) => [
            'code' => $point->code,
            'label' => $point->label,
            'activityType' => $point->activity_type,
            'required' => $point->required,
            'visits' => $visites[$point->code] ?? 0,
            'completions' => $completions[$point->code] ?? 0,
            'visitRate' => $apprenants > 0
                ? (int) round(($visites[$point->code] ?? 0) / $apprenants * 100)
                : 0,
        ])->values();

        $quizId = $environnement->points->firstWhere('activity_type', 'quiz')?->activity_id;

        return response()->json([
            'environment' => [
                'slug' => $environnement->slug,
                'title' => $environnement->title,
            ],

            'cohorte' => [
                'apprenants' => $apprenants,
                'termines' => $termines,
                'tauxCompletion' => $apprenants > 0 ? (int) round($termines / $apprenants * 100) : 0,
                'progressionMoyennePct' => (int) round($progressions->avg('completion_pct') ?? 0),
                'tempsMoyenMs' => (int) round($progressions->avg('total_time_ms') ?? 0),
            ],

            'quiz' => $quizId === null ? null : $this->statistiquesQuiz($quizId),

            // Trié du moins visité au plus visité : le début de liste est ce
            // que le formateur doit regarder.
            'postes' => $postes->sortBy('visits')->values(),
        ]);
    }

    /**
     * Étape 9.6 — Les questions les plus ratées, avec leur poste d'origine.
     */
    public function quiz(int $quiz): JsonResponse
    {
        $modele = Quiz::query()->with('questions')->findOrFail($quiz);

        $stats = AttemptAnswer::query()
            ->join('attempts', 'attempts.id', '=', 'attempt_answers.attempt_id')
            ->whereNotNull('attempts.submitted_at')
            ->whereIn('attempt_answers.question_id', $modele->questions->pluck('id'))
            ->groupBy('attempt_answers.question_id')
            ->select([
                'attempt_answers.question_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN attempt_answers.is_correct THEN 1 ELSE 0 END) as justes'),
            ])
            ->get()
            ->keyBy('question_id');

        $questions = $modele->questions->map(function (Question $question) use ($stats) {
            $ligne = $stats->get($question->id);
            $total = (int) ($ligne->total ?? 0);
            $justes = (int) ($ligne->justes ?? 0);

            return [
                'questionId' => $question->id,
                'order' => $question->sort_order,
                'statement' => $question->statement,
                'type' => $question->type,

                // 🎯 Le champ qui rend le tableau de bord actionnable :
                // « 68 % ratent cette question, elle vient du poste POI_02 ».
                'sourcePointCode' => $question->source_point_code,
                'objectiveCode' => $question->objective_code,

                'answered' => $total,
                'correct' => $justes,
                'failureRate' => $total > 0 ? (int) round(($total - $justes) / $total * 100) : 0,
            ];
        });

        return response()->json([
            'quiz' => [
                'id' => $modele->id,
                'title' => $modele->title,
                'passScore' => $modele->pass_score,
            ],
            'tentatives' => $this->statistiquesQuiz($modele->id),

            // Les plus ratées en tête.
            'questions' => $questions->sortByDesc('failureRate')->values(),
        ]);
    }

    /**
     * Étape 9.7 — Export CSV des résultats d'une cohorte.
     */
    public function exportCsv(string $slug): StreamedResponse
    {
        $environnement = Environment::query()->where('slug', $slug)->with('points')->firstOrFail();
        $quizId = $environnement->points->firstWhere('activity_type', 'quiz')?->activity_id;

        $progressions = LearnerProgress::query()
            ->where('environment_id', $environnement->id)
            ->orderBy('user_ref')
            ->get();

        $meilleurs = $quizId === null ? collect() : Attempt::query()
            ->where('quiz_id', $quizId)
            ->whereNotNull('submitted_at')
            ->get()
            ->groupBy('user_ref')
            ->map(fn ($tentatives) => $tentatives->sortByDesc('score')->first());

        return response()->streamDownload(function () use ($progressions, $meilleurs) {
            $sortie = fopen('php://output', 'w');

            // BOM UTF-8 : sans lui, Excel affiche « MoisiÃ¨me » au lieu des accents.
            fwrite($sortie, "\xEF\xBB\xBF");

            fputcsv($sortie, [
                'apprenant', 'progression_pct', 'postes_termines', 'temps_ms',
                'score', 'score_max', 'reussi', 'tentatives', 'termine_le',
            ], ';');

            foreach ($progressions as $progression) {
                $meilleur = $meilleurs->get($progression->user_ref);

                fputcsv($sortie, [
                    // Pseudonymisé en mode démonstration : le tableau de bord
                    // est alors ouvert sans authentification (étape 11.5).
                    Pseudonyme::filtrer($progression->user_ref),
                    $progression->completion_pct,
                    count($progression->completes()),
                    $progression->total_time_ms,
                    $meilleur?->score ?? '',
                    $meilleur?->max_score ?? '',
                    $meilleur?->passed ? 'oui' : 'non',
                    $meilleur?->attempt_number ?? 0,
                    $progression->completed_at?->toDateTimeString() ?? '',
                ], ';');
            }

            fclose($sortie);
        }, "resultats-{$slug}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array<string, mixed>
     */
    private function statistiquesQuiz(int $quizId): array
    {
        $soumises = Attempt::query()
            ->where('quiz_id', $quizId)
            ->whereNotNull('submitted_at')
            ->get();

        return [
            'quizId' => $quizId,
            'tentatives' => $soumises->count(),
            'apprenants' => $soumises->pluck('user_ref')->unique()->count(),
            'reussites' => $soumises->where('passed', true)->count(),
            'tauxReussite' => $soumises->count() > 0
                ? (int) round($soumises->where('passed', true)->count() / $soumises->count() * 100)
                : 0,
            'scoreMoyen' => round($soumises->avg('score') ?? 0, 1),
            'horsDelai' => $soumises->where('timed_out', true)->count(),
        ];
    }
}
