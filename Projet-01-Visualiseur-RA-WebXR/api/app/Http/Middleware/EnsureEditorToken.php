<?php

namespace App\Http\Middleware;

use App\Support\ViewerToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Étape 8.4 — Accès à l'éditeur visuel d'annotations.
 *
 * Réutilise le jeton signé du Lot 2, mais exige une portée `edit` explicite.
 * Un jeton de consultation — celui que reçoit chaque apprenant — ne doit
 * jamais pouvoir écrire dans le contenu pédagogique.
 *
 * Le jeton d'édition est émis par le back-office, donc derrière la session
 * authentifiée : il matérialise le droit d'un formateur connecté, transporté
 * jusqu'à une application front d'une autre origine.
 */
class EnsureEditorToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?? $request->query('t');

        $claims = ViewerToken::verify(is_string($token) ? $token : null);

        if ($claims === null) {
            return response()->json(['message' => 'Jeton d\'édition absent, invalide ou expiré.'], 401);
        }

        if (($claims['scope'] ?? null) !== 'edit') {
            return response()->json(['message' => 'Ce jeton ne permet pas la modification du contenu.'], 403);
        }

        // Le jeton porte sur UN objet : impossible d'éditer les annotations
        // d'un autre en changeant simplement le slug de l'URL.
        $slug = $request->route('slug');

        if (is_string($slug) && $slug !== ($claims['slug'] ?? null)) {
            return response()->json(['message' => 'Jeton étranger à cet objet.'], 403);
        }

        $request->attributes->set('editeur', $claims);

        return $next($request);
    }
}
