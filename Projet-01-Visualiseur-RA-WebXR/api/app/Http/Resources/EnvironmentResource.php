<?php

namespace App\Http\Resources;

use App\Models\Environment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * Étape 2.3 — Fiche complète d'un environnement 3D.
 *
 * @mixin Environment
 */
class EnvironmentResource extends JsonResource
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

            'assets' => [
                'scene' => $this->urlAsset($this->scene_glb_path),
                'collision' => $this->urlAsset($this->collision_glb_path),
                'lightmaps' => array_values(array_filter(array_map(
                    fn ($chemin) => $this->urlAsset($chemin),
                    $this->lightmap_paths ?? []
                ))),
            ],

            // Valeurs de repli. Le chargeur de scène privilégie toujours les
            // Empty nommés du .glb (`SPAWN`, `POI_xx`) — étape 1.10.
            'spawn' => [
                'position' => $this->spawn_position,
                'rotation' => $this->spawn_rotation,
            ],

            'bounds' => $this->bounds,

            'perf' => [
                'triangles' => $this->triangles,
                'fileSizeKb' => $this->file_size_kb,
                'dansLeBudget' => $this->respecteBudgetPerf(),
            ],

            'completion' => [
                'requiredPoints' => $this->codesRequis(),
                'passScore' => $this->seuilQuiz(),
            ],

            'points' => InteractionPointResource::collection(
                $this->whenLoaded('points')
            ),
        ];
    }

    /** Seuil du quiz noté de l'environnement, s'il en porte un. */
    private function seuilQuiz(): ?int
    {
        $poste = $this->points->firstWhere('activity_type', 'quiz');

        return $poste?->quiz?->pass_score;
    }

    private function urlAsset(?string $chemin): ?string
    {
        if ($chemin === null) {
            return null;
        }

        return URL::signedRoute('environments.assets.show', [
            'slug' => $this->slug,
            'fichier' => basename($chemin),
        ]);
    }
}
