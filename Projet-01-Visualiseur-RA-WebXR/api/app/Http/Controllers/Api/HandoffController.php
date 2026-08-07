<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HandoffToken;
use App\Models\ViewSession;
use App\Support\ViewerToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lot 6 — Bascule desktop → mobile.
 *
 * Le problème produit : le LMS se consulte sur ordinateur, la réalité
 * augmentée se vit sur téléphone. Plutôt que d'abandonner l'apprenant devant
 * un bouton inerte, on lui donne un QR code qui ouvre la RA sur son mobile
 * **en poursuivant la même session** — les annotations consultées sur les deux
 * appareils alimentent un seul et même relevé.
 */
class HandoffController extends Controller
{
    /**
     * Étape 6.1 — Crée le jeton de bascule.
     *
     * Exige un jeton viewer valide : seul un apprenant déjà autorisé sur cet
     * objet peut engendrer un lien de reprise.
     */
    public function store(Request $request): JsonResponse
    {
        /** @var array<string, mixed> $viewer */
        $viewer = $request->attributes->get('viewer');

        $donnees = $request->validate([
            'sessionId' => ['required', 'uuid', 'exists:view_sessions,id'],
        ]);

        $session = ViewSession::with('learningObject')->findOrFail($donnees['sessionId']);

        // La session doit porter sur l'objet autorisé par le jeton.
        abort_unless($session->learningObject->slug === $viewer['slug'], 403, 'Session étrangère au jeton.');
        abort_if($session->estCloturee(), 409, 'Session déjà clôturée.');

        $minutes = (int) config('rarv.handoff_ttl');

        $bascule = HandoffToken::create([
            'token' => HandoffToken::genererToken(),
            'learning_object_id' => $session->learning_object_id,
            'view_session_id' => $session->id,
            'expires_at' => now()->addMinutes($minutes),
        ]);

        return response()->json([
            'token' => $bascule->token,
            'url' => rtrim((string) config('rarv.viewer_url'), '/').'/ar/'.$bascule->token,
            'expiresIn' => $minutes * 60,
        ], 201);
    }

    /**
     * Étape 6.3 — Le mobile consomme le jeton après scan.
     *
     * Route publique : le téléphone qui vient de scanner ne possède encore
     * aucun jeton viewer. C'est précisément ce que la bascule lui délivre —
     * d'où l'usage unique et l'expiration courte (étape 6.6).
     */
    public function consume(string $token): JsonResponse
    {
        $bascule = HandoffToken::with(['learningObject', 'session'])
            ->where('token', $token)
            ->first();

        if (! $bascule) {
            return response()->json(['message' => 'Lien de bascule inconnu.'], 404);
        }

        if (! $bascule->estValide()) {
            return response()->json([
                'message' => $bascule->consumed_at !== null
                    ? 'Ce lien a déjà été utilisé.'
                    : 'Ce lien a expiré. Régénérez un QR code depuis votre ordinateur.',
            ], 410);
        }

        $bascule->consommer();

        $session = $bascule->session;

        return response()->json([
            'slug' => $bascule->learningObject->slug,
            // Poursuite de la MÊME session : c'est tout l'intérêt de la bascule.
            'sessionId' => $session?->id,
            'token' => ViewerToken::issue([
                'slug' => $bascule->learningObject->slug,
                'userRef' => $session?->user_ref,
                'lmsContext' => $session?->lms_context,
            ]),
        ]);
    }
}
