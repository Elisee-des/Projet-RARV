<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Rétablissement de l'authentification — `RARV_AUTH_REQUIRED=true`.
 *
 * Le mode portfolio ouvre tout, ce qui est le bon choix pour une démonstration.
 * Mais le jour où la plateforme accueille de vrais apprenants, le tableau de
 * bord expose une progression nominative : il faut pouvoir refermer.
 *
 * Ces tests prouvent que la soupape fonctionne. Sans eux, personne ne saurait
 * qu'elle est cassée avant de la manœuvrer en catastrophe.
 *
 * La variable est posée AVANT le démarrage de l'application : les routes lisent
 * la configuration au chargement, la modifier ensuite n'aurait aucun effet.
 */
class BackOfficeAuthRequiseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        putenv('RARV_AUTH_REQUIRED=true');
        $_ENV['RARV_AUTH_REQUIRED'] = 'true';
        $_SERVER['RARV_AUTH_REQUIRED'] = 'true';

        parent::setUp();
    }

    protected function tearDown(): void
    {
        putenv('RARV_AUTH_REQUIRED');
        unset($_ENV['RARV_AUTH_REQUIRED'], $_SERVER['RARV_AUTH_REQUIRED']);

        parent::tearDown();
    }

    public function test_la_configuration_est_bien_active(): void
    {
        $this->assertTrue(config('rarv.auth_required'));
    }

    public function test_le_back_office_redirige_vers_la_connexion(): void
    {
        $this->get('/admin/objets')->assertRedirect('/admin/login');
    }

    public function test_le_tableau_de_bord_redirige_vers_la_connexion(): void
    {
        $this->get('/dashboard')->assertRedirect('/admin/login');
    }

    public function test_un_formateur_connecte_accede_a_tout(): void
    {
        $formateur = User::factory()->create();

        $this->actingAs($formateur)->get('/admin/objets')->assertOk();
        $this->actingAs($formateur)->get('/dashboard')->assertOk();
    }

    public function test_la_connexion_refuse_un_mauvais_mot_de_passe(): void
    {
        $formateur = User::factory()->create();

        $this->post('/admin/login', [
            'email' => $formateur->email,
            'password' => 'mauvais',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_la_connexion_puis_la_deconnexion_fonctionnent(): void
    {
        $formateur = User::factory()->create();

        $this->post('/admin/login', [
            'email' => $formateur->email,
            'password' => 'password',
        ])->assertRedirect();

        $this->assertAuthenticated();

        $this->post('/admin/logout')->assertRedirect('/admin/login');

        $this->assertGuest();
    }

    /** Avec l'authentification active, le contenu de démonstration redevient supprimable. */
    public function test_la_protection_du_contenu_de_demonstration_est_levee(): void
    {
        $formateur = User::factory()->create();
        $protege = \App\Models\LearningObject::factory()->create(['slug' => 'pompe-centrifuge-01']);

        $this->actingAs($formateur)
            ->delete("/admin/objets/{$protege->slug}")
            ->assertRedirect();

        $this->assertDatabaseMissing('learning_objects', ['slug' => 'pompe-centrifuge-01']);
    }
}
