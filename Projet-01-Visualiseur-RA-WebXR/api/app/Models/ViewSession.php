<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Session de consultation d'un objet pédagogique.
 *
 * Identifiant UUID : il circule côté client et sert de point de rattachement
 * à la bascule desktop → mobile du Lot 6, où deux appareils alimentent
 * la même session.
 */
class ViewSession extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** Modules de la plateforme mutualisée (ADR-001 du Projet 02). */
    public const MODULES = ['viewer-ra', 'labo-formation'];

    protected $fillable = [
        'learning_object_id', 'environment_id', 'module', 'user_ref', 'lms_context',
        'device_type', 'xr_supported', 'started_at', 'ended_at',
        'duration_ms', 'entered_ar',
    ];

    /**
     * Valeurs par défaut portées par le modèle, pas seulement par le schéma :
     * sans elles, une instance fraîchement créée renvoie null au lieu de false
     * tant qu'elle n'a pas été relue en base.
     */
    protected $attributes = [
        'xr_supported' => false,
        'entered_ar' => false,
        'module' => 'viewer-ra',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'xr_supported' => 'boolean',
            'entered_ar' => 'boolean',
            'duration_ms' => 'integer',
        ];
    }

    /** @return BelongsTo<LearningObject, $this> */
    public function learningObject(): BelongsTo
    {
        return $this->belongsTo(LearningObject::class);
    }

    /**
     * Projet 02 — l'environnement 3D parcouru, quand la session appartient au
     * module « labo-formation ». Exactement l'une des deux relations
     * (learningObject | environment) est renseignée.
     *
     * @return BelongsTo<Environment, $this>
     */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    /** @return HasMany<SessionEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(SessionEvent::class)->orderBy('occurred_at');
    }

    /** @return HasMany<HandoffToken, $this> */
    public function handoffTokens(): HasMany
    {
        return $this->hasMany(HandoffToken::class, 'view_session_id');
    }

    public function estCloturee(): bool
    {
        return $this->ended_at !== null;
    }

    /** Identifiants des annotations effectivement ouvertes pendant la session. */
    public function annotationsConsultees(): array
    {
        return $this->events
            ->where('type', 'annotation_opened')
            ->pluck('payload.annotation_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Projet 02 — codes des postes dont l'activité a été menée à son terme.
     *
     * @return list<string>
     */
    public function postesTermines(): array
    {
        return $this->events
            ->where('type', 'activity_completed')
            ->pluck('payload.point_code')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
