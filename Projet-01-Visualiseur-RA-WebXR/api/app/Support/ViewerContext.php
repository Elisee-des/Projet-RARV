<?php

namespace App\Support;

use App\Models\Environment;
use Illuminate\Http\Request;

/**
 * Lecture des revendications du jeton viewer, déposées par le middleware
 * `EnsureViewerToken`.
 *
 * Toute la posture anti-triche du Lot 2 repose sur un principe : l'identité de
 * l'apprenant et l'environnement auquel il a accès viennent du jeton SIGNÉ,
 * jamais du corps de la requête. Passer par ce point unique évite qu'un
 * contrôleur oublie la règle.
 */
final class ViewerContext
{
    /** @return array<string, mixed> */
    public static function claims(Request $request): array
    {
        /** @var array<string, mixed>|null $viewer */
        $viewer = $request->attributes->get('viewer');

        abort_if($viewer === null, 401, 'Contexte viewer absent.');

        return $viewer;
    }

    /** Identifiant de l'apprenant tel que fourni par le LMS. */
    public static function userRef(Request $request): string
    {
        $claims = self::claims($request);

        return (string) ($claims['userRef'] ?? 'anonyme');
    }

    /**
     * Environnement 3D auquel ce jeton donne accès.
     *
     * 404 si le jeton porte un slug d'objet du module « viewer-ra » : les deux
     * modules partagent le socle mais pas leurs contenus.
     */
    public static function environnement(Request $request, bool $avecPoints = true): Environment
    {
        $claims = self::claims($request);

        $requete = Environment::query()
            ->published()
            ->where('slug', (string) ($claims['slug'] ?? ''));

        if ($avecPoints) {
            $requete->with('points.quiz');
        }

        return $requete->firstOrFail();
    }
}
