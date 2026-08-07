<?php

namespace Database\Factories;

use App\Models\Annotation;
use App\Models\LearningObject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Annotation>
 */
class AnnotationFactory extends Factory
{
    protected $model = Annotation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learning_object_id' => LearningObject::factory(),
            'sort_order' => fake()->numberBetween(1, 9),
            'position_x' => fake()->randomFloat(3, -1, 1),
            'position_y' => fake()->randomFloat(3, 0, 2),
            'position_z' => fake()->randomFloat(3, -1, 1),
            'normal_x' => 0.0,
            'normal_y' => 1.0,
            'normal_z' => 0.0,
            'label' => fake()->words(2, true),
            'title' => fake()->sentence(3),
            'body_html' => '<p>'.fake()->paragraph().'</p>',
        ];
    }
}
