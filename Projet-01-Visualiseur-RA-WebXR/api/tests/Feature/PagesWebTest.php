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

    /**
     * Étape 10.7 — la racine est la vitrine publique.
     *
     * Elle doit présenter les DEUX modules de façon distincte, avec leur
     * point d'entrée respectif : ce sont les deux adresses portées par le CV.
     */
    public function test_la_racine_presente_les_deux_modules(): void
    {
        $this->objetPublie();

        $reponse = $this->get('/')->assertOk();

        // Module « viewer-ra »
        $reponse->assertSee('Projet 01')
            ->assertSee('réalité augmentée')
            ->assertSee('Ouvrir la leçon')
            ->assertSee(url('/lecon/pompe-centrifuge-01'));

        // Module « labo-formation ».
        // `false` : le libellé est du HTML littéral, pas une valeur échappée
        // par Blade — assertSee chercherait sinon « l&#039;atelier ».
        $reponse->assertSee('Projet 02')
            ->assertSee('Laboratoire de formation')
            ->assertSee("Entrer dans l'atelier", false)
            ->assertSee(rtrim((string) config('rarv.lab_url'), '/'));
    }

    /** Les tableaux doivent défiler DANS leur carte, pas élargir la page. */
    public function test_les_tableaux_sont_dans_un_conteneur_defilant(): void
    {
        $this->objetPublie();

        foreach (['/', '/dashboard', '/admin/objets'] as $url) {
            $contenu = (string) $this->get($url)->assertOk()->getContent();

            $tables = substr_count($contenu, '<table');
            $conteneurs = substr_count($contenu, 'class="tableau"');

            $this->assertSame(
                $tables,
                $conteneurs,
                "{$url} : {$tables} tableau(x) pour {$conteneurs} conteneur(s) défilant(s)."
            );
        }
    }

    /** Sans viewport, un mobile rend la page en 980 px puis la dézoome. */
    public function test_les_pages_declarent_le_viewport_mobile(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('name="viewport"', false)
            ->assertSee('width=device-width', false);
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
