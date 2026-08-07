<?php

namespace Tests\Feature\Api;

use App\Models\LearningObject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Étape 2.9 — Service des assets 3D.
 *
 * Le type MIME est testé explicitement : un .glb servi en
 * application/octet-stream échoue SILENCIEUSEMENT dans Three.js.
 */
class AssetApiTest extends TestCase
{
    use RefreshDatabase;

    private LearningObject $objet;

    private string $racine;

    protected function setUp(): void
    {
        parent::setUp();

        $this->racine = storage_path('app/assets3d/objets/test-assets');

        $this->objet = LearningObject::factory()->create([
            'slug' => 'objet-assets',
            'glb_path' => 'objets/test-assets/modele.glb',
            'usdz_path' => 'objets/test-assets/modele.usdz', // volontairement absent du disque
            'poster_path' => 'objets/test-assets/poster.webp',
        ]);

        File::ensureDirectoryExists($this->racine);
        File::put($this->racine.'/modele.glb', "glTF\x02\x00\x00\x00");
        File::put($this->racine.'/poster.webp', 'RIFF....WEBP');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->racine);

        parent::tearDown();
    }

    private function urlSignee(string $fichier): string
    {
        return URL::signedRoute('assets.show', [
            'slug' => $this->objet->slug,
            'fichier' => $fichier,
        ]);
    }

    public function test_sert_le_glb_avec_le_bon_type_mime(): void
    {
        $this->get($this->urlSignee('modele.glb'))
            ->assertOk()
            ->assertHeader('Content-Type', 'model/gltf-binary');
    }

    public function test_sert_le_poster_avec_le_bon_type_mime(): void
    {
        $this->get($this->urlSignee('poster.webp'))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/webp');
    }

    public function test_les_assets_sont_mis_en_cache_un_an_et_immuables(): void
    {
        $reponse = $this->get($this->urlSignee('modele.glb'))->assertOk();

        $cache = $reponse->headers->get('Cache-Control');

        $this->assertStringContainsString('max-age=31536000', $cache);
        $this->assertStringContainsString('immutable', $cache);
        $this->assertStringContainsString('public', $cache);
    }

    public function test_expose_l_asset_aux_requetes_inter_origines(): void
    {
        $this->get($this->urlSignee('modele.glb'))
            ->assertOk()
            ->assertHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }

    public function test_refuse_une_url_non_signee(): void
    {
        $this->get("/api/assets/{$this->objet->slug}/modele.glb")
            ->assertForbidden();
    }

    public function test_refuse_une_signature_falsifiee(): void
    {
        $url = $this->urlSignee('modele.glb');

        $this->get(substr($url, 0, -1).'0')->assertForbidden();
    }

    public function test_refuse_un_fichier_non_declare_par_l_objet(): void
    {
        // Signature valide mais fichier absent de la liste blanche de l'objet.
        $this->get($this->urlSignee('secret.env'))->assertNotFound();
    }

    public function test_renvoie_404_si_le_fichier_declare_manque_sur_le_disque(): void
    {
        $this->get($this->urlSignee('modele.usdz'))->assertNotFound();
    }

    public function test_un_objet_en_brouillon_ne_sert_pas_ses_assets(): void
    {
        $this->objet->update(['status' => 'draft']);

        $this->get($this->urlSignee('modele.glb'))->assertNotFound();
    }
}
