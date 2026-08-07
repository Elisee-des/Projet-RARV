<?php

namespace Tests\Feature\Api;

use App\Models\Annotation;
use App\Models\LearningObject;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Étapes 8.4 et 8.5 — API de l'éditeur visuel d'annotations.
 */
class AnnotationEditorTest extends TestCase
{
    use RefreshDatabase;

    private LearningObject $objet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->objet = LearningObject::factory()->create([
            'slug' => 'pompe',
            'status' => 'draft',
            'glb_path' => 'objets/pompe/modele.glb',
        ]);
    }

    private function jetonEdition(string $slug = 'pompe'): string
    {
        return ViewerToken::issue(['slug' => $slug, 'scope' => 'edit', 'userRef' => 'formateur']);
    }

    private function entete(string $slug = 'pompe'): array
    {
        return ['Authorization' => 'Bearer '.$this->jetonEdition($slug)];
    }

    /** @return array<string, mixed> */
    private function charge(array $remplace = []): array
    {
        return array_merge([
            'label' => 'Roue à aubes',
            'title' => 'Roue à aubes (impulseur)',
            'bodyHtml' => '<p>La seule pièce qui apporte de l\'énergie au fluide.</p>',
            // Valeurs volontairement non entières : JSON encode 0.0 en 0, et
            // la comparaison stricte échouerait sur une différence de type.
            'position' => [0.12, 0.84, 0.06],
            'normal' => [0.25, 0.75, 0.5],
        ], $remplace);
    }

    // --- Portée du jeton ---------------------------------------------------

    public function test_refuse_sans_jeton(): void
    {
        $this->postJson('/api/admin/objects/pompe/annotations', $this->charge())
            ->assertUnauthorized();
    }

    /**
     * Le point de sécurité du lot : le jeton que reçoit CHAQUE apprenant ne
     * doit pas pouvoir écrire dans le contenu pédagogique.
     */
    public function test_un_jeton_de_consultation_ne_peut_pas_editer(): void
    {
        $jetonApprenant = ViewerToken::issue(['slug' => 'pompe', 'userRef' => 'learner-1']);

        $this->withHeader('Authorization', "Bearer {$jetonApprenant}")
            ->postJson('/api/admin/objects/pompe/annotations', $this->charge())
            ->assertForbidden();
    }

    public function test_un_jeton_portant_sur_un_autre_objet_est_refuse(): void
    {
        LearningObject::factory()->create(['slug' => 'autre']);

        $this->withHeaders($this->entete('autre'))
            ->postJson('/api/admin/objects/pompe/annotations', $this->charge())
            ->assertForbidden();
    }

    // --- Création et lecture -----------------------------------------------

    public function test_la_fiche_editeur_expose_aussi_les_brouillons(): void
    {
        $this->withHeaders($this->entete())
            ->getJson('/api/admin/objects/pompe')
            ->assertOk()
            ->assertJsonPath('status', 'draft')
            ->assertJsonStructure(['slug', 'title', 'status', 'placement', 'perf', 'assets', 'annotations']);
    }

    public function test_cree_une_annotation_en_coordonnees_locales(): void
    {
        $this->withHeaders($this->entete())
            ->postJson('/api/admin/objects/pompe/annotations', $this->charge())
            ->assertCreated()
            ->assertJsonPath('annotation.position', [0.12, 0.84, 0.06])
            ->assertJsonPath('annotation.normal', [0.25, 0.75, 0.5])
            ->assertJsonPath('annotation.order', 1);

        $annotation = Annotation::firstOrFail();

        $this->assertSame(0.12, $annotation->position_x);
        $this->assertSame(0.84, $annotation->position_y);
        $this->assertSame($this->objet->id, $annotation->learning_object_id);
    }

    public function test_les_annotations_successives_s_ordonnent_automatiquement(): void
    {
        foreach ([1, 2, 3] as $rang) {
            $this->withHeaders($this->entete())
                ->postJson('/api/admin/objects/pompe/annotations', $this->charge(['label' => "p{$rang}"]))
                ->assertCreated()
                ->assertJsonPath('annotation.order', $rang);
        }
    }

    public function test_refuse_une_position_incomplete(): void
    {
        $this->withHeaders($this->entete())
            ->postJson('/api/admin/objects/pompe/annotations', $this->charge(['position' => [0.0, 1.0]]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('position');
    }

    // --- Modification et suppression ---------------------------------------

    public function test_modifie_une_annotation(): void
    {
        $annotation = Annotation::factory()->for($this->objet)->create();

        $this->withHeaders($this->entete())
            ->putJson("/api/admin/objects/pompe/annotations/{$annotation->id}", [
                'title' => 'Titre corrigé',
                'position' => [1.5, 2.25, 3.75],
            ])
            ->assertOk()
            ->assertJsonPath('annotation.title', 'Titre corrigé')
            ->assertJsonPath('annotation.position', [1.5, 2.25, 3.75]);
    }

    public function test_supprime_une_annotation(): void
    {
        $annotation = Annotation::factory()->for($this->objet)->create();

        $this->withHeaders($this->entete())
            ->deleteJson("/api/admin/objects/pompe/annotations/{$annotation->id}")
            ->assertNoContent();

        $this->assertDatabaseCount('annotations', 0);
    }

    public function test_ne_touche_pas_a_l_annotation_d_un_autre_objet(): void
    {
        $autre = LearningObject::factory()->create(['slug' => 'autre']);
        $annotation = Annotation::factory()->for($autre)->create();

        $this->withHeaders($this->entete())
            ->deleteJson("/api/admin/objects/pompe/annotations/{$annotation->id}")
            ->assertNotFound();

        $this->assertDatabaseCount('annotations', 1);
    }

    // --- Réordonnancement (8.5) --------------------------------------------

    public function test_reordonne_les_annotations(): void
    {
        $ids = [];

        foreach (['a', 'b', 'c'] as $rang => $label) {
            $ids[] = Annotation::factory()->for($this->objet)
                ->create(['label' => $label, 'sort_order' => $rang + 1])->id;
        }

        $inverse = array_reverse($ids);

        $reponse = $this->withHeaders($this->entete())
            ->putJson('/api/admin/objects/pompe/annotations/order', ['ids' => $inverse])
            ->assertOk();

        $this->assertSame($inverse, array_column($reponse->json('annotations'), 'id'));
        $this->assertSame([1, 2, 3], array_column($reponse->json('annotations'), 'order'));
    }

    public function test_refuse_un_ordre_incomplet_ou_etranger(): void
    {
        $a = Annotation::factory()->for($this->objet)->create();
        Annotation::factory()->for($this->objet)->create();

        // Liste incomplète
        $this->withHeaders($this->entete())
            ->putJson('/api/admin/objects/pompe/annotations/order', ['ids' => [$a->id]])
            ->assertUnprocessable();

        // Identifiant étranger
        $this->withHeaders($this->entete())
            ->putJson('/api/admin/objects/pompe/annotations/order', ['ids' => [$a->id, 99999]])
            ->assertUnprocessable();
    }

    // --- Assets d'un brouillon ---------------------------------------------

    public function test_l_asset_d_un_brouillon_n_est_servi_qu_avec_un_jeton_d_edition(): void
    {
        $racine = storage_path('app/assets3d/objets/pompe');
        File::ensureDirectoryExists($racine);
        File::put($racine.'/modele.glb', "glTF\x02\x00\x00\x00");

        try {
            // Sans jeton : l'objet est en brouillon, donc invisible.
            $this->get(URL::signedRoute('assets.show', ['slug' => 'pompe', 'fichier' => 'modele.glb']))
                ->assertNotFound();

            // Avec un jeton d'édition signé DANS l'URL : accessible.
            $this->get(URL::signedRoute('assets.show', [
                'slug' => 'pompe',
                'fichier' => 'modele.glb',
                't' => $this->jetonEdition(),
            ]))->assertOk();
        } finally {
            File::deleteDirectory($racine);
        }
    }
}
