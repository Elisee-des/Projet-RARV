<?php

namespace App\Http\Resources;

use App\Models\Annotation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Annotation
 */
class AnnotationResource extends JsonResource
{
    /**
     * Clés en camelCase : cette ressource est consommée directement
     * par le viewer React.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order' => $this->sort_order,
            'label' => $this->label,
            'title' => $this->title,
            'bodyHtml' => $this->body_html,

            // Espace LOCAL du modèle — directement exploitable par Three.js
            'position' => $this->position(),
            'normal' => $this->normal(),

            'mediaUrl' => $this->media_url,
            'docUrl' => $this->doc_url,
        ];
    }
}
