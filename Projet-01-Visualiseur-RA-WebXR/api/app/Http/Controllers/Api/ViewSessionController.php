<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreViewSessionRequest;
use App\Models\Environment;
use App\Models\LearningObject;
use App\Models\ViewSession;
use App\Support\CompletionPolicy;
use App\Support\Xapi\LabXapiTracker;
use App\Support\Xapi\XapiTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ViewSessionController extends Controller
{
    /**
     * Étape 2.4 — Ouvre une session de consultation.
     *
     * L'objet et l'apprenant proviennent du jeton signé, jamais du corps de
     * la requête : un client ne peut donc pas ouvrir une session au nom d'un
     * autre apprenant ni sur un objet auquel il n'a pas été autorisé.
     */
    public function store(StoreViewSessionRequest $request): JsonResponse
    {
        /** @var array<string, mixed> $viewer */
        $viewer = $request->attributes->get('viewer');

        $module = (string) ($viewer['module'] ?? 'viewer-ra');

        $commun = [
            'module' => $module,
            'user_ref' => $viewer['userRef'] ?? null,
            'lms_context' => $viewer['lmsContext'] ?? null,
            'device_type' => $request->input('deviceType', 'other'),
            'xr_supported' => $request->boolean('xrSupported'),
            'started_at' => now(),
        ];

        // Socle mutualisé (ADR-001) : la même table `view_sessions` sert les
        // deux modules. Le parent diffère — un objet pédagogique d'un côté,
        // un environnement 3D de l'autre — et provient du jeton signé.
        $parent = $module === 'labo-formation'
            ? Environment::query()->published()->where('slug', $viewer['slug'])->firstOrFail()
            : LearningObject::query()->published()->where('slug', $viewer['slug'])->firstOrFail();

        $session = $parent->sessions()->create($commun);

        return response()->json([
            'sessionId' => $session->id,
            'module' => $module,
            'startedAt' => $session->started_at->toIso8601String(),
        ], 201);
    }

    /**
     * Étape 6.5 — État courant d'une session, interrogé en boucle par le
     * poste desktop pendant que l'apprenant est en RA sur son téléphone.
     *
     * C'est ce qui permet à l'ordinateur d'afficher « consulté en RA sur
     * mobile » sans que l'utilisateur ait à y toucher.
     */
    public function show(Request $request, ViewSession $session): JsonResponse
    {
        /** @var array<string, mixed> $viewer */
        $viewer = $request->attributes->get('viewer');

        $session->load(['events', 'learningObject', 'environment']);

        // Le jeton doit porter sur le contenu de CETTE session, quel que soit
        // le module dont elle relève (socle mutualisé, ADR-001).
        $slugSession = $session->module === 'labo-formation'
            ? $session->environment?->slug
            : $session->learningObject?->slug;

        abort_unless($slugSession === ($viewer['slug'] ?? null), 403);

        return response()->json([
            'sessionId' => $session->id,
            'enteredAr' => $session->entered_ar,
            'deviceType' => $session->device_type,
            'annotationsConsultees' => $session->annotationsConsultees(),
            'eventCount' => $session->events->count(),
            'cloturee' => $session->estCloturee(),
            'basculeUtilisee' => $session->handoffTokens()->whereNotNull('consumed_at')->exists(),
        ]);
    }

    /**
     * Étape 2.6 — Clôture la session et calcule sa durée.
     */
    public function update(ViewSession $session, XapiTracker $traceur, CompletionPolicy $completion): JsonResponse
    {
        if ($session->estCloturee()) {
            return response()->json([
                'message' => 'Session déjà clôturée.',
            ], 409);
        }

        $fin = now();

        $session->forceFill([
            'ended_at' => $fin,
            'duration_ms' => (int) $session->started_at->diffInMilliseconds($fin),
        ])->save();

        // Module « labo-formation » : la complétion ne se déduit pas des
        // annotations consultées mais des postes terminés et du score au quiz,
        // et elle vit dans `learner_progress` — pas dans la session. Le
        // vocabulaire xAPI diffère donc lui aussi, d'où un traceur distinct
        // (étape 9.4) sur un socle de stockage et d'envoi commun.
        if ($session->module === 'labo-formation') {
            $session->load(['events', 'environment.points']);

            $declarationsLabo = app(LabXapiTracker::class)->tracerCloture($session);

            return response()->json([
                'sessionId' => $session->id,
                'module' => $session->module,
                'durationMs' => $session->duration_ms,
                'postesTermines' => $session->postesTermines(),
                'eventCount' => $session->events->count(),
                'xapiStatements' => $declarationsLabo,
            ]);
        }

        $session->load(['events', 'learningObject.annotations']);

        // Étape 7.4 — la clôture est le moment où la séquence xAPI est émise.
        $complete = $completion->estComplete($session);
        $declarations = $traceur->tracerCloture($session);

        return response()->json([
            'sessionId' => $session->id,
            'durationMs' => $session->duration_ms,
            'enteredAr' => $session->entered_ar,
            'annotationsConsultees' => $session->annotationsConsultees(),
            'eventCount' => $session->events->count(),
            'completed' => $complete,
            'xapiStatements' => $declarations,
        ]);
    }
}
