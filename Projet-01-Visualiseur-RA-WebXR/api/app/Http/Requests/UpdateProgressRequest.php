<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Étape 2.8 — Enregistrement de la progression.
 *
 * Ni `completionPct` ni `completedAt` ne sont acceptés du client : ils sont
 * recalculés par `LabCompletion` à chaque écriture.
 */
class UpdateProgressRequest extends FormRequest
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
            'visitedPoints' => ['present', 'array', 'max:64'],
            'visitedPoints.*' => ['string', 'max:20'],

            'completedPoints' => ['present', 'array', 'max:64'],
            'completedPoints.*' => ['string', 'max:20'],

            // {position: [x,y,z], rotation: y} — reprise à l'endroit exact
            'lastPosition' => ['nullable', 'array'],
            'lastPosition.position' => ['required_with:lastPosition', 'array', 'size:3'],
            'lastPosition.position.*' => ['numeric'],
            'lastPosition.rotation' => ['nullable', 'numeric'],

            // Borné à 24 h : une valeur aberrante fausserait le temps moyen du
            // tableau de bord pour toute la cohorte.
            'totalTimeMs' => ['nullable', 'integer', 'min:0', 'max:86400000'],
        ];
    }
}
