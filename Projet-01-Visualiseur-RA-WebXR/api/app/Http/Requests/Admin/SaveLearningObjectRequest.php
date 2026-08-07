<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Étapes 8.2 et 8.3 — Validation d'un objet pédagogique.
 *
 * Les fichiers 3D ne sont pas validés par type MIME : les navigateurs et
 * serveurs envoient .glb tantôt en `model/gltf-binary`, tantôt en
 * `application/octet-stream`, tantôt vide. On valide donc l'extension ici,
 * puis la STRUCTURE réelle du fichier avec GlbInspector — seule vérification
 * qui ne se laisse pas tromper par un renommage.
 */
class SaveLearningObjectRequest extends FormRequest
{
    /**
     * En mode portfolio (`RARV_AUTH_REQUIRED=false`), le back-office est en
     * accès libre : exiger un utilisateur connecté ici renverrait 403 sur
     * toutes les créations et modifications, alors que les routes, elles,
     * sont ouvertes. Les deux réglages doivent rester cohérents.
     */
    public function authorize(): bool
    {
        return ! config('rarv.auth_required') || $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $objet = $this->route('objet');
        $creation = $objet === null;

        return [
            'slug' => [
                'required', 'string', 'max:120',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('learning_objects', 'slug')->ignore($objet?->id),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:4000'],
            'category' => ['nullable', 'string', 'max:120'],

            'default_scale' => ['required', 'numeric', 'min:0.001', 'max:1000'],
            'up_axis' => ['required', Rule::in(['Y', 'Z'])],
            'recommended_placement' => ['required', Rule::in(['floor', 'table', 'wall'])],

            // 12 Mo : au-delà du budget de 8 Mo, mais on veut pouvoir rejeter
            // le fichier avec un message clair plutôt qu'un 413 du serveur.
            'glb' => [$creation ? 'required' : 'nullable', 'file', 'max:12288'],
            'usdz' => ['nullable', 'file', 'max:12288'],
            'poster' => ['nullable', 'image', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'Le slug ne peut contenir que des minuscules, des chiffres et des tirets.',
            'glb.max' => 'Le fichier .glb dépasse 12 Mo — bien au-delà du budget mobile.',
        ];
    }
}
