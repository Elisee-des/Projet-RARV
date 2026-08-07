<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Environment;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Service des assets d'un environnement : scène, mesh de collision, lightmaps,
 * vidéos, sous-titres, documents.
 *
 * Même posture que l'AssetController du module « viewer-ra » :
 *
 * 1. TYPE MIME correct. Un `.glb` servi en `application/octet-stream` échoue
 *    silencieusement dans Three.js — pas d'erreur, juste une scène vide.
 * 2. CACHE d'un an. Les assets sont immuables : le nom de fichier change à
 *    chaque version.
 * 3. LISTE BLANCHE. Seuls les fichiers déclarés par l'environnement ou par un
 *    de ses postes sont servis. Aucune traversée de répertoire n'est possible,
 *    quelle que soit l'entrée.
 */
class EnvironmentAssetController extends Controller
{
    private const MIMES = [
        'glb' => 'model/gltf-binary',
        'gltf' => 'model/gltf+json',
        'bin' => 'application/octet-stream',
        'ktx2' => 'image/ktx2',
        'webp' => 'image/webp',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'vtt' => 'text/vtt',
        'pdf' => 'application/pdf',
        'mp3' => 'audio/mpeg',
        'ogg' => 'audio/ogg',
    ];

    public function show(string $slug, string $fichier): BinaryFileResponse
    {
        $environnement = Environment::query()
            ->published()
            ->where('slug', $slug)
            ->with('points')
            ->firstOrFail();

        $cible = $this->chercherDansListeBlanche($environnement, $fichier);

        abort_if($cible === null, 404, 'Asset non déclaré pour cet environnement.');

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

    /**
     * Tous les chemins qu'un environnement a le droit de servir : les siens,
     * plus ceux portés par les activités de ses postes.
     */
    private function chercherDansListeBlanche(Environment $environnement, string $fichier): ?string
    {
        $declares = array_filter([
            $environnement->scene_glb_path,
            $environnement->collision_glb_path,
            ...($environnement->lightmap_paths ?? []),
        ]);

        foreach ($environnement->points as $point) {
            foreach (['src', 'poster', 'captions', 'file'] as $champ) {
                $chemin = $point->activity_payload[$champ] ?? null;

                if (is_string($chemin) && $chemin !== '') {
                    $declares[] = $chemin;
                }
            }
        }

        foreach ($declares as $chemin) {
            if (basename($chemin) === $fichier) {
                return $chemin;
            }
        }

        return null;
    }
}
