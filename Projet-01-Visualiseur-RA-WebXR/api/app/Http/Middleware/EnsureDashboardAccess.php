<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Étape 2.10 — Accès au tableau de bord formateur.
 *
 * Les agrégats de cohorte ne sont pas du contenu public : ils exposent des
 * scores et des identifiants d'apprenants.
 *
 * Secret partagé et non authentification par compte, à ce stade : le
 * back-office avec comptes formateurs relève du Lot 8 du module « viewer-ra ».
 * Un secret vérifié en temps constant est la bonne mesure d'ici là — et ne pas
 * en avoir configuré ferme l'accès plutôt que de l'ouvrir.
 */
class EnsureDashboardAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        // Étape 11.5 — mode démonstration : le tableau de bord s'ouvre sans
        // secret, pour qu'un recruteur puisse le parcourir en un clic. Les
        // identifiants d'apprenants y sont pseudonymisés (voir `Pseudonyme`).
        if (config('rarv.demo_public')) {
            return $next($request);
        }

        $attendu = config('rarv.dashboard_secret');

        if (! is_string($attendu) || $attendu === '') {
            return response()->json([
                'message' => 'Tableau de bord non configuré (RARV_DASHBOARD_SECRET absent).',
            ], 503);
        }

        $fourni = $request->header('X-Dashboard-Secret') ?? $request->bearerToken();

        if (! is_string($fourni) || ! hash_equals($attendu, $fourni)) {
            return response()->json([
                'message' => 'Accès au tableau de bord refusé.',
            ], 401);
        }

        return $next($request);
    }
}
