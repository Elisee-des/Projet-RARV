<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Événement unitaire d'une session de consultation.
 */
class SessionEvent extends Model
{
    use HasFactory;

    /** Types du module « viewer-ra » (Projet 01, étape 2.8). */
    public const TYPES_VIEWER = [
        'model_loaded',
        'model_placed',
        'ar_entered',
        'ar_exited',
        'annotation_opened',
        'annotation_closed',
        'completed',
    ];

    /**
     * Types du module « labo-formation » (Projet 02, étape 2.9).
     *
     * Le journal est mutualisé (ADR-001) : les deux modules écrivent dans la
     * même table, avec des vocabulaires d'événements distincts.
     */
    public const TYPES_LABO = [
        'scene_loaded',
        'point_entered',
        'point_left',
        'activity_started',
        'activity_completed',
        'quiz_submitted',
        'vr_entered',
        'vr_exited',
    ];

    /** Types acceptés à l'entrée de l'API, tous modules confondus. */
    public const TYPES = [...self::TYPES_VIEWER, ...self::TYPES_LABO];

    protected $fillable = ['view_session_id', 'type', 'payload', 'occurred_at'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ViewSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ViewSession::class, 'view_session_id');
    }
}
