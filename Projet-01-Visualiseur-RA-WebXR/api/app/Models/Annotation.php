<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Point d'explication accroché à une pièce précise de l'objet 3D.
 */
class Annotation extends Model
{
    /** @use HasFactory<\Database\Factories\AnnotationFactory> */
    use HasFactory;

    protected $fillable = [
        'learning_object_id', 'sort_order',
        'position_x', 'position_y', 'position_z',
        'normal_x', 'normal_y', 'normal_z',
        'label', 'title', 'body_html', 'media_url', 'doc_url',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'position_x' => 'float', 'position_y' => 'float', 'position_z' => 'float',
            'normal_x' => 'float', 'normal_y' => 'float', 'normal_z' => 'float',
        ];
    }

    /** @return BelongsTo<LearningObject, $this> */
    public function learningObject(): BelongsTo
    {
        return $this->belongsTo(LearningObject::class);
    }

    /**
     * Position en espace local du modèle, au format attendu par Three.js.
     *
     * @return array{0: float, 1: float, 2: float}
     */
    public function position(): array
    {
        return [$this->position_x, $this->position_y, $this->position_z];
    }

    /** @return array{0: float, 1: float, 2: float}|null */
    public function normal(): ?array
    {
        if ($this->normal_x === null) {
            return null;
        }

        return [$this->normal_x, $this->normal_y, $this->normal_z];
    }
}
