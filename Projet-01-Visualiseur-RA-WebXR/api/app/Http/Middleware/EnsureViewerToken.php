<?php

namespace App\Http\Middleware;

use App\Support\ViewerToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Étape 2.7 — Exige un jeton viewer valide.
 *
 * Les revendications vérifiées sont déposées dans les attributs de la requête ;
 * les contrôleurs s'y réfèrent au lieu de faire confiance au corps de la requête.
 * C'est ce qui empêche un client de déclarer une session au nom d'un autre
 * apprenant ou sur un autre objet.
 */
class EnsureViewerToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?? $request->query('t');

        $claims = ViewerToken::verify(is_string($token) ? $token : null);

        if ($claims === null) {
            return response()->json([
                'message' => 'Jeton viewer absent, invalide ou expiré.',
            ], 401);
        }

        $request->attributes->set('viewer', $claims);

        return $next($request);
    }
}
