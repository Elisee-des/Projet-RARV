<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Étape 10.2 — En-têtes de sécurité des pages servies par Laravel.
 *
 * La politique de sécurité de contenu est le point délicat d'un projet 3D :
 * les décodeurs Draco et KTX2 s'exécutent dans des **workers créés depuis des
 * blob:**, et WebAssembly exige `wasm-unsafe-eval`. Une CSP écrite sans le
 * savoir casse l'affichage des modèles compressés — silencieusement, sans
 * autre trace qu'une erreur de console.
 *
 * C'est aussi ce qui justifie, depuis le Lot 3, de servir tous les décodeurs
 * en local : `default-src 'self'` interdit d'aller les chercher sur un CDN.
 */
class EnTetesSecurite
{
    public function handle(Request $request, Closure $next): Response
    {
        $reponse = $next($request);

        // Les réponses d'API n'ont pas besoin d'une CSP de document.
        if ($request->is('api/*')) {
            return $this->entetesCommuns($reponse);
        }

        $viewer = rtrim((string) config('rarv.viewer_url'), '/');
        $lab = rtrim((string) config('rarv.lab_url', ''), '/');

        $sources = array_filter([$viewer, $lab]);

        $politique = [
            "default-src 'self'",

            // 'unsafe-inline' : les pages Blade portent leurs styles et un
            // court script d'écoute des événements du composant. À remplacer
            // par des nonces si le projet grossit.
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
            "style-src 'self' 'unsafe-inline'",

            // blob: et data: — textures, décodeurs, images générées
            "img-src 'self' data: blob:",
            "worker-src 'self' blob:",
            "connect-src 'self' ".implode(' ', $sources),

            // Le viewer vit dans une iframe d'une autre origine
            'frame-src '.implode(' ', $sources ?: ["'none'"]),

            "font-src 'self' data:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
        ];

        $reponse->headers->set('Content-Security-Policy', implode('; ', $politique));

        return $this->entetesCommuns($reponse);
    }

    private function entetesCommuns(Response $reponse): Response
    {
        $reponse->headers->set('X-Content-Type-Options', 'nosniff');
        $reponse->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $reponse->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // La caméra n'est utile qu'au viewer, jamais aux pages Laravel.
        $reponse->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $reponse;
    }
}
