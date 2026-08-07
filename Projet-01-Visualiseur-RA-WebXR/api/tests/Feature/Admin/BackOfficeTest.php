<?php

namespace Tests\Feature\Admin;

use App\Models\Annotation;
use App\Models\LearningObject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Lot 8 — Back-office : authentification, CRUD, budget, publication.
 */
class BackOfficeTest extends TestCase
{
    use RefreshDatabase;

    private User $formateur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->formateur = User::factory()->create(['email' => 'formateur@example.test']);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/assets3d/objets/test-upload'));

        parent::tearDown();
    }

    /**
     * Fabrique un .glb valide et contrôlable, sans dépendre d'un fichier réel.
     */
    private function glb(int $maillages = 3, int $trianglesParMaillage = 100): string
    {
        $accesseurs = [];
        $meshes = [];

        for ($i = 0; $i < $maillages; $i++) {
            $accesseurs[] = ['count' => $trianglesParMaillage * 3, 'type' => 'SCALAR', 'componentType' => 5123];
            $meshes[] = [
                'name' => "piece-{$i}",
                'primitives' => [['attributes' => ['POSITION' => $i], 'indices' => $i]],
            ];
        }

        $json = (string) json_encode([
            'asset' => ['version' => '2.0', 'generator' => 'test'],
            'scene' => 0,
            'scenes' => [['nodes' => []]],
            'meshes' => $meshes,
            'accessors' => $accesseurs,
        ]);

        $json .= str_repeat(' ', (4 - strlen($json) % 4) % 4);

        return pack('VVV', 0x46546C67, 2, 12 + 8 + strlen($json))
            .pack('VV', strlen($json), 0x4E4F534A)
            .$json;
    }

    private function fichierGlb(int $maillages = 3, int $triangles = 100): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('modele.glb', $this->glb($maillages, $triangles));
    }

    /** @return array<string, mixed> */
    private function champs(array $remplace = []): array
    {
        return array_merge([
            'slug' => 'test-upload',
            'title' => 'Objet de test',
            'description' => 'Description.',
            'category' => 'Test',
            'default_scale' => 1,
            'up_axis' => 'Y',
            'recommended_placement' => 'floor',
        ], $remplace);
    }

    // --- Accès libre (mode portfolio) -------------------------------------

    /**
     * `RARV_AUTH_REQUIRED=false` : tout est ouvert.
     *
     * Choix assumé — un recruteur doit parcourir le projet en un clic, sans
     * compte à créer. Le rétablissement de la connexion est couvert par
     * BackOfficeAuthRequiseTest.
     */
    public function test_le_back_office_est_accessible_sans_compte(): void
    {
        $this->assertFalse(config('rarv.auth_required'));

        $this->get('/admin/objets')->assertOk()->assertSee('Objets pédagogiques');
    }

    public function test_le_tableau_de_bord_est_accessible_sans_compte(): void
    {
        $this->get('/dashboard')->assertOk()->assertSee('Tableau de bord formateur');
    }

    public function test_l_editeur_d_annotations_s_ouvre_sans_compte(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'sans-compte']);

        $this->get("/admin/objets/{$objet->slug}/annotations")
            ->assertRedirectContains('/editeur/sans-compte');
    }

    // --- Protection du contenu de démonstration ---------------------------

    /**
     * Sans authentification, n'importe quel visiteur pourrait effacer l'objet
     * que pointe le CV. Suppression et dépublication lui sont donc refusées —
     * tout le reste demeure modifiable.
     */
    /**
     * ⚠️ Slug de test, jamais celui de la démonstration : `destroy()` efface
     * `storage/app/assets3d/objets/{slug}` sur le disque RÉEL. Utiliser le
     * vrai slug reviendrait à jouer avec les modèles 3D du projet à chaque
     * exécution de la suite.
     */
    public function test_le_contenu_de_demonstration_ne_peut_pas_etre_supprime(): void
    {
        config()->set('rarv.contenus_proteges', ['contenu-protege-test']);

        $protege = LearningObject::factory()->create(['slug' => 'contenu-protege-test']);

        $this->delete("/admin/objets/{$protege->slug}")
            ->assertSessionHasErrors('suppression');

        $this->assertDatabaseHas('learning_objects', ['slug' => 'contenu-protege-test']);
    }

    public function test_le_contenu_de_demonstration_ne_peut_pas_etre_depublie(): void
    {
        config()->set('rarv.contenus_proteges', ['contenu-protege-test']);

        $protege = LearningObject::factory()->create([
            'slug' => 'contenu-protege-test',
            'status' => 'published',
        ]);

        $this->post("/admin/objets/{$protege->slug}/publication")
            ->assertSessionHasErrors('publication');

        $this->assertSame('published', $protege->fresh()->status);
    }

    public function test_un_objet_ordinaire_reste_supprimable(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'objet-jetable']);

        $this->delete("/admin/objets/{$objet->slug}")->assertRedirect();

        $this->assertDatabaseMissing('learning_objects', ['slug' => 'objet-jetable']);
    }

    /** Le contenu protégé reste entièrement modifiable — seul l'irréversible est bloqué. */
    public function test_le_contenu_de_demonstration_reste_modifiable(): void
    {
        config()->set('rarv.contenus_proteges', ['contenu-protege-test']);

        $protege = LearningObject::factory()->create(['slug' => 'contenu-protege-test']);

        $this->put("/admin/objets/{$protege->slug}", $this->champs([
            'slug' => 'contenu-protege-test',
            'title' => 'Titre corrigé',
        ]))->assertRedirect();

        $this->assertSame('Titre corrigé', $protege->fresh()->title);
    }

    // --- 8.2 CRUD ---------------------------------------------------------

    public function test_cree_un_objet_avec_son_modele_et_releve_ses_mesures(): void
    {
        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs(['glb' => $this->fichierGlb(4, 250)]))
            ->assertRedirect();

        $objet = LearningObject::where('slug', 'test-upload')->firstOrFail();

        // Les mesures sont RELEVÉES dans le fichier, jamais déclarées par le formateur.
        $this->assertSame(1000, $objet->triangles);
        $this->assertSame('draft', $objet->status);
        $this->assertNotNull($objet->file_size_kb);
        $this->assertTrue(File::exists(storage_path('app/assets3d/'.$objet->glb_path)));
    }

    public function test_refuse_un_slug_mal_forme_ou_deja_pris(): void
    {
        LearningObject::factory()->create(['slug' => 'deja-pris']);

        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs(['slug' => 'Slug Invalide', 'glb' => $this->fichierGlb()]))
            ->assertSessionHasErrors('slug');

        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs(['slug' => 'deja-pris', 'glb' => $this->fichierGlb()]))
            ->assertSessionHasErrors('slug');
    }

    // --- 8.3 Budget de performance ---------------------------------------

    public function test_refuse_un_modele_hors_budget_de_triangles(): void
    {
        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs(['glb' => $this->fichierGlb(4, 50_000)]))
            ->assertSessionHasErrors('glb');

        $this->assertDatabaseCount('learning_objects', 0);
    }

    public function test_refuse_un_modele_d_une_seule_piece(): void
    {
        // Sans pièces distinctes, les annotations n'ont rien à désigner.
        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs(['glb' => $this->fichierGlb(1, 100)]))
            ->assertSessionHasErrors('glb');
    }

    public function test_refuse_un_fichier_qui_n_est_pas_un_glb(): void
    {
        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs([
                'glb' => UploadedFile::fake()->createWithContent('modele.glb', 'ceci nest pas un glb du tout'),
            ]))
            ->assertSessionHasErrors('glb');
    }

    public function test_refuse_une_extension_deguisee(): void
    {
        $this->actingAs($this->formateur)
            ->post('/admin/objets', $this->champs([
                'glb' => UploadedFile::fake()->createWithContent('malveillant.php', $this->glb()),
            ]))
            ->assertSessionHasErrors('glb');
    }

    // --- 8.6 Publication --------------------------------------------------

    public function test_refuse_de_publier_un_objet_sans_annotation(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'sans-annot', 'status' => 'draft']);

        $this->actingAs($this->formateur)
            ->post("/admin/objets/{$objet->slug}/publication")
            ->assertSessionHasErrors('publication');

        $this->assertSame('draft', $objet->fresh()->status);
    }

    public function test_refuse_de_publier_un_objet_hors_budget(): void
    {
        $objet = LearningObject::factory()->troplourd()->create(['slug' => 'lourd', 'status' => 'draft']);
        Annotation::factory()->for($objet)->create();

        $this->actingAs($this->formateur)
            ->post("/admin/objets/{$objet->slug}/publication")
            ->assertSessionHasErrors('publication');
    }

    public function test_publie_et_depublie_un_objet_conforme(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'conforme', 'status' => 'draft']);
        Annotation::factory()->for($objet)->create();

        $this->actingAs($this->formateur)
            ->post("/admin/objets/{$objet->slug}/publication")
            ->assertSessionHasNoErrors();

        $this->assertSame('published', $objet->fresh()->status);

        $this->actingAs($this->formateur)->post("/admin/objets/{$objet->slug}/publication");

        $this->assertSame('draft', $objet->fresh()->status);
    }

    public function test_la_suppression_efface_l_objet_et_ses_annotations(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'a-supprimer']);
        Annotation::factory()->for($objet)->count(3)->create();

        $this->actingAs($this->formateur)
            ->delete("/admin/objets/{$objet->slug}")
            ->assertRedirect(route('admin.objets.index'));

        $this->assertDatabaseCount('learning_objects', 0);
        $this->assertDatabaseCount('annotations', 0);
    }
}
