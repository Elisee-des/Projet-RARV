<?php

namespace App\Http\Controllers;

use App\Models\LearningObject;
use App\Support\ViewerToken;
use Illuminate\Contracts\View\View;

/**
 * Étape 7.3 — Fausse leçon LMS.
 *
 * Reproduit ce que fait un vrai LMS au moment du rendu d'une page de cours :
 * il émet un jeton viewer CÔTÉ SERVEUR et l'injecte dans le composant. Le
 * secret partagé ne quitte jamais le serveur ; le navigateur ne reçoit qu'un
 * jeton signé à durée limitée, portant l'identité de l'apprenant.
 */
class LeconController extends Controller
{
    public function show(string $slug): View
    {
        $objet = LearningObject::query()
            ->published()
            ->with('annotations')
            ->where('slug', $slug)
            ->firstOrFail();

        $jeton = ViewerToken::issue([
            'slug' => $objet->slug,
            // Dans un vrai LMS : l'identifiant de l'utilisateur authentifié.
            'userRef' => 'apprenant-demo',
            'lmsContext' => 'lecon-maintenance-pompes',
        ]);

        return view('lecon', [
            'objet' => $objet,
            'jeton' => $jeton,
            'viewerUrl' => (string) config('rarv.viewer_url'),
        ]);
    }
}
