<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Étape 2.6 — Soumission des réponses.
 *
 * Le client n'envoie que des identifiants de propositions cochées. Aucun score,
 * aucune indication de justesse : le serveur ne lui ferait de toute façon pas
 * confiance (décision D5).
 *
 * `choiceIds` accepte un tableau vide — c'est une question laissée sans
 * réponse, qui vaut zéro. La refuser obligerait le front à inventer une valeur.
 */
class SubmitAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'answers' => ['present', 'array', 'max:100'],
            'answers.*.questionId' => ['required', 'integer'],
            'answers.*.choiceIds' => ['present', 'array', 'max:20'],
            'answers.*.choiceIds.*' => ['integer'],
        ];
    }
}
