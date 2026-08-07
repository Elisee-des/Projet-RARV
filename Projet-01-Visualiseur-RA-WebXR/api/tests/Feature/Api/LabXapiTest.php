<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\XapiStatement;
use App\Support\ViewerToken;
use App\Support\Xapi\LabStatementBuilder;
use App\Support\Xapi\LrsClient;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Projet 02, étapes 9.4 et 9.5 — Traçabilité xAPI du laboratoire.
 */
class LabXapiTest extends TestCase
{
    use RefreshDatabase;

    private const REQUIS = ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'];

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AtelierMaintenanceSeeder::class);

        $this->quiz = Quiz::with('questions.choices')->firstOrFail();
    }

    /** @return array<string, string> */
    private function entetes(string $userRef = 'apprenant-test'): array
    {
        return ['Authorization' => 'Bearer '.ViewerToken::issue([
            'slug' => 'atelier-maintenance-01',
            'module' => 'labo-formation',
            'userRef' => $userRef,
        ])];
    }

    private function ouvrirSession(string $userRef = 'apprenant-test'): string
    {
        return $this->postJson('/api/sessions', ['deviceType' => 'desktop'], $this->entetes($userRef))
            ->assertCreated()
            ->json('sessionId');
    }

    private function reussirLeQuiz(?string $sessionId = null, string $userRef = 'apprenant-test'): void
    {
        $id = $this->postJson(
            '/api/attempts',
            array_filter(['quizId' => $this->quiz->id, 'sessionId' => $sessionId]),
            $this->entetes($userRef)
        )->json('attemptId');

        $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => $this->quiz->questions->map(fn (Question $q) => [
                'questionId' => $q->id,
                'choiceIds' => $q->identifiantsCorrects(),
            ])->all(),
        ], $this->entetes($userRef))->assertOk();
    }

    /** @return list<string> */
    private function verbes(): array
    {
        return XapiStatement::query()
            ->orderBy('created_at')
            ->pluck('verb')
            ->map(fn (string $v) => basename($v))
            ->all();
    }

    // ---------------------------------------------------------------- 9.4

    /**
     * Un quiz est un acte daté : sa trace part à la soumission, pas à la
     * clôture de session. Un apprenant qui ferme son onglet après avoir répondu
     * ne doit pas perdre son évaluation.
     */
    public function test_la_soumission_emet_answered_par_question_puis_scored(): void
    {
        $session = $this->ouvrirSession();

        $this->assertSame(0, XapiStatement::count());

        $this->reussirLeQuiz($session);

        $verbes = $this->verbes();

        $this->assertSame(10, count(array_filter($verbes, fn ($v) => $v === 'answered')));
        $this->assertSame(1, count(array_filter($verbes, fn ($v) => $v === 'scored')));
        $this->assertSame('scored', end($verbes), 'scored doit clore la séquence de la tentative.');
    }

    public function test_la_declaration_scored_porte_un_score_normalise(): void
    {
        $this->reussirLeQuiz();

        $scored = XapiStatement::query()
            ->where('verb', LabStatementBuilder::VERBES['scored'])
            ->firstOrFail();

        $resultat = $scored->statement['result'];

        $this->assertSame(20, $resultat['score']['raw']);
        $this->assertSame(20, $resultat['score']['max']);

        // `scaled` est le seul champ que tous les LRS savent agréger.
        // Comparaison souple : JSON ne distingue pas 1.0 de 1, et la valeur
        // ressort donc en entier après aller-retour en base.
        $this->assertEquals(1, $resultat['score']['scaled']);
        $this->assertTrue($resultat['success']);
        $this->assertTrue($resultat['completion']);
    }

    public function test_chaque_answered_porte_le_poste_source_et_l_objectif(): void
    {
        $this->reussirLeQuiz();

        $answered = XapiStatement::query()
            ->where('verb', LabStatementBuilder::VERBES['answered'])
            ->get();

        $this->assertCount(10, $answered);

        foreach ($answered as $declaration) {
            $extensions = $declaration->statement['result']['extensions'];

            $this->assertNotEmpty($extensions, 'Sans poste source, le LRS ne sait pas où renvoyer l’apprenant.');
        }

        $tousLesPostes = $answered
            ->flatMap(fn ($d) => array_values($d->statement['result']['extensions']))
            ->all();

        $this->assertContains('POI_02', $tousLesPostes);
        $this->assertContains('O2', $tousLesPostes);
    }

    /**
     * 🔒 DÉCISION D5, jusque dans le LRS.
     *
     * Une déclaration xAPI part vers un service TIERS. Y inscrire les
     * identifiants attendus reviendrait à publier le barème — le contournement
     * le plus discret possible de toute la posture anti-triche.
     */
    public function test_aucune_bonne_reponse_ne_fuit_dans_les_declarations(): void
    {
        $session = $this->ouvrirSession();
        $this->reussirLeQuiz($session);
        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())->assertOk();

        $corps = XapiStatement::query()->get()->map(fn ($d) => json_encode($d->statement))->implode(' ');

        foreach (['is_correct', 'isCorrect', 'expected', 'correctChoice', 'explanation'] as $fuite) {
            $this->assertStringNotContainsStringIgnoringCase($fuite, $corps);
        }
    }

    public function test_la_cloture_emet_la_sequence_du_parcours(): void
    {
        $session = $this->ouvrirSession();

        $this->postJson("/api/sessions/{$session}/events", [
            'events' => array_map(
                fn (string $code) => ['type' => 'activity_completed', 'payload' => ['point_code' => $code]],
                self::REQUIS
            ),
        ], $this->entetes())->assertCreated();

        $this->reussirLeQuiz($session);

        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => self::REQUIS,
            'totalTimeMs' => 900_000,
        ], $this->entetes())->assertOk()->assertJsonPath('completed', true);

        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())
            ->assertOk()
            // 1 initialized + 6 experienced + 1 completed + 1 terminated
            ->assertJsonPath('xapiStatements', 9);

        $verbes = $this->verbes();

        $this->assertSame('initialized', $verbes[11], 'La séquence de parcours suit celle du quiz.');
        $this->assertSame(6, count(array_filter($verbes, fn ($v) => $v === 'experienced')));
        $this->assertSame(1, count(array_filter($verbes, fn ($v) => $v === 'completed')));
        $this->assertSame('terminated', end($verbes));
    }

    public function test_un_parcours_incomplet_n_emet_pas_completed(): void
    {
        $session = $this->ouvrirSession();

        $this->postJson("/api/sessions/{$session}/events", [
            'events' => [['type' => 'activity_completed', 'payload' => ['point_code' => 'POI_01']]],
        ], $this->entetes())->assertCreated();

        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())->assertOk();

        $this->assertNotContains('completed', $this->verbes());
    }

    /**
     * Le `registration` est ce qui permet au LRS de recoudre la séquence,
     * y compris quand plusieurs appareils alimentent la même session.
     */
    public function test_le_registration_relie_les_declarations_a_la_session(): void
    {
        $session = $this->ouvrirSession();
        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())->assertOk();

        foreach (XapiStatement::all() as $declaration) {
            $this->assertSame($session, $declaration->statement['context']['registration']);
        }
    }

    public function test_un_poste_est_rattache_a_son_environnement(): void
    {
        $session = $this->ouvrirSession();

        $this->postJson("/api/sessions/{$session}/events", [
            'events' => [['type' => 'activity_completed', 'payload' => ['point_code' => 'POI_04']]],
        ], $this->entetes())->assertCreated();

        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())->assertOk();

        $experienced = XapiStatement::query()
            ->where('verb', LabStatementBuilder::VERBES['experienced'])
            ->firstOrFail();

        $this->assertStringEndsWith('/points/POI_04', $experienced->object_iri);

        // Sans parent, le LRS agrège par activité isolée au lieu d'agréger par
        // module de formation.
        $parent = $experienced->statement['context']['contextActivities']['parent'][0]['id'];
        $this->assertStringEndsWith('/environments/atelier-maintenance-01', $parent);
    }

    /** L'acteur est identifié par compte, jamais par courriel. */
    public function test_l_acteur_est_un_compte_opaque(): void
    {
        $session = $this->ouvrirSession('marie.dupont@exemple.fr');
        $this->patchJson("/api/sessions/{$session}", [], $this->entetes('marie.dupont@exemple.fr'))->assertOk();

        $acteur = XapiStatement::query()->firstOrFail()->statement['actor'];

        $this->assertSame('Agent', $acteur['objectType']);
        $this->assertArrayNotHasKey('mbox', $acteur);
        $this->assertSame('marie.dupont@exemple.fr', $acteur['account']['name']);
    }

    /**
     * Une panne de traçabilité ne doit jamais interrompre la formation.
     */
    public function test_une_panne_de_tracabilite_n_interrompt_pas_la_session(): void
    {
        $session = $this->ouvrirSession();

        // Le LRS tombe. L'interface promet de ne jamais lever ; on suppose ici
        // qu'un pilote mal écrit rompt cette promesse — c'est précisément le
        // cas contre lequel le traceur doit protéger l'apprenant.
        $this->app->bind(LrsClient::class, fn () => new class implements LrsClient
        {
            public function envoyer(XapiStatement $declaration): bool
            {
                throw new RuntimeException('LRS injoignable');
            }

            public function nom(): string
            {
                return 'en-panne';
            }
        });

        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())
            ->assertOk()
            ->assertJsonPath('xapiStatements', 0);
    }

    // ---------------------------------------------------------------- 9.5

    public function test_le_journal_du_lrs_local_est_consultable(): void
    {
        $session = $this->ouvrirSession();
        $this->reussirLeQuiz($session);
        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())->assertOk();

        $this->getJson('/api/dashboard/xapi')
            ->assertOk()
            ->assertJsonPath('driver', 'local')
            ->assertJsonStructure([
                'driver', 'iri', 'total', 'parVerbe',
                'statements' => [['id', 'verb', 'verbCourt', 'objectIri', 'acteur', 'etat', 'statement']],
            ]);
    }

    /**
     * 🔒 En mode démonstration, l'écran est public : la pseudonymisation doit
     * porter sur le CORPS de la déclaration, pas seulement sur la colonne
     * indexée — c'est le corps qui est affiché en clair dans l'inspecteur.
     */
    public function test_le_journal_pseudonymise_l_acteur_en_mode_demonstration(): void
    {
        config()->set('rarv.demo_public', true);

        $session = $this->ouvrirSession('marie.dupont@exemple.fr');
        $this->patchJson("/api/sessions/{$session}", [], $this->entetes('marie.dupont@exemple.fr'))->assertOk();

        $reponse = $this->getJson('/api/dashboard/xapi')->assertOk();

        $this->assertStringNotContainsString('marie.dupont@exemple.fr', $reponse->getContent());
        $this->assertStringContainsString('Apprenant #', $reponse->getContent());
    }

    public function test_hors_demonstration_le_journal_exige_le_secret(): void
    {
        config()->set('rarv.demo_public', false);
        config()->set('rarv.dashboard_secret', 'secret-de-test');

        $this->getJson('/api/dashboard/xapi')->assertUnauthorized();
    }

    // ---------------------------------------------------------------- 11.5

    public function test_le_jeton_invite_ouvre_une_session_sans_compte(): void
    {
        config()->set('rarv.demo_public', true);

        $reponse = $this->getJson('/api/guest-token?slug=atelier-maintenance-01')
            ->assertOk()
            ->assertJsonPath('module', 'labo-formation');

        $this->assertStringStartsWith('invite-', $reponse->json('userRef'));

        $this->postJson('/api/sessions', ['deviceType' => 'desktop'], [
            'Authorization' => 'Bearer '.$reponse->json('token'),
        ])->assertCreated();
    }

    public function test_le_jeton_invite_n_existe_pas_hors_demonstration(): void
    {
        config()->set('rarv.demo_public', false);

        $this->getJson('/api/guest-token?slug=atelier-maintenance-01')->assertNotFound();
    }

    public function test_deux_invites_recoivent_des_identites_distinctes(): void
    {
        config()->set('rarv.demo_public', true);

        $premier = $this->getJson('/api/guest-token')->json('userRef');
        $second = $this->getJson('/api/guest-token')->json('userRef');

        $this->assertNotSame($premier, $second, 'Deux visiteurs partageraient sinon la même progression.');
    }
}
