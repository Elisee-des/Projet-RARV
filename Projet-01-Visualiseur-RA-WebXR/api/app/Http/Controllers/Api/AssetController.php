<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningObject;
use App\Support\ViewerToken;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Étape 2.9 — Service des assets 3D.
 *
 * Deux pièges traités ici :
 *
 * 1. Le TYPE MIME. Un .glb servi en application/octet-stream ou en text/html
 *    échoue silencieusement dans Three.js : aucune erreur explicite, juste un
 *    modèle qui n'apparaît pas. C'est la première chose à vérifier dans
 *    l'onglet Réseau quand « rien ne s'affiche ».
 *
 * 2. Le CACHE. Les assets 3D pèsent des mégaoctets. Ils sont immuables (le nom
 *    de fichier change à chaque version), donc mis en cache un an.
 */
class AssetController extends Controller
{
    /** Types MIME officiels — surtout pas application/octet-stream. */
    private const MIMES = [
        'glb' => 'model/gltf-binary',
        'gltf' => 'model/gltf+json',
        'usdz' => 'model/vnd.usdz+zip',
        'webp' => 'image/webp',
        'jpg' => 'image/jpeg',
        'png' => 'image/png',
        'svg' => 'image/svg+xml',
        'bin' => 'application/octet-stream',
    ];

    public function show(Request $request, string $slug, string $fichier): BinaryFileResponse
    {
        $objet = LearningObject::query()->where('slug', $slug)->firstOrFail();

        // Un objet non publié n'est servi qu'à l'éditeur du back-office
        // (étape 8.4), jamais à un apprenant. Le jeton est signé DANS l'URL,
        // sans quoi la signature ne couvrirait pas ce paramètre.
        if ($objet->status !== 'published') {
            $claims = ViewerToken::verify((string) $request->query('t'));

            abort_unless(
                $claims !== null
                    && ($claims['scope'] ?? null) === 'edit'
                    && ($claims['slug'] ?? null) === $slug,
                404
            );
        }

        // Liste blanche : seuls les fichiers DÉCLARÉS par l'objet sont servis.
        // Interdit toute traversée de répertoire, quelle que soit l'entrée.
        $declares = array_filter([
            $objet->glb_path,
            $objet->usdz_path,
            $objet->poster_path,
        ]);

        $cible = null;

        foreach ($declares as $chemin) {
            if (basename($chemin) === $fichier) {
                $cible = $chemin;
                break;
            }
        }

        abort_if($cible === null, 404, 'Asset non déclaré pour cet objet.');

        $absolu = storage_path('app/assets3d/'.$cible);

        abort_unless(is_file($absolu), 404, 'Fichier absent du stockage.');

        $extension = strtolower(pathinfo($fichier, PATHINFO_EXTENSION));

        return response()->file($absolu, [
            'Content-Type' => self::MIMES[$extension] ?? 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin' => '*',
            'Cross-Origin-Resource-Policy' => 'cross-origin',
        ]);
    }
}
