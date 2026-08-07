<?php

namespace Tests\Feature\Api;

use App\Models\LearnerProgress;
use App\Models\Question;
use App\Models\Quiz;
use App\Support\ViewerToken;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Projet 02, étapes 2.8 et 2.9 — Progression, reprise et journal d'événements.
 */
class LabProgressApiTest extends TestCase
{
    use RefreshDatabase;

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

    private function reussirLeQuiz(string $userRef = 'apprenant-test'): void
    {
        $id = $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes($userRef))
            ->json('attemptId');

        $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => $this->quiz->questions->map(fn (Question $q) => [
                'questionId' => $q->id,
                'choiceIds' => $q->identifiantsCorrects(),
            ])->all(),
        ], $this->entetes($userRef))->assertOk();
    }

    public function test_une_progression_vierge_est_renvoyee_pour_un_nouvel_apprenant(): void
    {
        $this->getJson('/api/progress', $this->entetes())
            ->assertOk()
            ->assertJsonPath('completionPct', 0)
            ->assertJsonPath('completed', false)
            ->assertJsonPath('visitedPoints', [])
            ->assertJsonPath('pointCount', 8)
            ->assertJsonCount(6, 'requiredPoints')
            ->assertJsonCount(6, 'missingRequired');
    }

    public function test_enregistre_et_restitue_la_progression(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => ['POI_01', 'POI_02'],
            'completedPoints' => ['POI_01'],
            'lastPosition' => ['position' => [4.2, 1.65, 6.1], 'rotation' => 90],
            'totalTimeMs' => 125_000,
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('completedPoints', ['POI_01'])
            ->assertJsonPath('completionPct', 13) // 1 / 8
            ->assertJsonPath('lastPosition.rotation', 90);

        // Étape 7.3 — la reprise restitue exactement l'état précédent.
        $this->getJson('/api/progress', $this->entetes())
            ->assertOk()
            ->assertJsonPath('lastPosition.position', [4.2, 1.65, 6.1])
            ->assertJsonPath('totalTimeMs', 125_000);
    }

    public function test_un_poste_termine_est_automatiquement_marque_visite(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => ['POI_04'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('visitedPoints', ['POI_04']);
    }

    /**
     * 🔒 Étape 10.9 — un front modifié ne doit pas pouvoir gonfler sa
     * progression avec des codes inventés.
     */
    public function test_les_codes_de_postes_inconnus_sont_ignores(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => ['POI_01', 'POI_99', 'TRICHE'],
            'completedPoints' => ['POI_42'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('visitedPoints', ['POI_01'])
            ->assertJsonPath('completedPoints', [])
            ->assertJsonPath('completionPct', 0);
    }

    /**
     * 🔒 Le client n'écrit ni `completionPct` ni `completedAt` : ils sont
     * recalculés à chaque écriture.
     */
    public function test_le_client_ne_peut_pas_se_declarer_complet(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => ['POI_01'],
            'completedPoints' => ['POI_01'],
            'completionPct' => 100,
            'completedAt' => '2020-01-01T00:00:00Z',
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('completionPct', 13)
            ->assertJsonPath('completed', false)
            ->assertJsonPath('completedAt', null);
    }

    /**
     * La complétion exige les 6 postes requis **et** le quiz réussi.
     */
    public function test_les_six_postes_requis_ne_suffisent_pas_sans_le_quiz(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('missingRequired', [])
            ->assertJsonPath('quiz.passed', false)
            ->assertJsonPath('completed', false);
    }

    public function test_le_quiz_reussi_ne_suffit_pas_sans_les_postes_requis(): void
    {
        $this->reussirLeQuiz();

        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => ['POI_08'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('quiz.passed', true)
            ->assertJsonPath('completed', false)
            ->assertJsonCount(5, 'missingRequired');
    }

    public function test_les_deux_conditions_reunies_valident_le_parcours(): void
    {
        $this->reussirLeQuiz();

        $reponse = $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('completed', true)
            ->assertJsonPath('completionPct', 75) // 6 / 8 : les 2 facultatifs manquent
            ->assertJsonPath('quiz.best.score', 20);

        $this->assertNotNull($reponse->json('completedAt'));
    }

    /**
     * ⚠️ La complétion dépend de deux sources : les postes terminés, dans
     * `learner_progress`, et le score, dans `attempts`. Réussir le quiz
     * satisfait la règle sans qu'aucune ligne de progression ne soit écrite —
     * une simple lecture doit donc s'en apercevoir.
     */
    public function test_la_lecture_voit_la_completion_atteinte_par_le_quiz_seul(): void
    {
        // Tous les postes requis, mais pas encore le quiz.
        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'],
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('completed', false);

        // Le quiz est réussi : plus aucune écriture de progression n'a lieu.
        $this->reussirLeQuiz();

        $reponse = $this->getJson('/api/progress', $this->entetes())
            ->assertOk()
            ->assertJsonPath('completed', true)
            ->assertJsonPath('quiz.passed', true);

        $this->assertNotNull(
            $reponse->json('completedAt'),
            'La date de complétion doit être posée à la lecture, sinon l’attestation et le HUD divergent.'
        );
    }

    public function test_la_date_de_completion_ne_se_reecrit_pas(): void
    {
        $this->reussirLeQuiz();

        $termines = ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'];

        $premiere = $this->putJson('/api/progress', [
            'visitedPoints' => [], 'completedPoints' => $termines,
        ], $this->entetes())->json('completedAt');

        $seconde = $this->putJson('/api/progress', [
            'visitedPoints' => [], 'completedPoints' => [...$termines, 'POI_03', 'POI_07'],
        ], $this->entetes())
            ->assertJsonPath('completionPct', 100)
            ->json('completedAt');

        $this->assertSame($premiere, $seconde);
    }

    /**
     * Étape 7.7 — le front rejoue ses sauvegardes après une coupure réseau.
     * Un temps plus faible que l'enregistré vient d'un onglet en retard.
     */
    public function test_le_temps_total_ne_regresse_pas(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => [], 'completedPoints' => [], 'totalTimeMs' => 300_000,
        ], $this->entetes())->assertOk();

        $this->putJson('/api/progress', [
            'visitedPoints' => [], 'completedPoints' => [], 'totalTimeMs' => 120_000,
        ], $this->entetes())
            ->assertOk()
            ->assertJsonPath('totalTimeMs', 300_000);
    }

    public function test_deux_apprenants_ont_des_progressions_distinctes(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => ['POI_01'], 'completedPoints' => ['POI_01'],
        ], $this->entetes('apprenant-a'))->assertOk();

        $this->getJson('/api/progress', $this->entetes('apprenant-b'))
            ->assertOk()
            ->assertJsonPath('completedPoints', []);

        $this->assertSame(1, LearnerProgress::count());
    }

    public function test_la_progression_exige_un_jeton(): void
    {
        $this->getJson('/api/progress')->assertUnauthorized();
        $this->putJson('/api/progress', [])->assertUnauthorized();
    }

    // ---------------------------------------------------------------- 2.9

    public function test_une_session_de_laboratoire_accepte_les_evenements_du_module(): void
    {
        $session = $this->postJson('/api/sessions', ['deviceType' => 'desktop'], $this->entetes())
            ->assertCreated()
            ->assertJsonPath('module', 'labo-formation')
            ->json('sessionId');

        $this->postJson("/api/sessions/{$session}/events", [
            'events' => [
                ['type' => 'scene_loaded', 'payload' => ['ms' => 3200]],
                ['type' => 'point_entered', 'payload' => ['point_code' => 'POI_01']],
                ['type' => 'activity_started', 'payload' => ['point_code' => 'POI_01']],
                ['type' => 'activity_completed', 'payload' => ['point_code' => 'POI_01']],
            ],
        ], $this->entetes())->assertCreated();

        $this->patchJson("/api/sessions/{$session}", [], $this->entetes())
            ->assertOk()
            ->assertJsonPath('module', 'labo-formation')
            ->assertJsonPath('postesTermines', ['POI_01'])
            ->assertJsonPath('eventCount', 4);
    }

    public function test_un_type_d_evenement_inconnu_est_refuse(): void
    {
        $session = $this->postJson('/api/sessions', ['deviceType' => 'desktop'], $this->entetes())
            ->json('sessionId');

        $this->postJson("/api/sessions/{$session}/events", [
            'events' => [['type' => 'porte_ouverte']],
        ], $this->entetes())->assertStatus(422);
    }
}
