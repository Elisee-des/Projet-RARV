<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Une déclaration xAPI, telle qu'envoyée (ou à envoyer) au LRS.
 */
class XapiStatement extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'view_session_id', 'actor_ref', 'verb', 'object_iri',
        'statement', 'etat_envoi', 'tentatives', 'derniere_erreur', 'envoye_at',
    ];

    protected function casts(): array
    {
        return [
            'statement' => 'array',
            'envoye_at' => 'datetime',
            'tentatives' => 'integer',
        ];
    }

    /** @return BelongsTo<ViewSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ViewSession::class, 'view_session_id');
    }

    /** @param Builder<self> $query */
    public function scopeEnAttente(Builder $query): void
    {
        $query->where('etat_envoi', 'en_attente');
    }

    /** Libellé lisible du verbe, pour le tableau de bord. */
    public function verbeCourt(): string
    {
        return (string) str($this->verb)->afterLast('/');
    }
}
