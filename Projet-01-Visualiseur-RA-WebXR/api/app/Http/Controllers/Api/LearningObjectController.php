<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LearningObjectResource;
use App\Models\LearningObject;

class LearningObjectController extends Controller
{
    /**
     * Étape 2.3 — Fiche complète d'un objet pédagogique : métadonnées,
     * URL des assets et annotations. C'est l'unique appel dont le viewer
     * a besoin pour démarrer.
     */
    public function show(string $slug): LearningObjectResource
    {
        $objet = LearningObject::query()
            ->published()
            ->with('annotations')
            ->where('slug', $slug)
            ->firstOrFail();

        return new LearningObjectResource($objet);
    }
}
