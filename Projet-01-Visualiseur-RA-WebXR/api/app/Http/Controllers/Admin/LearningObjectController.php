<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveLearningObjectRequest;
use App\Models\LearningObject;
use App\Support\GlbInspector;
use App\Support\ViewerToken;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use RuntimeException;

/**
 * Étapes 8.2, 8.3 et 8.6 — Administration des objets pédagogiques.
 *
 * L'enjeu du lot : prouver qu'un formateur crée un objet annoté SANS
 * développeur. Tant que le contenu vit dans un seeder, le projet reste une
 * démonstration ; à partir d'ici, c'est un outil.
 */
class LearningObjectController extends Controller
{
    public function __construct(private readonly GlbInspector $inspecteur) {}

    public function index(): View
    {
        return view('admin.objets.index', [
            'objets' => LearningObject::query()
                ->withCount(['annotations', 'sessions'])
                ->orderByDesc('updated_at')
                ->get(),
        ]);
    }

    public function create(): View
    {
        return view('admin.objets.form', [
            'objet' => new LearningObject(['default_scale' => 1.0, 'up_axis' => 'Y', 'recommended_placement' => 'floor']),
        ]);
    }

    public function edit(LearningObject $objet): View
    {
        return view('admin.objets.form', ['objet' => $objet]);
    }

    public function store(SaveLearningObjectRequest $requete): RedirectResponse
    {
        $objet = new LearningObject($requete->safe()->except(['glb', 'usdz', 'poster']));
        $objet->status = 'draft';

        try {
            $this->enregistrerFichiers($requete, $objet);
        } catch (RuntimeException $erreur) {
            return back()->withInput()->withErrors(['glb' => $erreur->getMessage()]);
        }

        $objet->save();

        return redirect()
            ->route('admin.objets.edit', $objet)
            ->with('succes', "Objet créé. Posez maintenant ses annotations.");
    }

    public function update(SaveLearningObjectRequest $requete, LearningObject $objet): RedirectResponse
    {
        $objet->fill($requete->safe()->except(['glb', 'usdz', 'poster']));

        try {
            $this->enregistrerFichiers($requete, $objet);
        } catch (RuntimeException $erreur) {
            return back()->withInput()->withErrors(['glb' => $erreur->getMessage()]);
        }

        $objet->save();

        return back()->with('succes', 'Modifications enregistrées.');
    }

    /**
     * Étape 8.6 — Bascule brouillon ↔ publié.
     *
     * Publier exige un modèle dans le budget ET au moins une annotation :
     * un objet sans annotation n'apprend rien, le publier n'aurait pas de sens.
     */
    public function publier(LearningObject $objet): RedirectResponse
    {
        if ($objet->status === 'published') {
            if ($this->estProtege($objet)) {
                return back()->withErrors([
                    'publication' => "« {$objet->title} » est le contenu de démonstration : il ne peut pas être dépublié.",
                ]);
            }

            $objet->update(['status' => 'draft']);

            return back()->with('succes', 'Objet dépublié — il n\'est plus visible des apprenants.');
        }

        if (! $objet->respecteBudgetPerf()) {
            return back()->withErrors([
                'publication' => 'Publication refusée : le modèle dépasse le budget de performance mobile.',
            ]);
        }

        if ($objet->annotations()->count() === 0) {
            return back()->withErrors([
                'publication' => 'Publication refusée : aucune annotation posée sur cet objet.',
            ]);
        }

        $objet->update(['status' => 'published']);

        return back()->with('succes', 'Objet publié — il est désormais accessible aux apprenants.');
    }

    public function destroy(LearningObject $objet): RedirectResponse
    {
        // Le back-office étant en accès libre (mode portfolio), rien
        // n'empêcherait un visiteur d'effacer l'objet que pointe le CV.
        if ($this->estProtege($objet)) {
            return back()->withErrors([
                'suppression' => "« {$objet->title} » est le contenu de démonstration : il ne peut pas être supprimé. "
                    .'Créez un objet de test si vous souhaitez essayer la suppression.',
            ]);
        }

        $dossier = storage_path('app/assets3d/objets/'.$objet->slug);

        if (File::isDirectory($dossier)) {
            File::deleteDirectory($dossier);
        }

        $objet->delete(); // annotations et sessions suivent par cascade

        return redirect()
            ->route('admin.objets.index')
            ->with('succes', 'Objet supprimé.');
    }

