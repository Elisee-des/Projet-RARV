<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Jeton de bascule desktop → mobile (Lot 6).
 *
 * Usage unique et expiration courte : le desktop affiche un QR code,
 * le téléphone le scanne, consomme le jeton et poursuit la MÊME session.
 */
class HandoffToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'token', 'learning_object_id', 'view_session_id',
        'expires_at', 'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    /** @return BelongsTo<LearningObject, $this> */
    public function learningObject(): BelongsTo
    {
        return $this->belongsTo(LearningObject::class);
    }

    /** @return BelongsTo<ViewSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ViewSession::class, 'view_session_id');
    }

    public static function genererToken(): string
    {
        return Str::random(48);
    }

    public function estValide(): bool
    {
        return $this->consumed_at === null && $this->expires_at->isFuture();
    }

    /** Marque le jeton comme consommé. Retourne false s'il ne l'était plus. */
    public function consommer(): bool
    {
        if (! $this->estValide()) {
            return false;
        }

        $this->forceFill(['consumed_at' => now()])->save();

        return true;
    }

    /** @param Builder<self> $query */
    public function scopeValide(Builder $query): void
    {
        $query->whereNull('consumed_at')->where('expires_at', '>', now());
    }
}
