<?php

namespace Tests\Feature\Api;

use App\Models\Annotation;
use App\Models\LearningObject;
use App\Models\SessionEvent;
use App\Models\ViewSession;
use App\Models\XapiStatement;
use App\Support\CompletionPolicy;
use App\Support\ViewerToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Étapes 7.4 et 7.6 — Traçabilité xAPI et règle de complétion.
 */
class XapiTest extends TestCase
{
    use RefreshDatabase;

    private LearningObject $objet;

    /** @var list<Annotation> */
    private array $annotations;

    protected function setUp(): void
    {
        parent::setUp();

        $this->objet = LearningObject::factory()->create(['slug' => 'pompe']);
        $this->annotations = Annotation::factory()->for($this->objet)->count(3)->create()->all();
    }

    private function entete(): array
    {
        return [
            'Authorization' => 'Bearer '.ViewerToken::issue([
                'slug' => 'pompe',
                'userRef' => 'learner-9',
                'lmsContext' => 'cours-test',
            ]),
        ];
    }

    private function sessionAvecAnnotations(int $combien): ViewSession
    {
        $session = ViewSession::create([
            'learning_object_id' => $this->objet->id,
            'user_ref' => 'learner-9',
            'lms_context' => 'cours-test',
            'device_type' => 'android',
            'xr_supported' => true,
            'entered_ar' => true,
            'started_at' => now()->subMinutes(2),
        ]);

        foreach (array_slice($this->annotations, 0, $combien) as $annotation) {
            SessionEvent::create([
                'view_session_id' => $session->id,
                'type' => 'annotation_opened',
                'payload' => ['annotation_id' => $annotation->id],
                'occurred_at' => now()->subMinute(),
            ]);
        }

        return $session;
    }

    // --- Séquence -------------------------------------------------------

    public function test_la_cloture_emet_la_sequence_complete(): void
    {
        $session = $this->sessionAvecAnnotations(3);

        $this->withHeaders($this->entete())
            ->patchJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('completed', true)
            // initialized + 3 interacted + experienced + completed + terminated
            ->assertJsonPath('xapiStatements', 7);

        $verbes = XapiStatement::orderBy('created_at')->pluck('verb')
            ->map(fn (string $v) => str($v)->afterLast('/')->toString())
            ->all();

        $this->assertSame(
            ['initialized', 'interacted', 'interacted', 'interacted', 'experienced', 'completed', 'terminated'],
            $verbes
        );
    }

    public function test_sans_completion_aucune_declaration_completed(): void
    {
        $session = $this->sessionAvecAnnotations(1);

        $this->withHeaders($this->entete())
            ->patchJson("/api/sessions/{$session->id}")
            ->assertOk()
            ->assertJsonPath('completed', false);

        $this->assertSame(0, XapiStatement::where('verb', 'like', '%/completed')->count());
    }

    // --- Contenu des déclarations ---------------------------------------

    public function test_l_acteur_est_identifie_par_compte_et_non_par_courriel(): void
    {
        $session = $this->sessionAvecAnnotations(3);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $acteur = XapiStatement::first()->statement['actor'];

        $this->assertSame('Agent', $acteur['objectType']);
        $this->assertSame('learner-9', $acteur['account']['name']);
        $this->assertArrayNotHasKey('mbox', $acteur);
    }

    public function test_la_declaration_porte_le_registration_de_session(): void
    {
        $session = $this->sessionAvecAnnotations(2);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        foreach (XapiStatement::all() as $declaration) {
            $this->assertSame($session->id, $declaration->statement['context']['registration']);
        }
    }

    public function test_la_duree_est_au_format_iso_8601(): void
    {
        $session = $this->sessionAvecAnnotations(3);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $completed = XapiStatement::where('verb', 'like', '%/completed')->firstOrFail();

        $this->assertMatchesRegularExpression(
            '/^PT\d+H\d+M\d+S$/',
            $completed->statement['result']['duration']
        );
        $this->assertTrue($completed->statement['result']['completion']);
    }

    public function test_le_contexte_porte_les_indicateurs_de_realite_augmentee(): void
    {
        $session = $this->sessionAvecAnnotations(3);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $extensions = XapiStatement::first()->statement['context']['extensions'];
        $base = config('rarv.xapi_iri');

        $this->assertTrue($extensions["{$base}/extensions/entered-ar"]);
        $this->assertTrue($extensions["{$base}/extensions/xr-supported"]);
        $this->assertSame('android', $extensions["{$base}/extensions/device-type"]);
    }

    public function test_chaque_annotation_ouverte_a_son_iri_propre(): void
    {
        $session = $this->sessionAvecAnnotations(3);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $iris = XapiStatement::where('verb', 'like', '%/interacted')->pluck('object_iri');

        $this->assertCount(3, $iris);
        foreach ($this->annotations as $annotation) {
            $this->assertContains(
                config('rarv.xapi_iri')."/objects/pompe/annotations/{$annotation->id}",
                $iris->all()
            );
        }
    }

    // --- Transport ------------------------------------------------------

    public function test_le_pilote_local_marque_les_declarations_comme_envoyees(): void
    {
        $session = $this->sessionAvecAnnotations(3);
        $this->withHeaders($this->entete())->patchJson("/api/sessions/{$session->id}");

        $this->assertSame(0, XapiStatement::where('etat_envoi', '!=', 'envoye')->count());
        $this->assertNotNull(XapiStatement::first()->envoye_at);
    }

    // --- Règle de complétion (7.6) --------------------------------------

    public function test_le_mode_duree_minimale_ignore_les_annotations(): void
    {
        config()->set('rarv.completion.mode', 'min_duration');
        config()->set('rarv.completion.min_duration_s', 30);

        $session = $this->sessionAvecAnnotations(0);
        $session->forceFill(['duration_ms' => 45_000])->save();

        $this->assertTrue(app(CompletionPolicy::class)->estComplete($session));
    }

    public function test_le_mode_both_exige_les_deux_conditions(): void
    {
        config()->set('rarv.completion.mode', 'both');
        config()->set('rarv.completion.min_duration_s', 600);

        $session = $this->sessionAvecAnnotations(3);
        $session->forceFill(['duration_ms' => 10_000])->save();

        // Toutes les annotations vues, mais durée insuffisante.
        $this->assertFalse(app(CompletionPolicy::class)->estComplete($session));
    }

    public function test_un_objet_sans_annotation_n_est_jamais_complete_en_mode_annotations(): void
    {
        config()->set('rarv.completion.mode', 'all_annotations');

        $vide = LearningObject::factory()->create(['slug' => 'vide']);
        $session = ViewSession::create([
            'learning_object_id' => $vide->id,
            'started_at' => now()->subMinute(),
            'duration_ms' => 60_000,
        ]);

        $this->assertFalse(app(CompletionPolicy::class)->estComplete($session));
    }
}
