<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSessionEventsRequest;
use App\Models\SessionEvent;
use App\Models\ViewSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class SessionEventController extends Controller
{
    /**
     * Étape 2.5 — Enregistre un lot d'événements.
     *
     * Le viewer tamponne côté client puis envoie groupé : pendant une session
     * RA, un appel réseau par interaction saturerait l'API et l'appareil.
     */
    public function store(StoreSessionEventsRequest $request, ViewSession $session): JsonResponse
    {
        if ($session->estCloturee()) {
            return response()->json([
                'message' => 'Session clôturée, événements refusés.',
            ], 409);
        }

        $evenements = $request->validated('events');
        $maintenant = now();

        $lignes = array_map(fn (array $e) => [
            'view_session_id' => $session->id,
            'type' => $e['type'],
            'payload' => isset($e['payload']) ? json_encode($e['payload']) : null,
            'occurred_at' => isset($e['occurredAt'])
                ? Carbon::parse($e['occurredAt'])
                : $maintenant,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ], $evenements);

        SessionEvent::insert($lignes);

        // Le passage en RA est dérivé des événements, jamais déclaré par le client.
        $entreEnRa = in_array('ar_entered', array_column($evenements, 'type'), true);

        if ($entreEnRa && ! $session->entered_ar) {
            $session->forceFill(['entered_ar' => true])->save();
        }

        return response()->json([
            'accepted' => count($lignes),
            'enteredAr' => $session->entered_ar,
        ], 201);
    }
}
