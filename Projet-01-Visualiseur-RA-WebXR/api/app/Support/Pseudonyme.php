<?php

namespace App\Support;

/**
 * Pseudonymisation des identifiants d'apprenant en mode démonstration.
 *
 * Le mode démonstration (étape 11.5) ouvre le tableau de bord formateur et le
 * journal xAPI sans authentification, pour qu'un recruteur puisse tout
 * parcourir en un clic. Ces écrans exposent des scores et des identifiants
 * d'apprenants : les livrer en clair sur une URL publique serait indéfendable,
 * quand bien même les données sont fictives — un jour elles ne le seront plus.
 *
 * Un HMAC tronqué donne un pseudonyme **stable** — le même apprenant garde le
 * même libellé d'un écran à l'autre, donc les agrégats restent lisibles — et
 * **non réversible**, puisqu'il dépend de la clé de l'application.
 */
final class Pseudonyme
{
    public static function actif(): bool
    {
        return (bool) config('rarv.demo_public');
    }

    /** Renvoie le pseudonyme si le mode démonstration est actif, sinon la valeur d'origine. */
    public static function filtrer(?string $userRef): string
    {
        $reel = $userRef ?? 'anonyme';

        if (! self::actif()) {
            return $reel;
        }

        return self::pour($reel);
    }

    public static function pour(string $userRef): string
    {
        $empreinte = hash_hmac('sha256', $userRef, (string) config('app.key'));

        return 'Apprenant #'.strtoupper(substr($empreinte, 0, 4));
    }
}
