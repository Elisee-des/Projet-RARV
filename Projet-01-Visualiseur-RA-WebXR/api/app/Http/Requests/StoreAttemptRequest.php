<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Étape 2.5 — Ouverture d'une tentative.
 *
 * Ni `userRef` ni `attemptNumber` ne figurent ici : ils sont déterminés par le
 * serveur à partir du jeton signé et du nombre de tentatives déjà soumises.
 */
class StoreAttemptRequest extends FormRequest
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
            'quizId' => ['required', 'integer', 'exists:quizzes,id'],
            'sessionId' => ['nullable', 'uuid', 'exists:view_sessions,id'],
        ];
    }
}
