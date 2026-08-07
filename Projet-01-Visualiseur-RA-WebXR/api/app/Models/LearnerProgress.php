<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projet 02 — Progression d'un apprenant dans un environnement.
 */
class LearnerProgress extends Model
{
    /** @use HasFactory<\Database\Factories\LearnerProgressFactory> */
    use HasFactory;

    // « learner_progress » est déjà au pluriel de fait : le pluriel automatique
    // produirait « learner_progresses ».
    protected $table = 'learner_progress';

    protected $fillable = [
        'user_ref', 'environment_id',
        'visited_points', 'completed_points', 'last_position',
        'total_time_ms', 'completion_pct', 'completed_at',
    ];

    protected $attributes = [
        'total_time_ms' => 0,
        'completion_pct' => 0,
    ];

    protected function casts(): array
    {
        return [
            'visited_points' => 'array',
            'completed_points' => 'array',
            'last_position' => 'array',
            'total_time_ms' => 'integer',
            'completion_pct' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Environment, $this> */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    /** @return list<string> */
    public function visites(): array
    {
        return array_values($this->visited_points ?? []);
    }

    /** @return list<string> */
    public function completes(): array
    {
        return array_values($this->completed_points ?? []);
    }

    public function estComplete(): bool
    {
        return $this->completed_at !== null;
    }
}
