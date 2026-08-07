<?php

namespace App\Http\Requests;

use App\Models\SessionEvent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSessionEventsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Accepte un lot d'événements : le viewer tamponne côté client
     * puis envoie en une fois, pour ne pas saturer l'API pendant une session RA.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'events' => ['required', 'array', 'min:1', 'max:100'],
            'events.*.type' => ['required', Rule::in(SessionEvent::TYPES)],
            'events.*.payload' => ['nullable', 'array'],
            'events.*.occurredAt' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'events.*.type.in' => 'Type d\'événement inconnu. Valeurs acceptées : '
                .implode(', ', SessionEvent::TYPES),
        ];
    }
}
