<?php

namespace Tests\Feature\Api;

use App\Models\Annotation;
use App\Models\LearningObject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Étape 2.3 — Catalogue.
 */
class LearningObjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_sonde_de_sante_repond(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertJsonPath('service', 'rarv-api')
            ->assertJsonStructure(['service', 'laravel', 'php', 'env', 'time']);
    }

    public function test_expose_la_fiche_complete_d_un_objet_publie(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'pompe-test']);
        Annotation::factory()->for($objet)->count(3)->create();

        $this->getJson('/api/objects/pompe-test')
            ->assertOk()
            ->assertJsonPath('data.slug', 'pompe-test')
            ->assertJsonCount(3, 'data.annotations')
            ->assertJsonStructure([
                'data' => [
                    'slug', 'title', 'description', 'category',
                    'assets' => ['glb', 'usdz', 'poster'],
                    'placement' => ['scale', 'upAxis', 'recommended'],
                    'perf' => ['triangles', 'fileSizeKb'],
                    'annotations' => [['id', 'order', 'label', 'title', 'bodyHtml', 'position']],
                ],
            ]);
    }

    public function test_les_annotations_sont_triees_par_ordre(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'tri']);

        foreach ([3, 1, 2] as $ordre) {
            Annotation::factory()->for($objet)->create([
                'sort_order' => $ordre,
                'label' => "pos-{$ordre}",
            ]);
        }

        $reponse = $this->getJson('/api/objects/tri')->assertOk();

        $this->assertSame(
            ['pos-1', 'pos-2', 'pos-3'],
            array_column($reponse->json('data.annotations'), 'label')
        );
    }

    public function test_la_position_est_un_triplet_exploitable_par_three_js(): void
    {
        $objet = LearningObject::factory()->create(['slug' => 'pos']);
        Annotation::factory()->for($objet)->create([
            'position_x' => 0.5, 'position_y' => 1.25, 'position_z' => -0.75,
        ]);

        $this->getJson('/api/objects/pos')
            ->assertOk()
            ->assertJsonPath('data.annotations.0.position', [0.5, 1.25, -0.75]);
    }

    public function test_un_objet_en_brouillon_est_introuvable(): void
    {
        LearningObject::factory()->brouillon()->create(['slug' => 'cache']);

        $this->getJson('/api/objects/cache')->assertNotFound();
    }

    public function test_un_slug_inconnu_renvoie_404(): void
    {
        $this->getJson('/api/objects/nexiste-pas')->assertNotFound();
    }
}
