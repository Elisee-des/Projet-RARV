<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ViewerToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Étape 2.7 — Émission d'un jeton viewer.
 *
 * En production, cet appel est fait par le SERVEUR du LMS au moment du rendu
 * de la leçon, jamais par le navigateur : le secret partagé ne doit pas
 * transiter côté client. Le navigateur ne reçoit que le jeton.
 */
class ViewerTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $secret = (string) config('rarv.lms_secret');
        $fourni = (string) $request->header('X-LMS-Secret');

        if ($secret === '' || ! hash_equals($secret, $fourni)) {
            return response()->json([
                'message' => 'Secret LMS absent ou invalide.',
            ], 403);
        }

        $donnees = $request->validate([
            'slug' => ['required', 'string', 'exists:learning_objects,slug'],
            'userRef' => ['nullable', 'string', 'max:255'],
            'lmsContext' => ['nullable', 'string', 'max:255'],
        ]);

        $ttl = (int) config('rarv.token_ttl');

        $token = ViewerToken::issue([
            'slug' => $donnees['slug'],
            'userRef' => $donnees['userRef'] ?? null,
            'lmsContext' => $donnees['lmsContext'] ?? null,
        ], $ttl);

        return response()->json([
            'token' => $token,
            'expiresIn' => $ttl * 60,
        ], 201);
    }
}
