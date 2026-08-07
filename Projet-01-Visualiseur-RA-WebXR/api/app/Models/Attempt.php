<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Projet 02 — Tentative de quiz.
 */
class Attempt extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'quiz_id', 'view_session_id', 'user_ref', 'attempt_number',
        'started_at', 'submitted_at', 'score', 'max_score', 'passed', 'timed_out',
    ];

    /** Sans ces valeurs, une instance fraîche renvoie null au lieu de false. */
    protected $attributes = [
        'passed' => false,
        'timed_out' => false,
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'score' => 'integer',
            'max_score' => 'integer',
            'attempt_number' => 'integer',
            'passed' => 'boolean',
            'timed_out' => 'boolean',
        ];
    }

    /** @return BelongsTo<Quiz, $this> */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /** @return HasMany<AttemptAnswer, $this> */
    public function answers(): HasMany
    {
        return $this->hasMany(AttemptAnswer::class);
    }

    /** Étape 2.7 — une tentative soumise est définitivement verrouillée. */
    public function estSoumise(): bool
    {
        return $this->submitted_at !== null;
    }

    /**
     * Le temps imparti est-il dépassé ?
     *
     * Tolérance de 5 s pour absorber la latence réseau entre le clic de
     * l'apprenant et l'arrivée de la requête : sans elle, une soumission
     * envoyée juste avant la limite serait injustement annulée.
     */
    public function tempsDepasse(int $toleranceS = 5): bool
    {
        $limite = $this->quiz->time_limit_s;

        if ($limite === null) {
            return false;
        }

        return $this->started_at->addSeconds($limite + $toleranceS)->isPast();
    }

    /** Score en pourcentage du maximum, arrondi. */
    public function pourcentage(): int
    {
        if (! $this->max_score) {
            return 0;
        }

        return (int) round($this->score / $this->max_score * 100);
    }
}
