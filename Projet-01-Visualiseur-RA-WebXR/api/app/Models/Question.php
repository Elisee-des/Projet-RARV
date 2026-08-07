<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Projet 02 — Question d'un quiz.
 */
class Question extends Model
{
    /** @use HasFactory<\Database\Factories\QuestionFactory> */
    use HasFactory;

    public const TYPES = ['single', 'multiple', 'truefalse'];

    protected $fillable = [
        'quiz_id', 'sort_order', 'type', 'statement', 'points',
        'explanation', 'objective_code', 'source_point_code',
    ];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    /** @return BelongsTo<Quiz, $this> */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /** @return HasMany<Choice, $this> */
    public function choices(): HasMany
    {
        return $this->hasMany(Choice::class)->orderBy('sort_order');
    }

    /**
     * Identifiants des bonnes réponses.
     *
     * 🔒 Usage strictement serveur : ne jamais sérialiser dans une réponse HTTP
     * avant soumission de la tentative.
     *
     * @return list<int>
     */
    public function identifiantsCorrects(): array
    {
        return $this->choices
            ->where('is_correct', true)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }
}
