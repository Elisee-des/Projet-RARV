<?php

namespace App\Support;

/**
 * Étape 2.7 — Jeton viewer signé, à durée de vie courte.
 *
 * Format : base64url(charge utile JSON) . base64url(HMAC-SHA256)
 *
 * Choix assumé : signature HMAC maison plutôt qu'une bibliothèque JWT.
 * Le besoin se limite à « prouver que ce navigateur a été autorisé par le
 * LMS pour cet objet, jusqu'à telle heure ». Pas de chiffrement, pas de
 * rotation de clés, pas d'algorithme négociable — donc pas de dépendance,
 * et pas de surface d'attaque liée au champ `alg` des JWT.
 */
final class ViewerToken
{
    /**
     * @param  array<string, mixed>  $claims
     */
    public static function issue(array $claims, ?int $ttlMinutes = null): string
    {
        $ttl = $ttlMinutes ?? config('rarv.token_ttl');

        $payload = $claims + [
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes($ttl)->timestamp,
        ];

        $corps = self::encode((string) json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ));

        return $corps.'.'.self::encode(self::signature($corps));
    }

    /**
     * Retourne les revendications, ou null si le jeton est absent,
     * falsifié ou expiré.
     *
     * @return array<string, mixed>|null
     */
    public static function verify(?string $token): ?array
    {
        if ($token === null || ! str_contains($token, '.')) {
            return null;
        }

        [$corps, $signatureFournie] = explode('.', $token, 2);

        // hash_equals : comparaison à temps constant, contre les attaques
        // par mesure de temps sur la signature.
        if (! hash_equals(self::encode(self::signature($corps)), $signatureFournie)) {
            return null;
        }

        $claims = json_decode(self::decode($corps), true);

        if (! is_array($claims) || ! isset($claims['exp'])) {
            return null;
        }

        if ((int) $claims['exp'] < now()->timestamp) {
            return null;
        }

        return $claims;
    }

    private static function signature(string $donnees): string
    {
        return hash_hmac('sha256', $donnees, (string) config('app.key'), true);
    }

    private static function encode(string $brut): string
    {
        return rtrim(strtr(base64_encode($brut), '+/', '-_'), '=');
    }

    private static function decode(string $encode): string
    {
        return (string) base64_decode(strtr($encode, '-_', '+/'), true);
    }
}
