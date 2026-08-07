<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Projet 02 — Environnement 3D navigable (une salle de formation).
 */
class Environment extends Model
{
    /** @use HasFactory<\Database\Factories\EnvironmentFactory> */
    use HasFactory;

    protected $fillable = [
        'slug', 'title', 'description',
        'scene_glb_path', 'collision_glb_path', 'lightmap_paths',
        'spawn_position', 'spawn_rotation', 'bounds',
        'triangles', 'file_size_kb', 'status',
    ];

    protected function casts(): array
    {
        return [
            'lightmap_paths' => 'array',
            'spawn_position' => 'array',
            'bounds' => 'array',
            'spawn_rotation' => 'float',
            'triangles' => 'integer',
            'file_size_kb' => 'integer',
        ];
    }

    /** Les URL publiques exposent le slug, pas l'identifiant numérique. */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<InteractionPoint, $this> */
    public function points(): HasMany
    {
        return $this->hasMany(InteractionPoint::class)->orderBy('sort_order');
    }

    /** @return HasMany<ViewSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(ViewSession::class);
    }

    /** @return HasMany<LearnerProgress, $this> */
    public function progress(): HasMany
    {
        return $this->hasMany(LearnerProgress::class);
    }

    /** @param Builder<self> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', 'published');
    }

    /**
     * Codes des postes qui comptent dans la condition de complétion.
     *
     * @return list<string>
     */
    public function codesRequis(): array
    {
        return $this->points()->where('required', true)->pluck('code')->all();
    }

    /**
     * Respecte-t-il le budget de performance du Lot 1 ?
     * Maximums : 400 000 triangles et 20 Mo.
     */
    public function respecteBudgetPerf(): bool
    {
        return ($this->triangles ?? 0) <= 400_000
            && ($this->file_size_kb ?? 0) <= 20_480;
    }
}
