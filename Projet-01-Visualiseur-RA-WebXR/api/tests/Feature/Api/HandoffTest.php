<?php

namespace Tests\Feature\Api;

use App\Models\Annotation;
use App\Models\HandoffToken;
use App\Models\LearningObject;
use App\Models\ViewSession;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Lot 6 — Bascule desktop → mobile.
 */
class HandoffTest extends TestCase
{
    use RefreshDatabase;

    private LearningObject $objet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->objet = LearningObject::factory()->create(['slug' => 'pompe']);
        Annotation::factory()->for($this->objet)->count(3)->create();
    }

    private function entete(string $slug = 'pompe'): array
    {
        return [
            'Authorization' => 'Bearer '.ViewerToken::issue([
                'slug' => $slug,
                'userRef' => 'learner-5',
                'lmsContext' => 'cours-test',
            ]),
        ];
    }

    private function sessionDesktop(): ViewSession
    {
        return ViewSession::create([
            'learning_object_id' => $this->objet->id,
            'user_ref' => 'learner-5',
            'lms_context' => 'cours-test',
            'device_type' => 'desktop',
            'started_at' => now()->subMinute(),
        ]);
    }

    // --- Création (6.1) --------------------------------------------------

    public function test_cree_un_lien_de_bascule(): void
    {
        $session = $this->sessionDesktop();

        $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])
            ->assertCreated()
            ->assertJsonStructure(['token', 'url', 'expiresIn'])
            ->assertJsonPath('expiresIn', (int) config('rarv.handoff_ttl') * 60);

        $this->assertDatabaseCount('handoff_tokens', 1);
    }

    public function test_l_url_de_bascule_pointe_vers_le_viewer(): void
    {
        $session = $this->sessionDesktop();

        $url = $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])
            ->json('url');

        $this->assertStringStartsWith((string) config('rarv.viewer_url'), $url);
        $this->assertStringContainsString('/ar/', $url);
    }

    public function test_refuse_la_creation_sans_jeton_viewer(): void
    {
        $session = $this->sessionDesktop();

        $this->postJson('/api/handoff', ['sessionId' => $session->id])->assertUnauthorized();
    }

    /** Un jeton valide sur un AUTRE objet ne doit pas ouvrir de bascule ici. */
    public function test_refuse_une_session_etrangere_au_jeton(): void
    {
        LearningObject::factory()->create(['slug' => 'autre']);
        $session = $this->sessionDesktop();

        $this->withHeaders($this->entete('autre'))
            ->postJson('/api/handoff', ['sessionId' => $session->id])
            ->assertForbidden();
    }

    public function test_refuse_une_session_deja_cloturee(): void
    {
        $session = $this->sessionDesktop();
        $session->forceFill(['ended_at' => now(), 'duration_ms' => 1000])->save();

        $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])
            ->assertStatus(409);
    }

    // --- Consommation (6.3, 6.4) -----------------------------------------

    public function test_la_consommation_rend_un_jeton_et_LA_MEME_session(): void
    {
        $session = $this->sessionDesktop();

        $token = $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])
            ->json('token');

        $reponse = $this->postJson("/api/handoff/{$token}/consume")
            ->assertOk()
            ->assertJsonPath('slug', 'pompe')
            // Le cœur de la bascule : le mobile POURSUIT la session du desktop.
            ->assertJsonPath('sessionId', $session->id);

        $claims = ViewerToken::verify($reponse->json('token'));

        $this->assertNotNull($claims);
        $this->assertSame('pompe', $claims['slug']);
        $this->assertSame('learner-5', $claims['userRef']);
    }

    public function test_le_jeton_rendu_permet_d_ecrire_dans_la_session_du_desktop(): void
    {
        $session = $this->sessionDesktop();

        $token = $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])->json('token');

        $mobile = $this->postJson("/api/handoff/{$token}/consume")->json();

        $this->withHeader('Authorization', "Bearer {$mobile['token']}")
            ->postJson("/api/sessions/{$mobile['sessionId']}/events", [
                'events' => [['type' => 'ar_entered']],
            ])
            ->assertCreated();

        $this->assertTrue($session->fresh()->entered_ar);
    }

    // --- Sécurité (6.6) ---------------------------------------------------

    public function test_un_lien_de_bascule_ne_sert_qu_une_fois(): void
    {
        $session = $this->sessionDesktop();

        $token = $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])->json('token');

        $this->postJson("/api/handoff/{$token}/consume")->assertOk();
        $this->postJson("/api/handoff/{$token}/consume")->assertStatus(410);
    }

    public function test_un_lien_expire_est_refuse(): void
    {
        $session = $this->sessionDesktop();

        $bascule = HandoffToken::create([
            'token' => HandoffToken::genererToken(),
            'learning_object_id' => $this->objet->id,
            'view_session_id' => $session->id,
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson("/api/handoff/{$bascule->token}/consume")->assertStatus(410);
    }

    public function test_un_lien_inconnu_renvoie_404(): void
    {
        $this->postJson('/api/handoff/nimportequoi/consume')->assertNotFound();
    }

    // --- Sondage par le desktop (6.5) -------------------------------------

    public function test_le_desktop_voit_la_bascule_et_le_passage_en_ra(): void
    {
        $session = $this->sessionDesktop();

        $this->withHeaders($this->entete())
            ->getJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('enteredAr', false)
            ->assertJsonPath('basculeUtilisee', false);

        $token = $this->withHeaders($this->entete())
            ->postJson('/api/handoff', ['sessionId' => $session->id])->json('token');
        $mobile = $this->postJson("/api/handoff/{$token}/consume")->json();

        $this->withHeader('Authorization', "Bearer {$mobile['token']}")
            ->postJson("/api/sessions/{$mobile['sessionId']}/events", [
                'events' => [
                    ['type' => 'ar_entered'],
                    ['type' => 'annotation_opened', 'payload' => ['annotation_id' => 1]],
                ],
            ]);

        $this->withHeaders($this->entete())
            ->getJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('enteredAr', true)
            ->assertJsonPath('basculeUtilisee', true)
            ->assertJsonPath('eventCount', 2);
    }

    public function test_le_sondage_exige_un_jeton_et_refuse_une_session_etrangere(): void
    {
        $session = $this->sessionDesktop();
        LearningObject::factory()->create(['slug' => 'autre']);

        $this->getJson("/api/sessions/{$session->id}")->assertUnauthorized();

        $this->withHeaders($this->entete('autre'))
            ->getJson("/api/sessions/{$session->id}")
            ->assertForbidden();
    }
}
