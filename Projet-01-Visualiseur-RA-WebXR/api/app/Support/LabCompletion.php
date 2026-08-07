<?php

namespace App\Support;

use App\Models\Attempt;
use App\Models\Environment;
use App\Models\LearnerProgress;

/**
 * Étape 7.4 — Règle de complétion du module « labo-formation », appliquée
 * **côté serveur**.
 *
 * Le parcours est terminé quand les DEUX conditions sont réunies :
 *
 *   1. tous les postes marqués `required` sont complétés
 *   2. le meilleur score au quiz noté atteint le seuil de réussite
 *
 * Cette classe est appelée à chaque enregistrement de progression, et de
 * nouveau avant l'émission de l'attestation PDF et de la déclaration xAPI
 * `completed` (étape 10.9). Un front modifié ne peut pas se déclarer reçu :
 * il peut envoyer ce qu'il veut dans `completedPoints`, le seuil du quiz est
 * relu en base.
 */
final class LabCompletion
{
    /**
     * Pourcentage de progression, sur l'ensemble des postes (facultatifs compris).
     *
     * @param  list<string>  $codesTermines
     */
    public function pourcentage(Environment $environnement, array $codesTermines): int
    {
        $tous = $environnement->points->pluck('code')->all();

        if ($tous === []) {
            return 0;
        }

        $valides = array_intersect($codesTermines, $tous);

        return (int) round(count($valides) / count($tous) * 100);
    }

    /**
     * Codes requis encore manquants.
     *
     * @param  list<string>  $codesTermines
     * @return list<string>
     */
    public function postesRequisManquants(Environment $environnement, array $codesTermines): array
    {
        $requis = $environnement->points->where('required', true)->pluck('code')->all();

        return array_values(array_diff($requis, $codesTermines));
    }

    /**
     * Le quiz noté de l'environnement est-il réussi par cet apprenant ?
     *
     * Relu en base, jamais pris du client.
     */
    public function quizReussi(Environment $environnement, string $userRef): bool
    {
        $poste = $environnement->points->firstWhere('activity_type', 'quiz');

        if ($poste === null || $poste->activity_id === null) {
            return true; // pas de quiz noté : la condition ne s'applique pas
        }

        return Attempt::query()
            ->where('quiz_id', $poste->activity_id)
            ->where('user_ref', $userRef)
            ->where('passed', true)
            ->exists();
    }

    /**
     * Meilleur score obtenu au quiz noté, ou null si aucune tentative soumise.
     *
     * @return array{score: int, maxScore: int, percentage: int}|null
     */
    public function meilleurScore(Environment $environnement, string $userRef): ?array
    {
        $poste = $environnement->points->firstWhere('activity_type', 'quiz');

        if ($poste === null || $poste->activity_id === null) {
            return null;
        }

        $meilleure = Attempt::query()
            ->where('quiz_id', $poste->activity_id)
            ->where('user_ref', $userRef)
            ->whereNotNull('submitted_at')
            ->orderByDesc('score')
            ->first();

        if ($meilleure === null) {
            return null;
        }

        return [
            'score' => (int) $meilleure->score,
            'maxScore' => (int) $meilleure->max_score,
            'percentage' => $meilleure->pourcentage(),
        ];
    }

    /**
     * Applique la règle et met la progression à jour. Renvoie la progression
     * enregistrée.
     */
    public function appliquer(LearnerProgress $progression): LearnerProgress
    {
        $environnement = $progression->environment->loadMissing('points');
        $termines = $progression->completes();

        $complet = $this->postesRequisManquants($environnement, $termines) === []
            && $this->quizReussi($environnement, $progression->user_ref);

        $progression->completion_pct = $this->pourcentage($environnement, $termines);

        // La date de complétion ne se réécrit pas : le premier passage fait foi.
        if ($complet && $progression->completed_at === null) {
            $progression->completed_at = now();
        }

        $progression->save();

        return $progression;
    }
}
