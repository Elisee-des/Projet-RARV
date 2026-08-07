<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projet 02 — Proposition de réponse.
 *
 * 🔒 `is_correct` est masqué par défaut à la sérialisation. C'est une seconde
 * barrière derrière la ressource API de l'étape 2.4 : même un `->toJson()`
 * accidentel sur un modèle Choice ne peut pas divulguer la bonne réponse.
 */
class Choice extends Model
{
    /** @use HasFactory<\Database\Factories\ChoiceFactory> */
    use HasFactory;

    protected $fillable = ['question_id', 'sort_order', 'label', 'is_correct'];

    /** @var list<string> */
    protected $hidden = ['is_correct'];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    /** @return BelongsTo<Question, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
