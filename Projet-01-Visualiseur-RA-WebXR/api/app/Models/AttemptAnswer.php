<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projet 02 — Réponse corrigée par le serveur.
 */
class AttemptAnswer extends Model
{
    /** @use HasFactory<\Database\Factories\AttemptAnswerFactory> */
    use HasFactory;

    protected $fillable = [
        'attempt_id', 'question_id', 'choice_ids', 'is_correct', 'points_earned',
    ];

    protected $attributes = ['is_correct' => false];

    protected function casts(): array
    {
        return [
            'choice_ids' => 'array',
            'is_correct' => 'boolean',
            'points_earned' => 'integer',
        ];
    }

    /** @return BelongsTo<Attempt, $this> */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(Attempt::class);
    }

    /** @return BelongsTo<Question, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
