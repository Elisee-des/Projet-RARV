<?php

namespace App\Support;

use App\Models\Environment;
use App\Models\LearnerProgress;
use App\Support\Pdf\PdfSimple;

/**
 * Étape 7.6 — Attestation de réussite.
 *
 * > « Générer une attestation PDF est peu coûteux et transforme la perception
 * > du projet — on passe d'une démo technique à un dispositif de formation
 * > complet. »
 *
 * 🔒 **Elle n'est produite que sur des données relues en base.** Le score, la
 * liste des postes et la date de complétion ne viennent jamais du client :
 * c'est le sens de l'étape 10.9, et ce serait absurde autrement — une
 * attestation qu'on peut se délivrer soi-même ne vaut rien.
 */
final class Attestation
{
    public function __construct(private LabCompletion $completion) {}

    /**
     * Le PDF, en octets.
     */
    public function generer(LearnerProgress $progression): string
    {
        $environnement = $progression->environment->loadMissing('points');
        $meilleur = $this->completion->meilleurScore($environnement, $progression->user_ref);

        $pdf = new PdfSimple;

        $pdf->titre('Attestation de fin de formation')
            ->sousTitre(config('rarv.organisation'))
            ->espace(6)
            ->filet();

        $pdf->paragraphe(
            sprintf(
                'Il est attesté que %s a suivi et validé la formation suivante, '
                .'dans son intégralité et selon les conditions de réussite définies ci-dessous.',
                $progression->user_ref
            )
        );

        $pdf->section('Formation')
            ->definitions([
                'Intitulé' => $environnement->title,
                'Référence' => $environnement->slug,
                'Modalité' => 'Environnement 3D navigable, en autoformation',
            ]);

        $pdf->section('Résultats')
            ->definitions(array_filter([
                'Postes obligatoires validés' => sprintf(
                    '%d / %d',
                    count(array_intersect($progression->completes(), $environnement->codesRequis())),
                    count($environnement->codesRequis())
                ),
                'Progression globale' => $progression->completion_pct.' %',
                'Score au quiz d’évaluation' => $meilleur
                    ? sprintf('%d / %d  (%d %%)', $meilleur['score'], $meilleur['maxScore'], $meilleur['percentage'])
                    : null,
                'Seuil de réussite' => $this->seuil($environnement),
                'Temps passé' => $this->duree($progression->total_time_ms),
                'Date de validation' => $progression->completed_at?->format('d/m/Y à H\hi'),
            ]));

        $pdf->section('Postes validés')
            ->liste($this->libellesPostes($environnement, $progression->completes()));

        $pdf->espace(6)->filet();

        $pdf->petit(
            'Cette attestation est générée automatiquement à partir des résultats enregistrés '
            .'par la plateforme. Elle peut être vérifiée auprès de l’organisme au moyen du code '
            .'ci-dessous.'
        );

        $pdf->espace(4)
            ->definitions(['Code de vérification' => $this->codeVerification($progression)]);

        return $pdf->rendu();
    }

    /**
     * Code de vérification.
     *
     * Un HMAC de l'identité, de l'environnement et de la date de validation,
     * tronqué à 12 caractères groupés. Il ne protège pas contre la fabrication
     * d'un faux PDF — rien ne le peut — mais il permet à l'organisme de
     * confirmer qu'une attestation présentée correspond bien à un
     * enregistrement réel, sans exposer de base publique.
     */
    public function codeVerification(LearnerProgress $progression): string
    {
        $empreinte = hash_hmac(
            'sha256',
            implode('|', [
                $progression->user_ref,
                $progression->environment_id,
                $progression->completed_at?->timestamp ?? 0,
            ]),
            (string) config('app.key')
        );

        return implode('-', str_split(strtoupper(substr($empreinte, 0, 12)), 4));
    }

    public function nomFichier(LearnerProgress $progression): string
    {
        $reference = preg_replace('/[^A-Za-z0-9_-]+/', '-', $progression->user_ref) ?? 'apprenant';

        return sprintf('attestation-%s-%s.pdf', $progression->environment->slug, strtolower($reference));
    }

    private function seuil(Environment $environnement): string
    {
        $poste = $environnement->points->firstWhere('activity_type', 'quiz');

        return $poste?->quiz?->pass_score ? $poste->quiz->pass_score.' %' : 'sans quiz noté';
    }

    private function duree(int $millisecondes): string
    {
        $minutes = intdiv($millisecondes, 60_000);

        if ($minutes < 60) {
            return $minutes.' min';
        }

        return sprintf('%d h %02d', intdiv($minutes, 60), $minutes % 60);
    }

    /**
     * @param  list<string>  $codes
     * @return list<string>
     */
    private function libellesPostes(Environment $environnement, array $codes): array
    {
        return $environnement->points
            ->whereIn('code', $codes)
            ->map(fn ($poste) => sprintf(
                '%s%s',
                $poste->label,
                $poste->required ? '' : ' (facultatif)'
            ))
            ->values()
            ->all();
    }
}
