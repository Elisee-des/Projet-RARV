<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Projet 02 — Quiz noté.
 *
 * 🔒 Toute la correction se fait ici et dans QuizGrader, côté serveur.
 * Le front ne reçoit jamais l'indicateur de bonne réponse (décision D5).
 */
class Quiz extends Model
{
    /** @use HasFactory<\Database\Factories\QuizFactory> */
    use HasFactory;

    // Le pluriel automatique de « quiz » n'est pas fiable selon l'inflecteur :
    // on le fixe explicitement.
    protected $table = 'quizzes';

    protected $fillable = [
        'title', 'pass_score', 'max_attempts', 'shuffle_questions', 'time_limit_s',
    ];

    protected function casts(): array
    {
        return [
            'pass_score' => 'integer',
            'max_attempts' => 'integer',
            'shuffle_questions' => 'boolean',
            'time_limit_s' => 'integer',
        ];
    }

    /** @return HasMany<Question, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('sort_order');
    }

    /** @return HasMany<Attempt, $this> */
    public function attempts(): HasMany
    {
        return $this->hasMany(Attempt::class);
    }

    /** Score maximum atteignable, somme des points des questions. */
    public function scoreMaximum(): int
    {
        return (int) $this->questions()->sum('points');
    }

    /** Nombre de tentatives déjà soumises par cet apprenant. */
    public function nombreTentatives(string $userRef): int
    {
        return $this->attempts()->where('user_ref', $userRef)->count();
    }
}
