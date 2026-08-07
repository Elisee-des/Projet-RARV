<?php

namespace Tests\Feature\Api;

use App\Models\LearningObject;
use App\Models\SessionEvent;
use App\Models\ViewSession;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Étapes 2.4 → 2.6 — Sessions de consultation et journal d'événements.
 */
class ViewSessionApiTest extends TestCase
{
    use RefreshDatabase;

    private LearningObject $objet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->objet = LearningObject::factory()->create(['slug' => 'pompe']);
    }

    /** @param array<string, mixed> $claims */
    private function entete(array $claims = []): array
    {
        $token = ViewerToken::issue($claims + [
            'slug' => 'pompe',
            'userRef' => 'learner-42',
            'lmsContext' => 'cours-maintenance',
        ]);

        return ['Authorization' => "Bearer {$token}"];
    }

    private function sessionOuverte(): ViewSession
    {
        return ViewSession::create([
            'learning_object_id' => $this->objet->id,
            'started_at' => now()->subMinute(),
        ]);
    }

    // --- Authentification -------------------------------------------------

    public function test_refuse_la_creation_de_session_sans_jeton(): void
    {
        $this->postJson('/api/sessions')->assertUnauthorized();
    }

    public function test_refuse_un_jeton_falsifie(): void
    {
        $this->withHeader('Authorization', 'Bearer '.ViewerToken::issue(['slug' => 'pompe']).'X')
            ->postJson('/api/sessions')
            ->assertUnauthorized();
    }

    public function test_refuse_un_jeton_expire(): void
    {
        $this->withHeader('Authorization', 'Bearer '.ViewerToken::issue(['slug' => 'pompe'], -1))
            ->postJson('/api/sessions')
            ->assertUnauthorized();
    }

    // --- Création ---------------------------------------------------------

    public function test_cree_une_session(): void
    {
        $this->withHeaders($this->entete())
            ->postJson('/api/sessions', ['deviceType' => 'android', 'xrSupported' => true])
            ->assertCreated()
            ->assertJsonStructure(['sessionId', 'startedAt']);

        $this->assertDatabaseCount('view_sessions', 1);
    }

    /**
     * Point de sécurité clé : l'identité de l'apprenant vient du jeton signé,
     * jamais du corps de la requête.
     */
    public function test_l_identite_provient_du_jeton_et_non_du_corps(): void
    {
        $this->withHeaders($this->entete())
            ->postJson('/api/sessions', [
                'userRef' => 'usurpateur',
                'lmsContext' => 'faux-cours',
                'deviceType' => 'android',
            ])
            ->assertCreated();

        $session = ViewSession::firstOrFail();

        $this->assertSame('learner-42', $session->user_ref);
        $this->assertSame('cours-maintenance', $session->lms_context);
    }

    public function test_refuse_un_type_d_appareil_inconnu(): void
    {
        $this->withHeaders($this->entete())
            ->postJson('/api/sessions', ['deviceType' => 'grille-pain'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('deviceType');
    }

    // --- Événements -------------------------------------------------------

    public function test_enregistre_un_lot_d_evenements(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", [
                'events' => [
                    ['type' => 'model_loaded'],
                    ['type' => 'annotation_opened', 'payload' => ['annotation_id' => 7]],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('accepted', 2);

        $this->assertDatabaseCount('session_events', 2);
        $this->assertSame(7, SessionEvent::where('type', 'annotation_opened')->first()->payload['annotation_id']);
    }

    public function test_refuse_un_type_d_evenement_inconnu(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", [
                'events' => [['type' => 'je_triche']],
            ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('session_events', 0);
    }

    public function test_refuse_un_lot_vide(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", ['events' => []])
            ->assertUnprocessable();
    }

    /** Le passage en RA est DÉRIVÉ des événements, jamais déclaré par le client. */
    public function test_l_evenement_ar_entered_leve_le_drapeau_de_session(): void
    {
        $session = $this->sessionOuverte();
        $this->assertFalse($session->entered_ar);

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", [
                'events' => [['type' => 'ar_entered']],
            ])
            ->assertCreated()
            ->assertJsonPath('enteredAr', true);

        $this->assertTrue($session->fresh()->entered_ar);
    }

    // --- Clôture ----------------------------------------------------------

    public function test_la_cloture_calcule_la_duree(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())
            ->patchJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonStructure(['sessionId', 'durationMs', 'enteredAr', 'annotationsConsultees']);

        $this->assertGreaterThan(0, $session->fresh()->duration_ms);
        $this->assertNotNull($session->fresh()->ended_at);
    }

    public function test_la_cloture_liste_les_annotations_consultees(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", [
                'events' => [
                    ['type' => 'annotation_opened', 'payload' => ['annotation_id' => 2]],
                    ['type' => 'annotation_opened', 'payload' => ['annotation_id' => 5]],
                    ['type' => 'annotation_opened', 'payload' => ['annotation_id' => 2]],
                ],
            ]);

        $this->withHeaders($this->entete())
            ->patchJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('annotationsConsultees', [2, 5]);
    }

    public function test_refuse_une_double_cloture(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}")->assertOk();
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}")->assertStatus(409);
    }

    public function test_refuse_des_evenements_apres_cloture(): void
    {
        $session = $this->sessionOuverte();

        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $this->withHeaders($this->entete())
            ->postJson("/api/sessions/{$session->id}/events", [
                'events' => [['type' => 'model_loaded']],
            ])
            ->assertStatus(409);
    }

    public function test_une_session_inconnue_renvoie_404(): void
    {
        $this->withHeaders($this->entete())
            ->patchJson('/api/sessions/019fdc00-0000-0000-0000-000000000000')
            ->assertNotFound();
    }
}
