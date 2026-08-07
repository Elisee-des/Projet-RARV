<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\Quiz;
use App\Support\ViewerToken;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Projet 02, étape 2.10 — Tableau de bord formateur.
 */
class LabDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-de-test';

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AtelierMaintenanceSeeder::class);

        // Le mode démonstration ouvre le tableau de bord sans secret. Il est
        // actif par défaut pour le portfolio ; on le désactive ici pour tester
        // la voie protégée, et un test dédié couvre la voie ouverte.
        config()->set('rarv.demo_public', false);
        config()->set('rarv.dashboard_secret', self::SECRET);

        $this->quiz = Quiz::with('questions.choices')->firstOrFail();
    }

    /** @return array<string, string> */
    private function formateur(): array
    {
        return ['X-Dashboard-Secret' => self::SECRET];
    }

    /** @return array<string, string> */
    private function apprenant(string $userRef): array
    {
        return ['Authorization' => 'Bearer '.ViewerToken::issue([
            'slug' => 'atelier-maintenance-01',
            'module' => 'labo-formation',
            'userRef' => $userRef,
        ])];
    }

    /**
     * Simule un apprenant : il termine des postes et passe le quiz.
     *
     * @param  list<string>  $postes
     * @param  list<int>  $questionsJustes  index des questions réussies
     */
    private function simuler(string $userRef, array $postes, array $questionsJustes): void
    {
        $entetes = $this->apprenant($userRef);

        $id = $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $entetes)->json('attemptId');

        $reponses = $this->quiz->questions->values()->map(fn (Question $q, int $i) => [
            'questionId' => $q->id,
            'choiceIds' => in_array($i, $questionsJustes, true) ? $q->identifiantsCorrects() : [],
        ])->all();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $reponses], $entetes)->assertOk();

        $this->putJson('/api/progress', [
            'visitedPoints' => $postes,
            'completedPoints' => $postes,
            'totalTimeMs' => 900_000,
        ], $entetes)->assertOk();
    }

    public function test_l_acces_est_refuse_sans_secret(): void
    {
        $this->getJson('/api/dashboard/environments/atelier-maintenance-01')
            ->assertUnauthorized();
    }

    public function test_l_acces_est_refuse_avec_un_mauvais_secret(): void
    {
        $this->getJson('/api/dashboard/environments/atelier-maintenance-01', [
            'X-Dashboard-Secret' => 'presque-le-bon',
        ])->assertUnauthorized();
    }

    /**
     * Un secret non configuré FERME l'accès. C'est le sens de la règle : une
     * configuration oubliée ne doit pas ouvrir les scores de la cohorte.
     */
    public function test_un_tableau_de_bord_non_configure_repond_503(): void
    {
        config()->set('rarv.dashboard_secret', null);

        $this->getJson('/api/dashboard/environments/atelier-maintenance-01', $this->formateur())
            ->assertStatus(503);
    }

    /**
     * Étape 11.5 — mode démonstration : le tableau de bord s'ouvre sans secret
     * pour qu'un recruteur le parcoure en un clic.
     */
    public function test_le_mode_demonstration_ouvre_le_tableau_de_bord(): void
    {
        config()->set('rarv.demo_public', true);
        config()->set('rarv.dashboard_secret', null);

        $this->getJson('/api/dashboard/environments/atelier-maintenance-01')
            ->assertOk()
            ->assertJsonPath('environment.slug', 'atelier-maintenance-01');
    }

    /**
     * 🔒 Ouvrir le tableau de bord ne veut pas dire publier l'identité des
     * apprenants. En mode démonstration, elle est pseudonymisée.
     */
    public function test_le_mode_demonstration_pseudonymise_les_apprenants(): void
    {
        $this->simuler('marie.dupont@exemple.fr', ['POI_01'], [0, 1]);

        config()->set('rarv.demo_public', true);

        $csv = $this->get('/api/dashboard/environments/atelier-maintenance-01/export.csv')
            ->assertOk()
            ->streamedContent();

        $this->assertStringNotContainsString('marie.dupont@exemple.fr', $csv);
        $this->assertStringContainsString('Apprenant #', $csv);
    }

    public function test_hors_demonstration_l_identite_reelle_est_conservee(): void
    {
        $this->simuler('marie.dupont@exemple.fr', ['POI_01'], [0, 1]);

        $csv = $this->get('/api/dashboard/environments/atelier-maintenance-01/export.csv', $this->formateur())
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('marie.dupont@exemple.fr', $csv);
    }

    public function test_les_agregats_de_cohorte_sont_calcules(): void
    {
        $tous = ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'];

        // Deux apprenants au bout, un qui décroche à mi-parcours.
        $this->simuler('a', $tous, range(0, 9));
        $this->simuler('b', $tous, range(0, 8));
        $this->simuler('c', ['POI_01', 'POI_02'], []);

        $reponse = $this->getJson('/api/dashboard/environments/atelier-maintenance-01', $this->formateur())
            ->assertOk()
            ->assertJsonPath('cohorte.apprenants', 3)
            ->assertJsonPath('cohorte.termines', 2)
            ->assertJsonPath('cohorte.tauxCompletion', 67)
            ->assertJsonPath('quiz.tentatives', 3)
            ->assertJsonPath('quiz.reussites', 2);

        $this->assertCount(8, $reponse->json('postes'));
    }

    /**
     * ⭐ L'écran de démonstration : les postes facultatifs, placés à l'écart du
     * parcours, remontent en tête de la liste des moins visités.
     */
    public function test_les_postes_les_moins_visites_arrivent_en_tete(): void
    {
        $this->simuler('a', ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06', 'POI_08'], range(0, 9));
        $this->simuler('b', ['POI_01', 'POI_02'], []);

        $postes = $this->getJson('/api/dashboard/environments/atelier-maintenance-01', $this->formateur())
            ->assertOk()
            ->json('postes');

        $moinsVisites = array_slice(array_column($postes, 'code'), 0, 2);

        sort($moinsVisites);
        $this->assertSame(['POI_03', 'POI_07'], $moinsVisites);
        $this->assertSame(0, $postes[0]['visits']);
    }

    /**
     * ⭐ Étape 9.6 — « 68 % des apprenants ratent la question sur l'ordre de la
     * consignation, elle vient du poste POI_02. »
     */
    public function test_les_questions_les_plus_ratees_arrivent_en_tete_avec_leur_poste(): void
    {
        // Trois apprenants : tous ratent la question 3 (index 2), tous
        // réussissent la question 6 (index 5).
        foreach (['a', 'b', 'c'] as $apprenant) {
            $this->simuler($apprenant, ['POI_01'], [0, 1, 3, 4, 5, 6, 7, 8, 9]);
        }

        $questions = $this->getJson("/api/dashboard/quizzes/{$this->quiz->id}", $this->formateur())
            ->assertOk()
            ->json('questions');

        $pire = $questions[0];

        $this->assertSame(100, $pire['failureRate']);
        $this->assertSame(3, $pire['order']);
        $this->assertSame('POI_02', $pire['sourcePointCode']);
        $this->assertSame('O2', $pire['objectiveCode']);
        $this->assertSame(3, $pire['answered']);
        $this->assertSame(0, $pire['correct']);

        // Une question réussie par tout le monde est en fin de liste.
        $this->assertSame(0, end($questions)['failureRate']);
    }

    /**
     * Le tableau de bord agrège des scores : il ne doit pas non plus livrer
     * les bonnes réponses en clair.
     */
    public function test_le_tableau_de_bord_ne_divulgue_pas_les_bonnes_reponses(): void
    {
        $this->simuler('a', ['POI_01'], [0, 1]);

        $corps = $this->getJson("/api/dashboard/quizzes/{$this->quiz->id}", $this->formateur())
            ->assertOk()
            ->getContent();

        $this->assertStringNotContainsString('is_correct', $corps);
        $this->assertStringNotContainsString('expectedChoiceIds', $corps);
    }

    public function test_export_csv_de_la_cohorte(): void
    {
        $this->simuler('apprenant-a', ['POI_01', 'POI_02'], range(0, 9));

        $reponse = $this->get('/api/dashboard/environments/atelier-maintenance-01/export.csv', $this->formateur())
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $csv = $reponse->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv, 'BOM UTF-8 absent : Excel casserait les accents.');
        $this->assertStringContainsString('apprenant-a', $csv);
        $this->assertStringContainsString('20;oui', $csv);
    }
}
