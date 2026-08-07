<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnvironmentResource;
use App\Models\Environment;

/**
 * Étape 2.3 — Fiche d'un environnement 3D.
 *
 * Lecture seule et publique : la fiche décrit la salle et ses postes, elle ne
 * contient aucune donnée personnelle et aucune bonne réponse.
 */
class EnvironmentController extends Controller
{
    public function show(string $slug): EnvironmentResource
    {
        $environnement = Environment::query()
            ->published()
            ->where('slug', $slug)
            ->with('points.quiz')
            ->firstOrFail();

        // La ressource des postes construit des URL signées à partir du slug de
        // l'environnement. On lui pose la relation inverse pour éviter huit
        // requêtes identiques (une par poste).
        $environnement->points->each(
            fn ($point) => $point->setRelation('environment', $environnement)
        );

        return new EnvironmentResource($environnement);
    }
}
