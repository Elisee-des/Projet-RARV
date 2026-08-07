<?php

namespace App\Support\Xapi;

use App\Models\XapiStatement;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Pilote « http » — envoi vers un vrai LRS (Learning Locker, SCORM Cloud,
 * Veracity, Watershed…).
 *
 * L'en-tête `X-Experience-API-Version` est obligatoire : sans lui, tous les
 * LRS conformes rejettent la requête en 400, souvent sans message clair.
 */
class HttpLrs implements LrsClient
{
    public function envoyer(XapiStatement $declaration): bool
    {
        $endpoint = (string) config('rarv.lrs.endpoint');

        if ($endpoint === '') {
            $this->echouer($declaration, 'Aucun endpoint LRS configuré.');

            return false;
        }

        try {
            $reponse = Http::withBasicAuth(
                (string) config('rarv.lrs.username'),
                (string) config('rarv.lrs.password')
            )
                ->withHeaders([
                    'X-Experience-API-Version' => (string) config('rarv.lrs.version'),
                    'Content-Type' => 'application/json',
                ])
                ->timeout((int) config('rarv.lrs.timeout'))
                ->post(rtrim($endpoint, '/').'/statements', [$declaration->statement]);

            if ($reponse->successful()) {
                $declaration->forceFill([
                    'etat_envoi' => 'envoye',
                    'tentatives' => $declaration->tentatives + 1,
                    'envoye_at' => now(),
                    'derniere_erreur' => null,
                ])->save();

                return true;
            }

            $this->echouer($declaration, "HTTP {$reponse->status()} — ".$reponse->body());
        } catch (Throwable $erreur) {
            // Un LRS injoignable ne doit jamais interrompre une consultation :
            // la déclaration reste « en_attente » et sera rejouée.
            $this->echouer($declaration, $erreur->getMessage());
        }

        return false;
    }

    public function nom(): string
    {
        return 'http ('.(string) config('rarv.lrs.endpoint').')';
    }

    private function echouer(XapiStatement $declaration, string $message): void
    {
        $declaration->forceFill([
            'etat_envoi' => 'echec',
            'tentatives' => $declaration->tentatives + 1,
            'derniere_erreur' => mb_substr($message, 0, 1000),
        ])->save();
    }
}
