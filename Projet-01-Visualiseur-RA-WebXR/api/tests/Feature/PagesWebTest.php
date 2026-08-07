<?php

namespace Tests\Feature;

use App\Models\Annotation;
use App\Models\LearningObject;
use App\Models\User;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Étapes 7.3 et 7.7 — Pages servies par Laravel.
 *
 * Remplace le test d'exemple livré avec le framework, devenu faux depuis que
 * la racine redirige vers la leçon de démonstration.
 */
class PagesWebTest extends TestCase
{
    use RefreshDatabase;

    private function objetPublie(): LearningObject
    {
        $objet = LearningObject::factory()->create([
            'slug' => 'pompe-centrifuge-01',
            'title' => 'Pompe centrifuge',
        ]);

        Annotation::factory()->for($objet)->count(3)->create();

        return $objet;
    }

    /** Étape 10.7 — la racine est désormais la vitrine publique. */
    public function test_la_racine_affiche_la_page_de_demonstration(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Essayez en 30 secondes')
            ->assertSee('Scannez');
    }

    /** Étape 10.2 — en-têtes de sécurité sur les pages HTML. */
    public function test_les_pages_portent_les_en_tetes_de_securite(): void
    {
        $reponse = $this->get('/')->assertOk();

        $csp = $reponse->headers->get('Content-Security-Policy');

        $this->assertNotNull($csp);
        // Les décodeurs 3D s'exécutent dans des workers issus de blob:
        $this->assertStringContainsString('worker-src', (string) $csp);
        $this->assertStringContainsString('blob:', (string) $csp);
        $this->assertStringContainsString("object-src 'none'", (string) $csp);

        $this->assertSame('nosniff', $reponse->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('camera=()', (string) $reponse->headers->get('Permissions-Policy'));
    }

    /** La navigation doit être présente partout — demande explicite du client. */
    public function test_toutes_les_pages_portent_la_navigation(): void
    {
        $this->objetPublie();

        foreach (['/', '/lecon/pompe-centrifuge-01', '/admin/login'] as $url) {
            $this->get($url)
                ->assertOk()
                ->assertSee('Navigation principale')
                ->assertSee('Navigation de bas de page')
                ->assertSee('Aller au contenu');
        }
    }

    public function test_la_lecon_affiche_le_composant_embarque(): void
    {
        $this->objetPublie();

        $this->get('/lecon/pompe-centrifuge-01')
            ->assertOk()
            ->assertSee('Pompe centrifuge')
            ->assertSee('<rarv-viewer', false)
            ->assertSee('/js/rarv-viewer.js', false);
    }

    /**
     * Le point de conception à protéger : le jeton est fabriqué par le
     * SERVEUR au rendu de la leçon. Le secret partagé avec le LMS ne doit
     * jamais atteindre le navigateur.
     */
    public function test_la_lecon_injecte_un_jeton_valide_et_jamais_le_secret(): void
    {
        $this->objetPublie();

        $reponse = $this->get('/lecon/pompe-centrifuge-01')->assertOk();
        $html = $reponse->getContent();

        $this->assertStringNotContainsString((string) config('rarv.lms_secret'), $html);

        preg_match('/jeton="([^"]+)"/', $html, $trouve);
        $this->assertNotEmpty($trouve, 'Aucun jeton injecté dans le composant.');

        $claims = ViewerToken::verify($trouve[1]);

        $this->assertNotNull($claims);
        $this->assertSame('pompe-centrifuge-01', $claims['slug']);
    }

    public function test_une_lecon_sur_objet_inconnu_renvoie_404(): void
    {
        $this->get('/lecon/inexistant')->assertNotFound();
    }

    public function test_une_lecon_sur_objet_en_brouillon_renvoie_404(): void
    {
        LearningObject::factory()->brouillon()->create(['slug' => 'brouillon']);

        $this->get('/lecon/brouillon')->assertNotFound();
    }

    /**
     * Depuis le Lot 8, le tableau de bord expose la progression nominative
     * des apprenants : il est passé derrière l'authentification formateur.
     */
    public function test_le_tableau_de_bord_affiche_la_regle_de_completion_et_le_pilote_lrs(): void
    {
        $this->objetPublie();

        $this->actingAs(User::factory()->create())
            ->get('/dashboard')
            ->assertOk()
            ->assertSee('Tableau de bord formateur')
            ->assertSee('toutes les annotations consultées')
            ->assertSee('local (base de données)');
    }

    public function test_le_tableau_de_bord_liste_les_annotations_de_l_objet(): void
    {
        $objet = $this->objetPublie();

        $reponse = $this->actingAs(User::factory()->create())->get('/dashboard')->assertOk();

        foreach ($objet->annotations as $annotation) {
            $reponse->assertSee($annotation->label);
        }
    }
}
