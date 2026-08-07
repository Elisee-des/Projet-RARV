<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\XapiStatement;
use App\Support\Pseudonyme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Étape 9.5 — Consultation du LRS local.
 *
 * Le pilote `local` conserve les déclarations en base et les rend consultables
 * ici. Le pilote `http` les envoie en plus vers un vrai LRS — Learning Locker,
 * SCORM Cloud, Veracity — **au même format** : seul le transport change
 * (`RARV_LRS_DRIVER`).
 *
 * Cet écran n'est donc pas un substitut au LRS : c'est la preuve que les
 * déclarations émises sont bien formées et complètes, consultable sans monter
 * un conteneur Docker. C'est aussi ce qu'on montre en entretien, où personne
 * n'a envie d'attendre le démarrage de Learning Locker.
 */
class XapiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $declarations = XapiStatement::query()
            ->latest('created_at')
            ->limit(min(200, max(1, (int) $request->query('limit', 60))))
            ->get();

        return response()->json([
            'driver' => config('rarv.lrs.driver'),
            'endpoint' => config('rarv.lrs.driver') === 'http' ? config('rarv.lrs.endpoint') : null,
            'iri' => config('rarv.xapi_iri'),
            'pseudonymise' => Pseudonyme::actif(),

            'total' => XapiStatement::count(),
            'parVerbe' => XapiStatement::query()
                ->selectRaw('verb, COUNT(*) as total')
                ->groupBy('verb')
                ->pluck('total', 'verb'),

            'statements' => $declarations->map(fn (XapiStatement $d) => [
                'id' => $d->id,
                'verb' => $d->verb,
                'verbCourt' => basename((string) $d->verb),
                'objectIri' => $d->object_iri,
                'acteur' => Pseudonyme::filtrer($d->actor_ref),
                'etat' => $d->etat_envoi,
                'emiseA' => $d->created_at?->toIso8601String(),
                'statement' => $this->assainir($d->statement),
            ]),
        ]);
    }

    /**
     * Remplace l'identité réelle dans la déclaration elle-même.
     *
     * ⚠️ La pseudonymisation doit porter sur le CORPS de la déclaration, pas
     * seulement sur la colonne indexée : c'est le corps qui est affiché en
     * clair dans l'inspecteur JSON de la page de traçabilité, et c'est lui
     * qu'un visiteur lira.
     *
     * @param  array<string, mixed>|null  $declaration
     * @return array<string, mixed>|null
     */
    private function assainir(?array $declaration): ?array
    {
        if ($declaration === null || ! Pseudonyme::actif()) {
            return $declaration;
        }

        if (isset($declaration['actor']['account']['name'])) {
            $declaration['actor']['account']['name'] = Pseudonyme::pour(
                (string) $declaration['actor']['account']['name']
            );
        }

        return $declaration;
    }
}
