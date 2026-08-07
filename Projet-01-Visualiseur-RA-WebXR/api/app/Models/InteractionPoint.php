<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projet 02 — Point d'intérêt d'un environnement (un « poste »).
 */
class InteractionPoint extends Model
{
    /** @use HasFactory<\Database\Factories\InteractionPointFactory> */
    use HasFactory;

    public const TYPES_ACTIVITE = ['quiz', 'video', 'panel', 'document'];

    public const TYPES_DECLENCHEMENT = ['click', 'proximity'];

    protected $fillable = [
        'environment_id', 'sort_order', 'code',
        'position_x', 'position_y', 'position_z',
        'look_at_x', 'look_at_y', 'look_at_z',
        'trigger_type', 'trigger_radius',
        'activity_type', 'activity_id', 'activity_payload',
        'label', 'icon', 'required',
    ];

    protected function casts(): array
    {
        return [
            'activity_payload' => 'array',
            'required' => 'boolean',
            'trigger_radius' => 'float',
            'position_x' => 'float', 'position_y' => 'float', 'position_z' => 'float',
            'look_at_x' => 'float', 'look_at_y' => 'float', 'look_at_z' => 'float',
        ];
    }

    /** @return BelongsTo<Environment, $this> */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    /** @return BelongsTo<Quiz, $this> */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class, 'activity_id');
    }

    /**
     * Position telle que stockée en base, ou null si elle doit être lue depuis
     * l'Empty nommé du .glb (cas normal — étape 1.10).
     *
     * @return array{0: float, 1: float, 2: float}|null
     */
    public function position(): ?array
    {
        if ($this->position_x === null || $this->position_y === null || $this->position_z === null) {
            return null;
        }

        return [$this->position_x, $this->position_y, $this->position_z];
    }

    /** @return array{0: float, 1: float, 2: float}|null */
    public function lookAt(): ?array
    {
        if ($this->look_at_x === null || $this->look_at_y === null || $this->look_at_z === null) {
            return null;
        }

        return [$this->look_at_x, $this->look_at_y, $this->look_at_z];
    }
}
