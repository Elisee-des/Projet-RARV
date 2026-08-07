<?php

namespace App\Support;

use App\Models\Attempt;
use App\Models\Question;
use Illuminate\Support\Facades\DB;

/**
 * Étape 2.6 — Correction des quiz. **Décision D5.**
 *
 * C'est le seul endroit du système où l'on sait ce qu'est une bonne réponse.
 * Le navigateur envoie des identifiants de propositions cochées, rien d'autre ;
 * tout le reste est calculé ici.
 *
 * Barème des questions à choix multiple : **tout ou rien**. L'ensemble coché
 * doit être exactement l'ensemble attendu. Un barème partiel serait plus doux,
 * mais deviendrait impossible à expliquer à l'apprenant (« pourquoi 1,5 sur
 * 2 ? ») et récompenserait le fait de tout cocher.
 */
final class QuizGrader
{
    /**
     * Corrige et verrouille une tentative.
     *
     * @param  list<array{questionId: int, choiceIds: list<int>}>  $reponses
     */
    public function corriger(Attempt $tentative, array $reponses): Attempt
    {
        $quiz = $tentative->quiz()->with('questions.choices')->firstOrFail();

        // Contrôle du chronomètre AVANT correction : une tentative hors délai
        // est close à zéro, elle n'est pas simplement recalée. Sans cela, il
        // suffirait de laisser l'onglet ouvert pour chercher les réponses.
        $horsDelai = $tentative->tempsDepasse();

        // Indexation des réponses reçues par question, en ne gardant que les
        // identifiants de propositions appartenant RÉELLEMENT à la question.
        // Un client qui envoie l'identifiant d'une proposition d'une autre
        // question ne peut donc rien en tirer.
        $parQuestion = [];

        foreach ($reponses as $reponse) {
            $parQuestion[(int) $reponse['questionId']] = array_map('intval', $reponse['choiceIds'] ?? []);
        }

        $resultats = [];
        $score = 0;
        $scoreMax = 0;

        DB::transaction(function () use ($quiz, $tentative, $parQuestion, $horsDelai, &$resultats, &$score, &$scoreMax) {
            $tentative->answers()->delete();

            foreach ($quiz->questions as $question) {
                $scoreMax += $question->points;

                $attendus = $question->identifiantsCorrects();
                $recus = $this->cochesValides($question, $parQuestion[$question->id] ?? []);

                $juste = ! $horsDelai && $this->estJuste($question, $attendus, $recus);
                $points = $juste ? $question->points : 0;
                $score += $points;

                $tentative->answers()->create([
                    'question_id' => $question->id,
                    'choice_ids' => $recus,
                    'is_correct' => $juste,
                    'points_earned' => $points,
                ]);

                $resultats[] = [
                    'questionId' => $question->id,
                    'statement' => $question->statement,
                    'points' => $question->points,
                    'pointsEarned' => $points,
                    'correct' => $juste,

                    // Après soumission SEULEMENT, la correction est renvoyée :
                    // c'est le retour pédagogique, et la tentative est déjà
                    // verrouillée, donc il n'y a plus rien à en tirer.
                    'chosenChoiceIds' => $recus,
                    'expectedChoiceIds' => $attendus,
                    'explanation' => $question->explanation,
                    'sourcePointCode' => $question->source_point_code,
                    'objectiveCode' => $question->objective_code,
                ];
            }

            $pourcentage = $scoreMax > 0 ? (int) round($score / $scoreMax * 100) : 0;

            $tentative->forceFill([
                'submitted_at' => now(),
                'score' => $score,
                'max_score' => $scoreMax,
                'passed' => ! $horsDelai && $pourcentage >= $quiz->pass_score,
                'timed_out' => $horsDelai,
            ])->save();
        });

        $tentative->setAttribute('resultats', $resultats);

        return $tentative;
    }

    /**
     * Ne conserve que les identifiants appartenant à la question, dédoublonnés.
     *
     * @param  list<int>  $recus
     * @return list<int>
     */
    private function cochesValides(Question $question, array $recus): array
    {
        $legitimes = $question->choices->pluck('id')->map(fn ($id) => (int) $id)->all();

        $filtres = array_values(array_unique(array_intersect($recus, $legitimes)));

        sort($filtres);

        return $filtres;
    }

    /**
     * @param  list<int>  $attendus
     * @param  list<int>  $recus
     */
    private function estJuste(Question $question, array $attendus, array $recus): bool
    {
        if ($recus === []) {
            return false;
        }

        sort($attendus);

        return match ($question->type) {
            // Choix unique et vrai/faux : une seule case, et la bonne.
            // Cocher deux cases sur une question à choix unique est une
            // réponse invalide, pas une réponse « partiellement juste ».
            'single', 'truefalse' => count($recus) === 1 && $recus === $attendus,

            // Choix multiple : égalité stricte des ensembles.
            'multiple' => $recus === $attendus,

            default => false,
        };
    }
}
