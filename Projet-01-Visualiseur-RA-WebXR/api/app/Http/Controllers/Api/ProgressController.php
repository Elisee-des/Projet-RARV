<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProgressRequest;
use App\Models\LearnerProgress;
use App\Support\LabCompletion;
use App\Support\ViewerContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Étape 2.8 — Sauvegarde et reprise de progression.
 *
 * Une ligne par couple (apprenant, environnement). L'écriture est idempotente :
 * le front sauvegarde de façon débouncée et peut rejouer le même appel après
 * une coupure réseau sans corrompre l'état (étape 7.7).
 */
class ProgressController extends Controller
{
    public function show(Request $request, LabCompletion $regle): JsonResponse
    {
        $environnement = ViewerContext::environnement($request);
        $userRef = ViewerContext::userRef($request);

        $progression = LearnerProgress::query()
            ->where('user_ref', $userRef)
            ->where('environment_id', $environnement->id)
            ->first();

        // ⚠️ La complétion dépend de DEUX sources : les postes terminés, qui
        // vivent ici, et le meilleur score au quiz, qui vit dans `attempts`.
        // Réussir le quiz satisfait donc la règle sans qu'aucune ligne de
        // progression ne soit touchée — et une lecture se ferait alors sur un
        // `completed_at` périmé.
        //
        // On rejoue la règle à la lecture. L'écriture est idempotente et
        // n'intervient qu'une fois, au moment exact où le parcours devient
        // valide : sans elle, l'apprenant qui réussit le quiz puis recharge la
        // page verrait « non validé » jusqu'à sa prochaine sauvegarde.
        if ($progression !== null && $progression->completed_at === null) {
            $progression->setRelation('environment', $environnement);
            $regle->appliquer($progression);
        }

        return response()->json(
            $this->representer($progression, $environnement, $userRef, $regle)
        );
    }

    public function update(UpdateProgressRequest $request, LabCompletion $regle): JsonResponse
    {
        $environnement = ViewerContext::environnement($request);
        $userRef = ViewerContext::userRef($request);

        // Seuls les codes de postes réellement déclarés par l'environnement
        // sont retenus. Un client qui inventerait des codes ne gonflerait pas
        // sa progression.
        $connus = $environnement->points->pluck('code')->all();

        $visites = $this->filtrer($request->input('visitedPoints', []), $connus);
        $termines = $this->filtrer($request->input('completedPoints', []), $connus);

        // Un poste terminé est forcément visité — le front peut l'omettre.
        $visites = array_values(array_unique([...$visites, ...$termines]));

        $progression = LearnerProgress::firstOrNew([
            'user_ref' => $userRef,
            'environment_id' => $environnement->id,
        ]);

        $progression->fill([
            'visited_points' => $visites,
            'completed_points' => $termines,
            'last_position' => $request->input('lastPosition'),
            // Monotone croissant : une valeur plus faible que l'enregistrée
            // vient d'un onglet en retard, pas d'un temps réellement écoulé.
            'total_time_ms' => max(
                (int) $request->input('totalTimeMs', 0),
                (int) ($progression->total_time_ms ?? 0)
            ),
        ]);

        $progression->setRelation('environment', $environnement);

        // 🔒 Recalcul serveur : `completion_pct` et `completed_at` ne sont
        // jamais acceptés du client (étape 10.9).
        $regle->appliquer($progression);

        return response()->json(
            $this->representer($progression, $environnement, $userRef, $regle)
        );
    }

    /**
     * @param  list<mixed>  $recus
     * @param  list<string>  $connus
     * @return list<string>
     */
    private function filtrer(array $recus, array $connus): array
    {
        $codes = array_map('strval', $recus);

        return array_values(array_unique(array_intersect($codes, $connus)));
    }

    /**
     * @return array<string, mixed>
     */
    private function representer(
        ?LearnerProgress $progression,
        \App\Models\Environment $environnement,
        string $userRef,
        LabCompletion $regle,
    ): array {
        $termines = $progression?->completes() ?? [];

        return [
            'environment' => $environnement->slug,
            'userRef' => $userRef,

            'visitedPoints' => $progression?->visites() ?? [],
            'completedPoints' => $termines,
            'lastPosition' => $progression?->last_position,
            'totalTimeMs' => (int) ($progression?->total_time_ms ?? 0),

            'pointCount' => $environnement->points->count(),
            'requiredPoints' => $environnement->codesRequis(),
            'missingRequired' => $regle->postesRequisManquants($environnement, $termines),

            'quiz' => [
                'best' => $regle->meilleurScore($environnement, $userRef),
                'passed' => $regle->quizReussi($environnement, $userRef),
            ],

            'completionPct' => (int) ($progression?->completion_pct ?? 0),
            'completed' => $progression?->estComplete() ?? false,
            'completedAt' => $progression?->completed_at?->toIso8601String(),
        ];
    }
}
