<?php

namespace Tests\Feature\Api;

use App\Models\Attempt;
use App\Models\Question;
use App\Models\Quiz;
use App\Support\ViewerToken;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Projet 02, étapes 2.5 à 2.7 — Tentatives, correction serveur, anti-triche.
 */
class LabAttemptApiTest extends TestCase
{
    use RefreshDatabase;

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AtelierMaintenanceSeeder::class);

        $this->quiz = Quiz::with('questions.choices')->firstOrFail();
    }

    private function jeton(string $userRef = 'apprenant-test'): string
    {
        return ViewerToken::issue([
            'slug' => 'atelier-maintenance-01',
            'module' => 'labo-formation',
            'userRef' => $userRef,
        ]);
    }

    /** @return array<string, string> */
    private function entetes(string $userRef = 'apprenant-test'): array
    {
        return ['Authorization' => 'Bearer '.$this->jeton($userRef)];
    }

    private function ouvrir(string $userRef = 'apprenant-test'): string
    {
        return $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes($userRef))
            ->json('attemptId');
    }

    /**
     * Toutes les bonnes réponses, telles que le serveur les connaît.
     *
     * @return list<array{questionId: int, choiceIds: list<int>}>
     */
    private function reponsesParfaites(): array
    {
        return $this->quiz->questions->map(fn (Question $q) => [
            'questionId' => $q->id,
            'choiceIds' => $q->identifiantsCorrects(),
        ])->all();
    }

    /** @return list<array{questionId: int, choiceIds: list<int>}> */
    private function reponsesVides(): array
    {
        return $this->quiz->questions->map(fn (Question $q) => [
            'questionId' => $q->id,
            'choiceIds' => [],
        ])->all();
    }

    // ---------------------------------------------------------------- 2.5

    public function test_ouvre_une_tentative(): void
    {
        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes())
            ->assertCreated()
            ->assertJsonPath('attemptNumber', 1)
            ->assertJsonPath('attemptsRemaining', 1)
            ->assertJsonPath('timeLimitS', 600)
            ->assertJsonStructure(['attemptId', 'startedAt', 'timeRemainingS', 'resumed']);
    }

    /**
     * Un rechargement de page en plein quiz ne doit pas consommer une
     * tentative supplémentaire.
     */
    public function test_une_tentative_non_soumise_est_reprise_et_non_dupliquee(): void
    {
        $premiere = $this->ouvrir();

        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes())
            ->assertOk()
            ->assertJsonPath('attemptId', $premiere)
            ->assertJsonPath('resumed', true);

        $this->assertSame(1, Attempt::count());
    }

    public function test_l_ouverture_exige_un_jeton(): void
    {
        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id])->assertUnauthorized();
    }

    // ---------------------------------------------------------------- 2.6

    public function test_un_sans_faute_donne_vingt_sur_vingt_et_valide(): void
    {
        $id = $this->ouvrir();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesParfaites()], $this->entetes())
            ->assertOk()
            ->assertJsonPath('score', 20)
            ->assertJsonPath('maxScore', 20)
            ->assertJsonPath('percentage', 100)
            ->assertJsonPath('passed', true)
            ->assertJsonPath('timedOut', false)
            ->assertJsonCount(10, 'results');
    }

    /**
     * ⚠️ Garde-fou de conception du quiz.
     *
     * Rédigées dans l'ordre naturel, les bonnes réponses se retrouvaient toutes
     * en première position : cocher systématiquement la première proposition
     * donnait 14/20, soit exactement le seuil de réussite. Les propositions du
     * seeder sont donc délibérément dispersées, et ce test empêche la
     * régression si quelqu'un réécrit le contenu.
     */
    public function test_cocher_systematiquement_la_premiere_proposition_echoue(): void
    {
        $id = $this->ouvrir();

        $reponses = $this->quiz->questions->map(fn (Question $q) => [
            'questionId' => $q->id,
            'choiceIds' => [$q->choices->first()->id],
        ])->all();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", ['answers' => $reponses], $this->entetes())
            ->assertOk()
            ->assertJsonPath('passed', false);

        $this->assertLessThan(
            14,
            $reponse->json('score'),
            'Une stratégie « toujours la première case » atteint le seuil de réussite : '
            .'les bonnes réponses sont mal réparties dans le seeder.'
        );
    }

    /** Même garde-fou pour la dernière position. */
    public function test_cocher_systematiquement_la_derniere_proposition_echoue(): void
    {
        $id = $this->ouvrir();

        $reponses = $this->quiz->questions->map(fn (Question $q) => [
            'questionId' => $q->id,
            'choiceIds' => [$q->choices->last()->id],
        ])->all();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $reponses], $this->entetes())
            ->assertOk()
            ->assertJsonPath('passed', false);
    }

    public function test_une_copie_blanche_donne_zero_et_echoue(): void
    {
        $id = $this->ouvrir();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesVides()], $this->entetes())
            ->assertOk()
            ->assertJsonPath('score', 0)
            ->assertJsonPath('passed', false);
    }

    /**
     * Le seuil est à 70 % : 7 questions justes sur 10 valent 14/20 et passent,
     * 6 valent 12/20 et échouent. C'est la frontière qu'il faut vérifier.
     */
    public function test_le_seuil_de_reussite_est_applique_au_point_pres(): void
    {
        $parfaites = $this->reponsesParfaites();

        // 6 justes → 12/20 → 60 % → échec
        $id = $this->ouvrir('apprenant-a');
        $reponses = $parfaites;
        for ($i = 6; $i < 10; $i++) {
            $reponses[$i]['choiceIds'] = [];
        }
        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $reponses], $this->entetes('apprenant-a'))
            ->assertOk()
            ->assertJsonPath('score', 12)
            ->assertJsonPath('percentage', 60)
            ->assertJsonPath('passed', false);

        // 7 justes → 14/20 → 70 % → réussite
        $id = $this->ouvrir('apprenant-b');
        $reponses = $parfaites;
        for ($i = 7; $i < 10; $i++) {
            $reponses[$i]['choiceIds'] = [];
        }
        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $reponses], $this->entetes('apprenant-b'))
            ->assertOk()
            ->assertJsonPath('score', 14)
            ->assertJsonPath('percentage', 70)
            ->assertJsonPath('passed', true);
    }

    /**
     * Barème « tout ou rien » sur les questions à choix multiple : cocher 2
     * bonnes réponses sur 3 ne vaut pas un demi-point.
     */
    public function test_une_question_a_choix_multiple_incomplete_ne_rapporte_rien(): void
    {
        $question = $this->quiz->questions->firstWhere('type', 'multiple');
        $corrects = $question->identifiantsCorrects();

        $id = $this->ouvrir();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => [[
                'questionId' => $question->id,
                'choiceIds' => array_slice($corrects, 0, count($corrects) - 1),
            ]],
        ], $this->entetes())->assertOk();

        $resultat = collect($reponse->json('results'))->firstWhere('questionId', $question->id);

        $this->assertFalse($resultat['correct']);
        $this->assertSame(0, $resultat['pointsEarned']);
    }

    public function test_cocher_toutes_les_cases_ne_rapporte_rien(): void
    {
        $question = $this->quiz->questions->firstWhere('type', 'multiple');

        $id = $this->ouvrir();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => [[
                'questionId' => $question->id,
                'choiceIds' => $question->choices->pluck('id')->all(),
            ]],
        ], $this->entetes())->assertOk();

        $resultat = collect($reponse->json('results'))->firstWhere('questionId', $question->id);

        $this->assertFalse($resultat['correct']);
    }

    public function test_cocher_deux_cases_sur_une_question_a_choix_unique_est_faux(): void
    {
        $question = $this->quiz->questions->firstWhere('type', 'single');

        $id = $this->ouvrir();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => [[
                'questionId' => $question->id,
                'choiceIds' => $question->choices->take(2)->pluck('id')->all(),
            ]],
        ], $this->entetes())->assertOk();

        $resultat = collect($reponse->json('results'))->firstWhere('questionId', $question->id);

        $this->assertFalse($resultat['correct']);
    }

    /**
     * Envoyer l'identifiant d'une proposition d'une AUTRE question ne doit
     * rien produire : le correcteur filtre sur les propositions légitimes.
     */
    public function test_une_proposition_venue_d_une_autre_question_est_ignoree(): void
    {
        $cible = $this->quiz->questions->firstWhere('type', 'single');
        $autre = $this->quiz->questions->where('id', '!=', $cible->id)->first();

        $id = $this->ouvrir();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", [
            'answers' => [[
                'questionId' => $cible->id,
                'choiceIds' => [...$cible->identifiantsCorrects(), ...$autre->identifiantsCorrects()],
            ]],
        ], $this->entetes())->assertOk();

        $resultat = collect($reponse->json('results'))->firstWhere('questionId', $cible->id);

        // Les identifiants étrangers ont été écartés : il reste la bonne réponse.
        $this->assertSame($cible->identifiantsCorrects(), $resultat['chosenChoiceIds']);
        $this->assertTrue($resultat['correct']);
    }

    public function test_le_resultat_renvoie_les_explications_et_le_poste_source(): void
    {
        $id = $this->ouvrir();

        $reponse = $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesVides()], $this->entetes())
            ->assertOk();

        $resultats = $reponse->json('results');

        foreach ($resultats as $resultat) {
            $this->assertNotEmpty($resultat['explanation']);
            $this->assertNotEmpty($resultat['expectedChoiceIds']);
        }

        // La question sur l'ordre de la consignation renvoie bien vers le poste
        // qui l'enseigne — c'est ce lien qui rend le tableau de bord actionnable.
        $codes = array_column($resultats, 'sourcePointCode');
        $this->assertContains('POI_02', $codes);
        $this->assertContains('POI_03', $codes);
    }

    // ---------------------------------------------------------------- 2.7

    public function test_une_tentative_soumise_est_definitivement_verrouillee(): void
    {
        $id = $this->ouvrir();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesVides()], $this->entetes())
            ->assertOk();

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesParfaites()], $this->entetes())
            ->assertStatus(409);

        // Le score de la première soumission n'a pas bougé.
        $this->assertSame(0, Attempt::find($id)->score);
    }

    public function test_une_tentative_ne_peut_pas_etre_soumise_par_un_autre_apprenant(): void
    {
        $id = $this->ouvrir('apprenant-a');

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesVides()], $this->entetes('intrus'))
            ->assertForbidden();
    }

    public function test_le_nombre_de_tentatives_est_limite(): void
    {
        foreach (range(1, 2) as $tour) {
            $id = $this->ouvrir();
            $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesVides()], $this->entetes())
                ->assertOk();
        }

        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes())
            ->assertStatus(409)
            ->assertJsonPath('maxAttempts', 2)
            ->assertJsonPath('attemptsUsed', 2);
    }

    /**
     * Le chronomètre est validé par le serveur : laisser l'onglet ouvert pour
     * chercher les réponses ferme la tentative à zéro.
     */
    public function test_une_soumission_hors_delai_est_annulee(): void
    {
        $id = $this->ouvrir();

        Carbon::setTestNow(now()->addSeconds(700)); // limite 600 s + tolérance 5 s

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesParfaites()], $this->entetes())
            ->assertOk()
            ->assertJsonPath('timedOut', true)
            ->assertJsonPath('score', 0)
            ->assertJsonPath('passed', false);

        Carbon::setTestNow();
    }

    public function test_une_soumission_dans_la_tolerance_reste_valide(): void
    {
        $id = $this->ouvrir();

        Carbon::setTestNow(now()->addSeconds(603)); // sous 600 + 5 s de tolérance

        $this->postJson("/api/attempts/{$id}/submit", ['answers' => $this->reponsesParfaites()], $this->entetes())
            ->assertOk()
            ->assertJsonPath('timedOut', false)
            ->assertJsonPath('score', 20);

        Carbon::setTestNow();
    }

    public function test_le_temps_restant_est_calcule_par_le_serveur(): void
    {
        $id = $this->ouvrir();

        Carbon::setTestNow(now()->addSeconds(120));

        $this->getJson("/api/attempts/{$id}", $this->entetes())
            ->assertOk()
            ->assertJsonPath('timeRemainingS', 480);

        Carbon::setTestNow();
    }

    public function test_un_quiz_d_un_autre_environnement_est_refuse(): void
    {
        $autre = ViewerToken::issue([
            'slug' => 'pompe-centrifuge-01',
            'module' => 'viewer-ra',
            'userRef' => 'apprenant-test',
        ]);

        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], ['Authorization' => 'Bearer '.$autre])
            ->assertNotFound();
    }
}
