<?php

namespace App\Support\Xapi;

use App\Models\Attempt;
use App\Models\Environment;
use App\Models\InteractionPoint;
use App\Models\LearnerProgress;
use App\Models\ViewSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Étape 9.4 — Déclarations xAPI du module « labo-formation ».
 *
 * Le socle est mutualisé (ADR-001) : stockage, envoi au LRS, rejeu et
 * configuration sont ceux du module « viewer-ra ». Seul le **vocabulaire**
 * diffère, parce que les deux modules ne racontent pas la même chose.
 *
 * Séquence produite :
 *
 *   initialized   →  l'apprenant entre dans l'atelier
 *   experienced   →  une par poste terminé
 *   answered      →  une par question du quiz  ┐ émises à la soumission,
 *   scored        →  le résultat de l'évaluation ┘ pas à la clôture
 *   completed     →  le parcours satisfait la règle
 *   terminated    →  l'apprenant quitte
 *
 * ⚠️ `answered` et `scored` sont émises **au moment de la soumission**, et non
 * à la clôture de session comme le reste. Un quiz est un acte daté : différer
 * sa trace ferait perdre l'instant réel, et surtout la perdrait tout court si
 * l'apprenant fermait l'onglet sans clôturer proprement.
 */
class LabStatementBuilder
{
    public const VERBES = [
        'initialized' => 'http://adlnet.gov/expapi/verbs/initialized',
        'experienced' => 'http://adlnet.gov/expapi/verbs/experienced',
        'answered' => 'http://adlnet.gov/expapi/verbs/answered',
        'scored' => 'http://adlnet.gov/expapi/verbs/scored',
        'completed' => 'http://adlnet.gov/expapi/verbs/completed',
        'terminated' => 'http://adlnet.gov/expapi/verbs/terminated',
    ];

    private const LIBELLES = [
        'initialized' => 'a démarré',
        'experienced' => 'a consulté',
        'answered' => 'a répondu à',
        'scored' => 'a été évalué sur',
        'completed' => 'a terminé',
        'terminated' => 'a quitté',
    ];

    /** Types d'activité xAPI, par type de poste. */
    private const TYPES_ACTIVITE = [
        'panel' => 'http://adlnet.gov/expapi/activities/module',
        'video' => 'http://adlnet.gov/expapi/activities/media',
        'document' => 'http://adlnet.gov/expapi/activities/file',
        'quiz' => 'http://adlnet.gov/expapi/activities/assessment',
    ];

    /**
     * Séquence d'une session de parcours close.
     *
     * @return list<array<string, mixed>>
     */
    public function pourSession(ViewSession $session, ?LearnerProgress $progression, bool $complete): array
    {
        $session->loadMissing(['environment.points', 'events']);

        $environnement = $session->environment;

        if (! $environnement instanceof Environment) {
            return [];
        }

        $debut = $session->started_at;
        $fin = $session->ended_at ?? now();

        $declarations = [
            $this->declaration($session, 'initialized', $this->activiteEnvironnement($environnement), $debut),
        ];

        // Une déclaration par poste réellement mené à son terme, à son heure.
        foreach ($session->postesTermines() as $code) {
            $poste = $environnement->points->firstWhere('code', $code);

            if (! $poste instanceof InteractionPoint) {
                continue;
            }

            $moment = $session->events
                ->where('type', 'activity_completed')
                ->first(fn ($e) => data_get($e->payload, 'point_code') === $code)
                ?->occurred_at;

            $declarations[] = $this->declaration(
                $session,
                'experienced',
                $this->activitePoste($environnement, $poste),
                $moment ?? $fin,
                ['completion' => true],
                $environnement
            );
        }

        if ($complete && $progression !== null) {
            $declarations[] = $this->declaration(
                $session,
                'completed',
                $this->activiteEnvironnement($environnement),
                $progression->completed_at ?? $fin,
                [
                    'completion' => true,
                    'success' => true,
                    'duration' => $this->dureeIso($progression->total_time_ms),
                    'extensions' => [
                        $this->extension('progression-pct') => $progression->completion_pct,
                        $this->extension('postes-termines') => count($progression->completes()),
                    ],
                ]
            );
        }

        $declarations[] = $this->declaration(
            $session,
            'terminated',
            $this->activiteEnvironnement($environnement),
            $fin,
            ['duration' => $this->dureeIso($session->duration_ms)]
        );

        return $declarations;
    }

