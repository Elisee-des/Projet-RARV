<?php

namespace App\Support\Xapi;

use App\Models\Annotation;
use App\Models\ViewSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Étape 7.4 — Construction des déclarations xAPI.
 *
 * Une session de consultation produit une séquence conforme au profil usuel :
 *
 *   initialized  →  interacted (une par annotation ouverte)
 *                →  experienced (l'objet, avec sa durée)
 *                →  completed (si la règle de complétion est satisfaite)
 *                →  terminated
 *
 * Le `registration` porte l'identifiant de session : c'est lui qui permet au
 * LRS de recoudre la séquence, y compris quand deux appareils l'alimentent
 * (bascule desktop → mobile du Lot 6).
 */
class StatementBuilder
{
    public const VERBES = [
        'initialized' => 'http://adlnet.gov/expapi/verbs/initialized',
        'interacted' => 'http://adlnet.gov/expapi/verbs/interacted',
        'experienced' => 'http://adlnet.gov/expapi/verbs/experienced',
        'completed' => 'http://adlnet.gov/expapi/verbs/completed',
        'terminated' => 'http://adlnet.gov/expapi/verbs/terminated',
    ];

    private const LIBELLES_VERBES = [
        'initialized' => 'a démarré',
        'interacted' => 'a interagi avec',
        'experienced' => 'a consulté',
        'completed' => 'a terminé',
        'terminated' => 'a quitté',
    ];

    /**
     * Séquence complète pour une session close.
     *
     * @return list<array<string, mixed>>
     */
    public function pourSession(ViewSession $session, bool $complete): array
    {
        $session->loadMissing(['learningObject.annotations', 'events']);

        $objet = $session->learningObject;
        $debut = $session->started_at;
        $fin = $session->ended_at ?? now();

        $declarations = [];

        $declarations[] = $this->declaration(
            $session,
            'initialized',
            $this->activiteObjet($session),
            $debut
        );

        // Une déclaration par annotation réellement ouverte, dans l'ordre.
        $idsConsultes = $session->annotationsConsultees();

        foreach ($idsConsultes as $idAnnotation) {
            $annotation = $objet->annotations->firstWhere('id', $idAnnotation);
            if (! $annotation instanceof Annotation) {
                continue;
            }

            $moment = $session->events
                ->where('type', 'annotation_opened')
                ->first(fn ($e) => (int) data_get($e->payload, 'annotation_id') === (int) $idAnnotation)
                ?->occurred_at;

            $declarations[] = $this->declaration(
                $session,
                'interacted',
                $this->activiteAnnotation($session, $annotation),
                $moment ?? $fin
            );
        }

        $declarations[] = $this->declaration(
            $session,
            'experienced',
            $this->activiteObjet($session),
            $fin,
            [
                'duration' => $this->dureeIso($session->duration_ms),
                'extensions' => [
                    $this->extension('annotations-consultees') => count($idsConsultes),
                    $this->extension('annotations-total') => $objet->annotations->count(),
                ],
            ]
        );

        if ($complete) {
            $declarations[] = $this->declaration(
                $session,
                'completed',
                $this->activiteObjet($session),
                $fin,
                [
                    'completion' => true,
                    'success' => true,
                    'duration' => $this->dureeIso($session->duration_ms),
                ]
            );
        }

        $declarations[] = $this->declaration(
            $session,
            'terminated',
            $this->activiteObjet($session),
            $fin,
            ['duration' => $this->dureeIso($session->duration_ms)]
        );

        return $declarations;
    }

    /**
     * @param  array<string, mixed>  $objet
     * @param  array<string, mixed>|null  $resultat
     * @return array<string, mixed>
     */
    private function declaration(
        ViewSession $session,
        string $verbe,
        array $objet,
        ?Carbon $moment,
        ?array $resultat = null
    ): array {
        $declaration = [
            'id' => (string) Str::uuid(),
            'actor' => $this->acteur($session),
            'verb' => [
                'id' => self::VERBES[$verbe],
                'display' => ['fr-FR' => self::LIBELLES_VERBES[$verbe]],
            ],
            'object' => $objet,
            'context' => $this->contexte($session, $objet),
            'timestamp' => ($moment ?? now())->toIso8601String(),
        ];

        if ($resultat !== null) {
            $declaration['result'] = $resultat;
        }

        return $declaration;
    }

    /**
     * Acteur identifié par compte plutôt que par courriel : un LMS fournit un
     * identifiant opaque, et rien n'oblige à faire circuler une adresse
     * personnelle pour tracer une consultation.
     *
     * @return array<string, mixed>
     */
    private function acteur(ViewSession $session): array
    {
        return [
            'objectType' => 'Agent',
            'account' => [
                'homePage' => (string) config('rarv.xapi_homepage'),
                'name' => $session->user_ref ?? 'anonyme',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function activiteObjet(ViewSession $session): array
    {
        $objet = $session->learningObject;

        return [
            'objectType' => 'Activity',
            'id' => $this->iri("objects/{$objet->slug}"),
            'definition' => [
                'type' => 'http://adlnet.gov/expapi/activities/simulation',
                'name' => ['fr-FR' => $objet->title],
                'description' => ['fr-FR' => (string) $objet->description],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function activiteAnnotation(ViewSession $session, Annotation $annotation): array
    {
        $objet = $session->learningObject;

        return [
            'objectType' => 'Activity',
            'id' => $this->iri("objects/{$objet->slug}/annotations/{$annotation->id}"),
            'definition' => [
                'type' => 'http://adlnet.gov/expapi/activities/interaction',
                'name' => ['fr-FR' => $annotation->title],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $objet
     * @return array<string, mixed>
     */
    private function contexte(ViewSession $session, array $objet): array
    {
        $contexte = [
            'registration' => $session->id,
            'platform' => 'RARV — visualiseur RA',
            'language' => 'fr-FR',
            'extensions' => [
                $this->extension('device-type') => $session->device_type,
                $this->extension('xr-supported') => (bool) $session->xr_supported,
                $this->extension('entered-ar') => (bool) $session->entered_ar,
                $this->extension('lms-context') => $session->lms_context,
            ],
        ];

        // Une annotation est rattachée à son objet parent : le LRS peut ainsi
        // agréger les interactions par module de formation.
        if ($objet['id'] !== $this->iri("objects/{$session->learningObject->slug}")) {
            $contexte['contextActivities'] = [
                'parent' => [$this->activiteObjet($session)],
            ];
        }

        return $contexte;
    }

    private function iri(string $chemin): string
    {
        return config('rarv.xapi_iri').'/'.ltrim($chemin, '/');
    }

    private function extension(string $nom): string
    {
        return $this->iri("extensions/{$nom}");
    }

    /** Durée au format ISO 8601, tel qu'exigé par la spécification xAPI. */
    private function dureeIso(?int $millisecondes): string
    {
        $secondes = max(0, (int) round(($millisecondes ?? 0) / 1000));

        $heures = intdiv($secondes, 3600);
        $minutes = intdiv($secondes % 3600, 60);
        $reste = $secondes % 60;

        return sprintf('PT%dH%dM%dS', $heures, $minutes, $reste);
    }
}
