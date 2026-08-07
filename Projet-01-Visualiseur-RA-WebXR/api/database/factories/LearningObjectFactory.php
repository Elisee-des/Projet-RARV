<?php

namespace Database\Factories;

use App\Models\LearningObject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LearningObject>
 */
class LearningObjectFactory extends Factory
{
    protected $model = LearningObject::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'category' => 'Maintenance industrielle',
            'glb_path' => 'objets/test/modele.glb',
            'usdz_path' => 'objets/test/modele.usdz',
            'poster_path' => 'objets/test/poster.webp',
            'default_scale' => 1.0,
            'up_axis' => 'Y',
            'recommended_placement' => 'floor',
            'triangles' => 42_000,
            'file_size_kb' => 2_048,
            'status' => 'published',
        ];
    }

    public function brouillon(): static
    {
        return $this->state(fn () => ['status' => 'draft']);
    }

    /** Hors budget de performance mobile (étape 1.7). */
    public function troplourd(): static
    {
        return $this->state(fn () => [
            'triangles' => 900_000,
            'file_size_kb' => 40_000,
        ]);
    }
}
