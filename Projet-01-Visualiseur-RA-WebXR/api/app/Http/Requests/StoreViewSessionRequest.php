<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Le slug et l'identifiant d'apprenant ne sont PAS acceptés depuis le corps
 * de la requête : ils proviennent du jeton signé (étape 2.7). Seules les
 * informations d'appareil, invérifiables par nature, viennent du client.
 */
class StoreViewSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // le jeton est vérifié par le middleware viewer.token
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'deviceType' => ['nullable', Rule::in(['desktop', 'android', 'ios', 'other'])],
            'xrSupported' => ['nullable', 'boolean'],
        ];
    }
}