    /**
     * Déclarations d'une tentative de quiz soumise.
     *
     * @param  list<array<string, mixed>>  $resultats  sortie de QuizGrader
     * @return list<array<string, mixed>>
     */
    public function pourTentative(Attempt $tentative, array $resultats, ?ViewSession $session): array
    {
        $tentative->loadMissing('quiz');
        $quiz = $tentative->quiz;
        $moment = $tentative->submitted_at ?? now();

        $declarations = [];

        // 🔒 `response` porte les identifiants COCHÉS, jamais les identifiants
        // attendus. Une déclaration xAPI part vers un LRS tiers : y inscrire le
        // corrigé reviendrait à publier le barème (décision D5).
        foreach ($resultats as $resultat) {
            $declarations[] = $this->declaration(
                $session,
                'answered',
                [
                    'objectType' => 'Activity',
                    'id' => $this->iri("quizzes/{$quiz->id}/questions/{$resultat['questionId']}"),
                    'definition' => [
                        'type' => 'http://adlnet.gov/expapi/activities/cmi.interaction',
                        'name' => ['fr-FR' => Str::limit($resultat['statement'], 120)],
                    ],
                ],
                $moment,
                [
                    'success' => $resultat['correct'],
                    'score' => [
                        'raw' => $resultat['pointsEarned'],
                        'min' => 0,
                        'max' => $resultat['points'],
                    ],
                    'response' => implode(',', $resultat['chosenChoiceIds']),
                    'extensions' => array_filter([
                        $this->extension('poste-source') => $resultat['sourcePointCode'],
                        $this->extension('objectif') => $resultat['objectiveCode'],
                    ]),
                ],
                null,
                $tentative->user_ref
            );
        }

        $max = max(1, (int) $tentative->max_score);

        $declarations[] = $this->declaration(
            $session,
            'scored',
            [
                'objectType' => 'Activity',
                'id' => $this->iri("quizzes/{$quiz->id}"),
                'definition' => [
                    'type' => self::TYPES_ACTIVITE['quiz'],
                    'name' => ['fr-FR' => $quiz->title],
                ],
            ],
            $moment,
            [
                'success' => $tentative->passed,
                'completion' => true,
                'score' => [
                    'raw' => (int) $tentative->score,
                    'min' => 0,
                    'max' => (int) $tentative->max_score,
                    // `scaled` est le seul champ que tous les LRS savent
                    // agréger : c'est lui qui alimente les moyennes de cohorte.
                    'scaled' => round($tentative->score / $max, 4),
                ],
                'extensions' => [
                    $this->extension('tentative') => $tentative->attempt_number,
                    $this->extension('hors-delai') => (bool) $tentative->timed_out,
                    $this->extension('seuil-reussite') => $quiz->pass_score,
                ],
            ],
            null,
            $tentative->user_ref
        );

        return $declarations;
    }

    /**
     * @param  array<string, mixed>  $objet
     * @param  array<string, mixed>|null  $resultat
     * @return array<string, mixed>
     */
    private function declaration(
        ?ViewSession $session,
        string $verbe,
        array $objet,
        ?Carbon $moment,
        ?array $resultat = null,
        ?Environment $parent = null,
        ?string $userRef = null,
    ): array {
        $declaration = [
            'id' => (string) Str::uuid(),
            'actor' => $this->acteur($userRef ?? $session?->user_ref),
            'verb' => [
                'id' => self::VERBES[$verbe],
                'display' => ['fr-FR' => self::LIBELLES[$verbe]],
            ],
            'object' => $objet,
            'context' => $this->contexte($session, $parent),
            'timestamp' => ($moment ?? now())->toIso8601String(),
        ];

        if ($resultat !== null) {
            $declaration['result'] = $resultat;
        }

        return $declaration;
    }

    /**
     * Acteur identifié par compte, pas par courriel : un LMS fournit un
     * identifiant opaque, et rien n'oblige à faire circuler une adresse
     * personnelle vers un LRS tiers.
     *
     * @return array<string, mixed>
     */
    private function acteur(?string $userRef): array
    {
        return [
            'objectType' => 'Agent',
            'account' => [
                'homePage' => (string) config('rarv.xapi_homepage'),
                'name' => $userRef ?? 'anonyme',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function activiteEnvironnement(Environment $environnement): array
    {
        return [
            'objectType' => 'Activity',
            'id' => $this->iri("environments/{$environnement->slug}"),
            'definition' => [
                'type' => 'http://adlnet.gov/expapi/activities/simulation',
                'name' => ['fr-FR' => $environnement->title],
                'description' => ['fr-FR' => (string) $environnement->description],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function activitePoste(Environment $environnement, InteractionPoint $poste): array
    {
        return [
            'objectType' => 'Activity',
            'id' => $this->iri("environments/{$environnement->slug}/points/{$poste->code}"),
            'definition' => [
                'type' => self::TYPES_ACTIVITE[$poste->activity_type] ?? self::TYPES_ACTIVITE['panel'],
                'name' => ['fr-FR' => $poste->label],
                'extensions' => [
                    $this->extension('poste-requis') => (bool) $poste->required,
                    $this->extension('type-activite') => $poste->activity_type,
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function contexte(?ViewSession $session, ?Environment $parent): array
    {
        $contexte = [
            'platform' => 'RARV — laboratoire de formation 3D',
            'language' => 'fr-FR',
        ];

        if ($session !== null) {
            // Le `registration` recoud la séquence côté LRS, y compris quand
            // plusieurs appareils alimentent la même session.
            $contexte['registration'] = $session->id;
            $contexte['extensions'] = [
                $this->extension('device-type') => $session->device_type,
                $this->extension('lms-context') => $session->lms_context,
                $this->extension('module') => $session->module,
            ];
        }

        // Rattacher un poste à son environnement permet au LRS d'agréger par
        // module de formation plutôt que par activité isolée.
        if ($parent !== null) {
            $contexte['contextActivities'] = ['parent' => [$this->activiteEnvironnement($parent)]];
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

        return sprintf(
            'PT%dH%dM%dS',
            intdiv($secondes, 3600),
            intdiv($secondes % 3600, 60),
            $secondes % 60
        );
    }
}
