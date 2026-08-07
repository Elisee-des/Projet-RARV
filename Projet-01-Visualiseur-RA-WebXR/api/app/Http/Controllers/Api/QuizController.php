<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuizResource;
use App\Models\Quiz;
use App\Support\ViewerContext;
use Illuminate\Http\Request;

/**
 * Étape 2.4 — Quiz servi au front, **expurgé de toute bonne réponse**.
 *
 * Protégé par jeton : un quiz noté n'est pas du contenu public, et le jeton
 * fournit l'environnement auquel l'apprenant a droit.
 */
class QuizController extends Controller
{
    public function show(Request $request, Quiz $quiz): QuizResource
    {
        $environnement = ViewerContext::environnement($request);

        // Le quiz demandé doit être celui d'un poste de CET environnement.
        // Sans ce contrôle, un jeton valide pour une salle donnerait accès aux
        // quiz de toutes les autres.
        abort_unless(
            $environnement->points
                ->where('activity_type', 'quiz')
                ->pluck('activity_id')
                ->contains($quiz->id),
            404,
            'Ce quiz n\'appartient pas à cet environnement.'
        );

        $quiz->load('questions.choices');

        return new QuizResource($quiz);
    }
}
