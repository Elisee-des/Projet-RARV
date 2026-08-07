<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Objet pédagogique 3D consultable en 3D et en réalité augmentée.
 */
class LearningObject extends Model
{
    /** @use HasFactory<\Database\Factories\LearningObjectFactory> */
    use HasFactory;

    protected $fillable = [
        'slug', 'title', 'description', 'category',
        'glb_path', 'usdz_path', 'poster_path',
        'default_scale', 'up_axis', 'recommended_placement',
        'triangles', 'file_size_kb', 'status',
    ];

    protected function casts(): array
    {
        return [
            'default_scale' => 'float',
            'triangles' => 'integer',
            'file_size_kb' => 'integer',
        ];
    }

    /** Les URL publiques exposent le slug, pas l'identifiant numérique. */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<Annotation, $this> */
    public function annotations(): HasMany
    {
        return $this->hasMany(Annotation::class)->orderBy('sort_order');
    }

    /** @return HasMany<ViewSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(ViewSession::class);
    }

    /** @param Builder<self> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', 'published');
    }

    /**
     * Budget de performance mobile (étape 1.7), appliqué à l'upload par le
     * back-office du Lot 8. Ce ne sont pas des indications : au-delà, le
     * module devient inutilisable sur un téléphone en 4G.
     */
    public const BUDGET_TRIANGLES = 150_000;

    public const BUDGET_TAILLE_KO = 8_192;

    public function respecteBudgetPerf(): bool
    {
        return ($this->triangles ?? 0) <= self::BUDGET_TRIANGLES
            && ($this->file_size_kb ?? 0) <= self::BUDGET_TAILLE_KO;
    }
}
