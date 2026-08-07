<?php

namespace Tests\Feature\Api;

use App\Models\LearningObject;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Étape 2.7 — Émission et vérification des jetons viewer.
 */
class ViewerTokenApiTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-lms-de-test';

    public function test_refuse_l_emission_sans_secret(): void
    {
        LearningObject::factory()->create(['slug' => 'p']);

        $this->postJson('/api/viewer-tokens', ['slug' => 'p'])
            ->assertForbidden();
    }

    public function test_refuse_l_emission_avec_un_mauvais_secret(): void
    {
        LearningObject::factory()->create(['slug' => 'p']);

        $this->withHeader('X-LMS-Secret', 'pas-le-bon')
            ->postJson('/api/viewer-tokens', ['slug' => 'p'])
            ->assertForbidden();
    }

    public function test_refuse_l_emission_sur_un_slug_inconnu(): void
    {
        $this->withHeader('X-LMS-Secret', self::SECRET)
            ->postJson('/api/viewer-tokens', ['slug' => 'inconnu'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('slug');
    }

    public function test_emet_un_jeton_verifiable_portant_les_revendications(): void
    {
        LearningObject::factory()->create(['slug' => 'pompe']);

        $reponse = $this->withHeader('X-LMS-Secret', self::SECRET)
            ->postJson('/api/viewer-tokens', [
                'slug' => 'pompe',
                'userRef' => 'learner-42',
                'lmsContext' => 'cours-maintenance',
            ])
            ->assertCreated()
            ->assertJsonStructure(['token', 'expiresIn']);

        $claims = ViewerToken::verify($reponse->json('token'));

        $this->assertNotNull($claims);
        $this->assertSame('pompe', $claims['slug']);
        $this->assertSame('learner-42', $claims['userRef']);
        $this->assertSame('cours-maintenance', $claims['lmsContext']);
        $this->assertGreaterThan(now()->timestamp, $claims['exp']);
    }

    public function test_un_jeton_dont_la_charge_utile_est_modifiee_est_rejete(): void
    {
        $valide = ViewerToken::issue(['slug' => 'legitime']);
        [, $signature] = explode('.', $valide, 2);

        $forge = rtrim(strtr(base64_encode(
            (string) json_encode(['slug' => 'pirate', 'exp' => now()->addHour()->timestamp])
        ), '+/', '-_'), '=');

        $this->assertNull(ViewerToken::verify($forge.'.'.$signature));
    }

    public function test_un_jeton_expire_est_rejete(): void
    {
        $expire = ViewerToken::issue(['slug' => 'p'], -1);

        $this->assertNull(ViewerToken::verify($expire));
    }

    /**
     * La route de confort `/api/dev/viewer-token` délivre un jeton SANS secret.
     * Elle ne doit exister que dans l'environnement local — la suite de tests
     * tourne en `testing`, donc son absence ici prouve le cloisonnement.
     */
    public function test_la_route_de_developpement_n_existe_pas_hors_environnement_local(): void
    {
        LearningObject::factory()->create(['slug' => 'pompe']);

        $this->assertFalse(app()->environment('local'));

        $this->getJson('/api/dev/viewer-token?slug=pompe')->assertNotFound();
    }

    public function test_un_jeton_absurde_est_rejete_sans_erreur(): void
    {
        $this->assertNull(ViewerToken::verify(null));
        $this->assertNull(ViewerToken::verify(''));
        $this->assertNull(ViewerToken::verify('nimportequoi'));
        $this->assertNull(ViewerToken::verify('a.b.c.d'));
    }
}
