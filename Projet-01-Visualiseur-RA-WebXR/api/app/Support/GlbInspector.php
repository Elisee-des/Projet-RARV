<?php

namespace App\Support;

use RuntimeException;

/**
 * Étape 8.3 — Inspection d'un fichier .glb à l'upload.
 *
 * Lit l'en-tête du conteneur GLB et sa charge utile JSON pour compter les
 * triangles SANS charger la géométrie. C'est ce qui permet de refuser un
 * modèle hors budget avant qu'il n'atteigne un apprenant sur téléphone :
 * un formateur n'a aucun moyen de savoir qu'un fichier de 40 Mo rendra le
 * module inutilisable en 4G, c'est au système de le lui dire.
 *
 * Référence : spécification glTF 2.0, chapitre « GLB File Format ».
 */
class GlbInspector
{
    private const MAGIC_GLTF = 0x46546C67; // « glTF »

    private const CHUNK_JSON = 0x4E4F534A; // « JSON »

    /** Mode de primitive « TRIANGLES » — le seul qui produise des triangles pleins. */
    private const MODE_TRIANGLES = 4;

    /**
     * @return array{
     *     triangles: int, meshes: int, materials: int, textures: int,
     *     nodes: int, sizeKb: int, generator: ?string, pieces: list<string>
     * }
     */
    public function inspecter(string $chemin): array
    {
        $taille = @filesize($chemin);

        if ($taille === false || $taille < 20) {
            throw new RuntimeException('Fichier illisible ou trop court pour être un .glb.');
        }

        $fichier = @fopen($chemin, 'rb');

        if ($fichier === false) {
            throw new RuntimeException('Impossible d\'ouvrir le fichier.');
        }

        try {
            $entete = unpack('Vmagic/Vversion/Vlongueur', (string) fread($fichier, 12));

            if (($entete['magic'] ?? 0) !== self::MAGIC_GLTF) {
                throw new RuntimeException('Ce fichier n\'est pas un glTF binaire (.glb).');
            }

            if (($entete['version'] ?? 0) !== 2) {
                throw new RuntimeException("Version glTF {$entete['version']} non prise en charge — seule la 2.0 l'est.");
            }

            if ($entete['longueur'] !== $taille) {
                throw new RuntimeException('Fichier tronqué : la longueur déclarée ne correspond pas.');
            }

            $chunk = unpack('Vlongueur/Vtype', (string) fread($fichier, 8));

            if (($chunk['type'] ?? 0) !== self::CHUNK_JSON) {
                throw new RuntimeException('Le premier bloc du .glb devrait être du JSON.');
            }

            $json = (string) fread($fichier, (int) $chunk['longueur']);
        } finally {
            fclose($fichier);
        }

        $gltf = json_decode($json, true);

        if (! is_array($gltf)) {
            throw new RuntimeException('Description glTF illisible.');
        }

        return [
            'triangles' => $this->compterTriangles($gltf),
            'meshes' => count($gltf['meshes'] ?? []),
            'materials' => count($gltf['materials'] ?? []),
            'textures' => count($gltf['textures'] ?? []),
            'nodes' => count($gltf['nodes'] ?? []),
            'sizeKb' => (int) ceil($taille / 1024),
            'generator' => $gltf['asset']['generator'] ?? null,
            'pieces' => $this->nomsDesPieces($gltf),
        ];
    }

    /**
     * @param  array<string, mixed>  $gltf
     */
    private function compterTriangles(array $gltf): int
    {
        $accesseurs = $gltf['accessors'] ?? [];
        $total = 0;

        foreach ($gltf['meshes'] ?? [] as $mesh) {
            foreach ($mesh['primitives'] ?? [] as $primitive) {
                // Le mode par défaut est TRIANGLES quand il n'est pas déclaré.
                if (($primitive['mode'] ?? self::MODE_TRIANGLES) !== self::MODE_TRIANGLES) {
                    continue;
                }

                // Géométrie indexée : le nombre d'indices donne les sommets
                // dessinés. Sinon, on retombe sur le nombre de positions.
                $indice = $primitive['indices']
                    ?? ($primitive['attributes']['POSITION'] ?? null);

                if ($indice === null) {
                    continue;
                }

                $total += intdiv((int) ($accesseurs[$indice]['count'] ?? 0), 3);
            }
        }

        return $total;
    }

    /**
     * Noms des maillages — sert à vérifier que l'objet est bien découpé en
     * pièces distinctes. Un modèle d'une seule pièce ne peut pas porter
     * d'annotations utiles.
     *
     * @param  array<string, mixed>  $gltf
     * @return list<string>
     */
    private function nomsDesPieces(array $gltf): array
    {
        $noms = [];

        foreach ($gltf['meshes'] ?? [] as $index => $mesh) {
            $noms[] = (string) ($mesh['name'] ?? "maillage-{$index}");
        }

        return $noms;
    }
}
