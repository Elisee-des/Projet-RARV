<?php

namespace Tests\Feature\Api;

use App\Models\Choice;
use App\Models\Quiz;
use App\Support\ViewerToken;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Projet 02, étape 2.4 — **La preuve de la décision D5.**
 *
 * Ces tests sont la raison d'être de l'étape : ils échouent si la moindre
 * indication de bonne réponse quitte le serveur avant soumission.
 */
class LabQuizApiTest extends TestCase
{
    use RefreshDatabase;

    private string $jeton;

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AtelierMaintenanceSeeder::class);

        $this->quiz = Quiz::firstOrFail();
        $this->jeton = ViewerToken::issue([
            'slug' => 'atelier-maintenance-01',
            'module' => 'labo-formation',
            'userRef' => 'apprenant-test',
        ]);
    }

    /** @param array<string, mixed> $entetes */
    private function avecJeton(array $entetes = []): array
    {
        return ['Authorization' => 'Bearer '.$this->jeton] + $entetes;
    }

    public function test_le_quiz_expose_ses_dix_questions(): void
    {
        $this->getJson("/api/quizzes/{$this->quiz->id}", $this->avecJeton())
            ->assertOk()
            ->assertJsonPath('data.passScore', 70)
            ->assertJsonPath('data.maxScore', 20)
            ->assertJsonPath('data.timeLimitS', 600)
            ->assertJsonCount(10, 'data.questions')
            ->assertJsonStructure([
                'data' => [
                    'id', 'title', 'passScore', 'maxAttempts', 'timeLimitS',
                    'maxScore', 'questionCount',
                    'questions' => [['id', 'order', 'type', 'statement', 'points', 'choices' => [['id', 'label']]]],
                ],
            ]);
    }

    /**
     * 🔒 LE test de l'étape 2.11.
     *
     * Il vérifie la chaîne brute et non la structure décodée : une fuite peut
     * passer par un champ inattendu, un attribut ajouté à un modèle, un
     * `whenLoaded` mal placé. Chercher dans le corps de la réponse attrape
     * tout, quelle que soit la forme.
     */
    public function test_is_correct_ne_quitte_jamais_le_serveur(): void
    {
        $reponse = $this->getJson("/api/quizzes/{$this->quiz->id}", $this->avecJeton())->assertOk();

        $corps = $reponse->getContent();

        foreach (['is_correct', 'isCorrect', 'correct', 'expected', 'answer'] as $fuite) {
            $this->assertStringNotContainsStringIgnoringCase(
                $fuite,
                $corps,
                "La réponse HTTP contient « {$fuite} » : une bonne réponse a fui hors du serveur."
            );
        }
    }

    /**
     * L'explication donne la réponse. Elle n'est renvoyée qu'après soumission.
     */
    public function test_les_explications_ne_sont_pas_renvoyees_avant_soumission(): void
    {
        $reponse = $this->getJson("/api/quizzes/{$this->quiz->id}", $this->avecJeton())->assertOk();

        $this->assertStringNotContainsString('S · C · I · V', $reponse->getContent());

        foreach ($reponse->json('data.questions') as $question) {
            $this->assertArrayNotHasKey('explanation', $question);
        }
    }

    /**
     * Seconde barrière : même sérialisé directement, un modèle Choice ne peut
     * pas divulguer `is_correct` — il est masqué au niveau du modèle.
     */
    public function test_le_modele_choice_masque_is_correct_a_la_serialisation(): void
    {
        $choix = Choice::query()->where('is_correct', true)->firstOrFail();

        $this->assertTrue($choix->is_correct, 'La valeur reste lisible côté serveur.');
        $this->assertArrayNotHasKey('is_correct', $choix->toArray());
    }

    public function test_le_quiz_exige_un_jeton(): void
    {
        $this->getJson("/api/quizzes/{$this->quiz->id}")->assertUnauthorized();
    }

    public function test_un_jeton_d_un_autre_contenu_ne_donne_pas_acces_au_quiz(): void
    {
        $autre = ViewerToken::issue([
            'slug' => 'pompe-centrifuge-01',
            'module' => 'viewer-ra',
            'userRef' => 'apprenant-test',
        ]);

        $this->getJson("/api/quizzes/{$this->quiz->id}", ['Authorization' => 'Bearer '.$autre])
            ->assertNotFound();
    }

    public function test_le_nombre_de_bonnes_reponses_n_est_pas_deductible_du_nombre_de_propositions(): void
    {
        $reponse = $this->getJson("/api/quizzes/{$this->quiz->id}", $this->avecJeton())->assertOk();

        foreach ($reponse->json('data.questions') as $question) {
            $attendu = $question['type'] === 'truefalse' ? 2 : 4;

            $this->assertCount(
                $attendu,
                $question['choices'],
                "La question {$question['id']} n'expose pas le nombre attendu de propositions."
            );
        }
    }
}
