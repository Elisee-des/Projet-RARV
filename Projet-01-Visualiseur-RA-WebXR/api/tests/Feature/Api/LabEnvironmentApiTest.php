<?php

namespace Tests\Feature\Api;

use App\Models\Environment;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Projet 02, étape 2.3 — Fiche d'un environnement 3D.
 */
class LabEnvironmentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AtelierMaintenanceSeeder::class);
    }

    public function test_expose_la_fiche_complete_de_l_atelier(): void
    {
        $this->getJson('/api/environments/atelier-maintenance-01')
            ->assertOk()
            ->assertJsonPath('data.slug', 'atelier-maintenance-01')
            ->assertJsonCount(8, 'data.points')
            ->assertJsonStructure([
                'data' => [
                    'slug', 'title', 'description',
                    'assets' => ['scene', 'collision', 'lightmaps'],
                    'spawn' => ['position', 'rotation'],
                    'bounds',
                    'perf' => ['triangles', 'fileSizeKb', 'dansLeBudget'],
                    'completion' => ['requiredPoints', 'passScore'],
                    'points' => [['code', 'order', 'label', 'required', 'trigger', 'position', 'activity']],
                ],
            ]);
    }

    public function test_les_postes_sont_tries_par_ordre_de_parcours(): void
    {
        $reponse = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk();

        $this->assertSame(
            ['POI_01', 'POI_02', 'POI_03', 'POI_04', 'POI_05', 'POI_06', 'POI_07', 'POI_08'],
            array_column($reponse->json('data.points'), 'code')
        );
    }

    public function test_les_quatre_types_d_activite_sont_representes(): void
    {
        $reponse = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk();

        $types = array_column(array_column($reponse->json('data.points'), 'activity'), 'type');

        $this->assertSame(
            ['panel' => 3, 'video' => 2, 'document' => 2, 'quiz' => 1],
            array_count_values($types)
        );
    }

    /**
     * ⚠️ Le piège n°1 du projet : des coordonnées codées en dur qu'il faut
     * corriger à la main à chaque itération de la salle. La source de vérité
     * est l'Empty nommé du .glb (étape 1.10) — la base doit rester vide.
     */
    public function test_les_positions_des_postes_ne_sont_pas_stockees_en_base(): void
    {
        $reponse = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk();

        foreach ($reponse->json('data.points') as $poste) {
            $this->assertNull(
                $poste['position'],
                "Le poste {$poste['code']} porte une position en base : elle doit venir du .glb."
            );
        }
    }

    public function test_six_postes_sur_huit_sont_requis(): void
    {
        $reponse = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk();

        $this->assertSame(
            ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'],
            $reponse->json('data.completion.requiredPoints')
        );

        // Les deux postes facultatifs portent chacun une question du quiz :
        // c'est ce qui rend l'écran « postes les moins visités » démonstratif.
        $facultatifs = array_values(array_filter(
            $reponse->json('data.points'),
            fn ($poste) => ! $poste['required']
        ));

        $this->assertSame(['POI_03', 'POI_07'], array_column($facultatifs, 'code'));
    }

    public function test_les_chemins_de_fichiers_deviennent_des_url_signees(): void
    {
        $reponse = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk();

        $scene = $reponse->json('data.assets.scene');

        $this->assertStringContainsString('/api/environments/atelier-maintenance-01/assets/', $scene);
        $this->assertStringContainsString('signature=', $scene);

        // L'arborescence de stockage ne doit jamais transparaître.
        $this->assertStringNotContainsString('environnements/', $scene);
    }

    public function test_un_environnement_en_brouillon_est_introuvable(): void
    {
        Environment::query()->where('slug', 'atelier-maintenance-01')->update(['status' => 'draft']);

        $this->getJson('/api/environments/atelier-maintenance-01')->assertNotFound();
    }

    public function test_un_slug_inconnu_renvoie_404(): void
    {
        $this->getJson('/api/environments/nexiste-pas')->assertNotFound();
    }

    public function test_un_asset_non_declare_est_refuse(): void
    {
        $url = \Illuminate\Support\Facades\URL::signedRoute('environments.assets.show', [
            'slug' => 'atelier-maintenance-01',
            'fichier' => 'secrets.env',
        ]);

        $this->get($url)->assertNotFound();
    }

    public function test_un_asset_sans_signature_est_refuse(): void
    {
        $this->get('/api/environments/atelier-maintenance-01/assets/atelier.glb')
            ->assertForbidden();
    }
}
