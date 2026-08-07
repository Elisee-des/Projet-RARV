<?php

namespace App\Support;

use App\Models\ViewSession;

/**
 * Étape 7.6 — Règle de complétion, configurable.
 *
 * Un formateur n'a pas la même exigence pour une fiche de rappel de 30 s et
 * pour un module de sécurité : la règle se change par variable
 * d'environnement, sans toucher au code.
 */
class CompletionPolicy
{
    public function estComplete(ViewSession $session): bool
    {
        $session->loadMissing(['learningObject.annotations', 'events']);

        return match ((string) config('rarv.completion.mode')) {
            'min_duration' => $this->dureeAtteinte($session),
            'both' => $this->toutesAnnotationsVues($session) && $this->dureeAtteinte($session),
            default => $this->toutesAnnotationsVues($session),
        };
    }

    public function toutesAnnotationsVues(ViewSession $session): bool
    {
        $total = $session->learningObject->annotations->count();

        if ($total === 0) {
            return false;
        }

        return count($session->annotationsConsultees()) >= $total;
    }

    public function dureeAtteinte(ViewSession $session): bool
    {
        $seuilMs = (int) config('rarv.completion.min_duration_s') * 1000;

        return ($session->duration_ms ?? 0) >= $seuilMs;
    }

    /** Description lisible, affichée dans le tableau de bord. */
    public function description(): string
    {
        $duree = (int) config('rarv.completion.min_duration_s');

        return match ((string) config('rarv.completion.mode')) {
            'min_duration' => "au moins {$duree} s de consultation",
            'both' => "toutes les annotations consultées ET au moins {$duree} s",
            default => 'toutes les annotations consultées',
        };
    }
}
