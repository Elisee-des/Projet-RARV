<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Annotation;
use App\Models\LearningObject;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

/**
 * Étapes 8.4 et 8.5 — API de l'éditeur visuel d'annotations.
 *
 * Le formateur clique sur une pièce du modèle ; le front effectue un raycast
 * et envoie ici la position en ESPACE LOCAL du modèle, accompagnée de la
 * normale à la surface. C'est le point délicat du lot : une position en
 * espace monde ferait décrocher les pastilles dès que l'objet tourne — donc
 * systématiquement en réalité augmentée.
 */
class AnnotationEditorController extends Controller
{
    /** Fiche de l'objet pour l'éditeur — brouillons compris. */
    public function objet(Request $request, string $slug): JsonResponse
    {
        $objet = LearningObject::with('annotations')->where('slug', $slug)->firstOrFail();
        $jeton = (string) ($request->bearerToken() ?? $request->query('t'));

        return response()->json([
            'slug' => $objet->slug,
            'title' => $objet->title,
            'status' => $objet->status,
            'placement' => [
                'scale' => $objet->default_scale,
                'upAxis' => $objet->up_axis,
                'recommended' => $objet->recommended_placement,
            ],
            'perf' => [
                'triangles' => $objet->triangles,
                'fileSizeKb' => $objet->file_size_kb,
            ],
            'assets' => [
                'glb' => $this->urlAsset($objet, $objet->glb_path, $jeton),
                'usdz' => $this->urlAsset($objet, $objet->usdz_path, $jeton),
                'poster' => $this->urlAsset($objet, $objet->poster_path, $jeton),
            ],
            'annotations' => $objet->annotations->map(fn (Annotation $a) => $this->presenter($a))->all(),
        ]);
    }

    public function index(string $slug): JsonResponse
    {
        $objet = LearningObject::with('annotations')->where('slug', $slug)->firstOrFail();

        return response()->json([
            'annotations' => $objet->annotations->map(fn (Annotation $a) => $this->presenter($a))->all(),
        ]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $objet = LearningObject::where('slug', $slug)->firstOrFail();

        $donnees = $this->valider($request);

        $annotation = $objet->annotations()->create($donnees + [
            'sort_order' => (int) $objet->annotations()->max('sort_order') + 1,
        ]);

        return response()->json(['annotation' => $this->presenter($annotation)], 201);
    }

    public function update(Request $request, string $slug, Annotation $annotation): JsonResponse
    {
        $this->verifierAppartenance($slug, $annotation);

        $annotation->update($this->valider($request, partiel: true));

        return response()->json(['annotation' => $this->presenter($annotation->fresh())]);
    }

    public function destroy(string $slug, Annotation $annotation): JsonResponse
    {
        $this->verifierAppartenance($slug, $annotation);

        $annotation->delete();

        return response()->json(null, 204);
    }

    /**
     * Étape 8.5 — Réordonnancement.
     *
     * Le front envoie la liste complète des identifiants dans le nouvel
     * ordre. Une transaction évite tout état intermédiaire incohérent.
     */
    public function reordonner(Request $request, string $slug): JsonResponse
    {
        $objet = LearningObject::with('annotations')->where('slug', $slug)->firstOrFail();

        $donnees = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer'],
        ]);

        $connus = $objet->annotations->pluck('id')->all();

        // La liste doit correspondre exactement aux annotations de l'objet :
        // ni oubli, ni intrus, ni doublon.
        if (array_diff($donnees['ids'], $connus) !== [] || count($donnees['ids']) !== count($connus)) {
            return response()->json([
                'message' => 'La liste ne correspond pas aux annotations de cet objet.',
            ], 422);
        }

        DB::transaction(function () use ($donnees) {
            foreach ($donnees['ids'] as $rang => $id) {
                Annotation::where('id', $id)->update(['sort_order' => $rang + 1]);
            }
        });

        return response()->json([
            'annotations' => $objet->annotations()->get()->map(fn (Annotation $a) => $this->presenter($a))->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function valider(Request $request, bool $partiel = false): array
    {
        $requis = $partiel ? 'sometimes' : 'required';

        $valide = $request->validate([
            'label' => [$requis, 'string', 'max:120'],
            'title' => [$requis, 'string', 'max:255'],
            'bodyHtml' => [$requis, 'string', 'max:20000'],
            'position' => [$requis, 'array', 'size:3'],
            'position.*' => ['required', 'numeric'],
            'normal' => ['nullable', 'array', 'size:3'],
            'normal.*' => ['required', 'numeric'],
            'mediaUrl' => ['nullable', 'url', 'max:500'],
            'docUrl' => ['nullable', 'url', 'max:500'],
            'sortOrder' => ['sometimes', 'integer', 'min:1'],
        ]);

        $donnees = [];

        foreach (['label', 'title'] as $champ) {
            if (array_key_exists($champ, $valide)) {
                $donnees[$champ] = $valide[$champ];
            }
        }

        if (array_key_exists('bodyHtml', $valide)) {
            // Étape 9.8 — purification à l'ÉCRITURE. C'est ici que le contenu
            // entre dans le système : le nettoyer plus tard reviendrait à
            // servir du HTML douteux à tous les apprenants entre-temps.
            $donnees['body_html'] = app(HtmlSanitizer::class)->purifier($valide['bodyHtml']);
        }

        if (array_key_exists('position', $valide)) {
            [$donnees['position_x'], $donnees['position_y'], $donnees['position_z']] =
                array_map('floatval', $valide['position']);
        }

        if (array_key_exists('normal', $valide)) {
            $normale = $valide['normal'];
            [$donnees['normal_x'], $donnees['normal_y'], $donnees['normal_z']] =
                $normale === null ? [null, null, null] : array_map('floatval', $normale);
        }

        foreach (['mediaUrl' => 'media_url', 'docUrl' => 'doc_url'] as $entree => $colonne) {
            if (array_key_exists($entree, $valide)) {
                $donnees[$colonne] = $valide[$entree];
            }
        }

        if (array_key_exists('sortOrder', $valide)) {
            $donnees['sort_order'] = $valide['sortOrder'];
        }

        return $donnees;
    }

    private function verifierAppartenance(string $slug, Annotation $annotation): void
    {
        abort_unless(
            $annotation->learningObject->slug === $slug,
            404,
            'Cette annotation appartient à un autre objet.'
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function presenter(Annotation $annotation): array
    {
        return [
            'id' => $annotation->id,
            'order' => $annotation->sort_order,
            'label' => $annotation->label,
            'title' => $annotation->title,
            'bodyHtml' => $annotation->body_html,
            'position' => $annotation->position(),
            'normal' => $annotation->normal(),
            'mediaUrl' => $annotation->media_url,
            'docUrl' => $annotation->doc_url,
        ];
    }

    /**
     * URL signée incluant le jeton d'édition.
     *
     * Le jeton doit être signé AVEC l'URL : l'ajouter après coup invaliderait
     * la signature. C'est ce qui permet à l'éditeur de charger le .glb d'un
     * objet encore en brouillon.
     */
    private function urlAsset(LearningObject $objet, ?string $chemin, string $jeton): ?string
    {
        if ($chemin === null) {
            return null;
        }

        return URL::signedRoute('assets.show', [
            'slug' => $objet->slug,
            'fichier' => basename($chemin),
            't' => $jeton,
        ]);
    }
}
