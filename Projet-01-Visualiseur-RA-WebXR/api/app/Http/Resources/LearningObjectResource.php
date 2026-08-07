<?php

namespace App\Http\Resources;

use App\Models\LearningObject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * @mixin LearningObject
 */
class LearningObjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,

            'assets' => [
                'glb' => $this->urlAsset($this->glb_path),
                'usdz' => $this->urlAsset($this->usdz_path),
                'poster' => $this->urlAsset($this->poster_path),
            ],

            // Calibrage RA : 1 unité glTF = 1 mètre réel
            'placement' => [
                'scale' => $this->default_scale,
                'upAxis' => $this->up_axis,
                'recommended' => $this->recommended_placement,
            ],

            'perf' => [
                'triangles' => $this->triangles,
                'fileSizeKb' => $this->file_size_kb,
            ],

            'annotations' => AnnotationResource::collection(
                $this->whenLoaded('annotations')
            ),
        ];
    }

    /**
     * URL signée d'un asset (étape 2.9).
     *
     * Signature SANS expiration, volontairement : l'URL doit rester stable
     * pour être mise en cache un an par le navigateur et le CDN. La signature
     * empêche de forger un chemin ; elle ne sert pas à limiter la durée.
     */
    private function urlAsset(?string $chemin): ?string
    {
        if ($chemin === null) {
            return null;
        }

        return URL::signedRoute('assets.show', [
            'slug' => $this->slug,
            'fichier' => basename($chemin),
        ]);
    }
}