    /**
     * Jeton d'édition à destination de l'éditeur visuel (étape 8.4).
     *
     * Portée `edit` explicite : un jeton de consultation ne doit jamais
     * pouvoir écrire des annotations.
     */
    public function jetonEdition(LearningObject $objet): RedirectResponse
    {
        // En accès libre, aucun utilisateur n'est connecté : le jeton porte
        // alors une référence générique. Sa portée reste la même — un seul
        // objet, une heure.
        $jeton = ViewerToken::issue([
            'slug' => $objet->slug,
            'scope' => 'edit',
            'userRef' => Auth::user()?->email ?? 'formateur-demo',
        ], 60);

        $url = rtrim((string) config('rarv.viewer_url'), '/')
            .'/editeur/'.$objet->slug.'?t='.urlencode($jeton);

        return redirect()->away($url);
    }

    /**
     * Cet objet est-il le contenu de démonstration ?
     *
     * Il reste entièrement modifiable — un visiteur peut changer son titre,
     * remplacer son modèle, déplacer ses annotations. Seules la suppression et
     * la dépublication sont refusées : ce sont les deux seules opérations
     * irréversibles pour quelqu'un qui arriverait par le lien du CV.
     */
    private function estProtege(LearningObject $objet): bool
    {
        if (config('rarv.auth_required')) {
            return false;
        }

        return in_array($objet->slug, (array) config('rarv.contenus_proteges', []), true);
    }

    /**
     * Enregistre les fichiers téléversés et relève les mesures du modèle.
     *
     * @throws RuntimeException si le .glb est invalide ou hors budget
     */
    private function enregistrerFichiers(SaveLearningObjectRequest $requete, LearningObject $objet): void
    {
        $dossier = 'objets/'.$objet->slug;
        $absolu = storage_path('app/assets3d/'.$dossier);

        File::ensureDirectoryExists($absolu);

        $glb = $requete->file('glb');

        if ($glb instanceof UploadedFile) {
            $this->verifierExtension($glb, ['glb'], 'Le modèle principal doit être un fichier .glb.');

            // Étape 8.3 — inspection AVANT enregistrement : un fichier hors
            // budget ne doit même pas atteindre le disque.
            $mesures = $this->inspecteur->inspecter($glb->getRealPath());

            if ($mesures['triangles'] > LearningObject::BUDGET_TRIANGLES) {
                throw new RuntimeException(sprintf(
                    'Modèle refusé : %s triangles pour un maximum de %s. Simplifiez la géométrie sous Blender.',
                    number_format($mesures['triangles'], 0, ',', ' '),
                    number_format(LearningObject::BUDGET_TRIANGLES, 0, ',', ' ')
                ));
            }

            if ($mesures['sizeKb'] > LearningObject::BUDGET_TAILLE_KO) {
                throw new RuntimeException(sprintf(
                    'Modèle refusé : %s Ko pour un maximum de %s Ko. Compressez la géométrie (Draco) et les textures (KTX2).',
                    number_format($mesures['sizeKb'], 0, ',', ' '),
                    number_format(LearningObject::BUDGET_TAILLE_KO, 0, ',', ' ')
                ));
            }

            if ($mesures['meshes'] < 2) {
                throw new RuntimeException(
                    "Modèle refusé : une seule pièce détectée. Les annotations ont besoin de pièces distinctes pour désigner quelque chose."
                );
            }

            $glb->move($absolu, 'modele.glb');

            $objet->glb_path = $dossier.'/modele.glb';
            $objet->triangles = $mesures['triangles'];
            $objet->file_size_kb = $mesures['sizeKb'];
        }

        $usdz = $requete->file('usdz');

        if ($usdz instanceof UploadedFile) {
            $this->verifierExtension($usdz, ['usdz'], 'Le modèle iOS doit être un fichier .usdz.');
            $usdz->move($absolu, 'modele.usdz');
            $objet->usdz_path = $dossier.'/modele.usdz';
        }

        $poster = $requete->file('poster');

        if ($poster instanceof UploadedFile) {
            $extension = strtolower($poster->getClientOriginalExtension());
            $poster->move($absolu, 'poster.'.$extension);
            $objet->poster_path = $dossier.'/poster.'.$extension;
        }
    }

    /**
     * @param  list<string>  $autorisees
     *
     * @throws RuntimeException
     */
    private function verifierExtension(UploadedFile $fichier, array $autorisees, string $message): void
    {
        if (! in_array(strtolower($fichier->getClientOriginalExtension()), $autorisees, true)) {
            throw new RuntimeException($message);
        }
    }
}
