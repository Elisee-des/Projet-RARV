<?php

namespace Tests\Feature\Api;

use App\Models\Attempt;
use App\Models\LearnerProgress;
use App\Models\Question;
use App\Models\Quiz;
use App\Support\ViewerToken;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Projet 02, étapes 7.5 et 7.6 — Attestation et réinitialisation.
 */
class LabAttestationApiTest extends TestCase
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

    private function validerLeParcours(string $userRef = 'apprenant-test'): void
    {
        $this->reussirLeQuiz($userRef);

        $this->putJson('/api/progress', [
            'visitedPoints' => [],
            'completedPoints' => self::REQUIS,
            'totalTimeMs' => 1_140_000, // 19 min
        ], $this->entetes($userRef))->assertOk()->assertJsonPath('completed', true);
    }

    // ---------------------------------------------------------------- 7.6

    public function test_l_attestation_est_refusee_tant_que_le_parcours_n_est_pas_valide(): void
    {
        $this->putJson('/api/progress', [
            'visitedPoints' => [], 'completedPoints' => ['POI_01'],
        ], $this->entetes())->assertOk();

        $this->getJson('/api/attestation', $this->entetes())
            ->assertStatus(409)
            ->assertJsonPath('quizPassed', false)
            ->assertJsonCount(5, 'missingRequired');
    }

    public function test_l_attestation_est_refusee_sans_progression(): void
    {
        $this->getJson('/api/attestation', $this->entetes())->assertNotFound();
    }

    public function test_l_attestation_exige_un_jeton(): void
    {
        $this->getJson('/api/attestation')->assertUnauthorized();
    }

    public function test_l_attestation_est_delivree_apres_validation(): void
    {
        $this->validerLeParcours();

        $reponse = $this->get('/api/attestation', $this->entetes())
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringContainsString(
            'attachment; filename="attestation-atelier-maintenance-01-apprenant-test.pdf"',
            $reponse->headers->get('Content-Disposition') ?? ''
        );

        // Une attestation reflète l'état à l'instant de sa demande : jamais de cache.
        $this->assertStringContainsString('no-store', $reponse->headers->get('Cache-Control') ?? '')
        ;
    }

    public function test_le_pdf_est_structurellement_valide(): void
    {
        $this->validerLeParcours();

        $pdf = $this->get('/api/attestation', $this->entetes())->assertOk()->content();

        $this->assertStringStartsWith('%PDF-1.4', $pdf);
        $this->assertStringEndsWith("%%EOF\n", $pdf);

        // La table de références croisées doit pointer sur de vrais objets,
        // sinon le lecteur refuse d'ouvrir le fichier.
        preg_match('/startxref\s+(\d+)/', $pdf, $trouve);
        $this->assertSame('xref', substr($pdf, (int) $trouve[1], 4));

        preg_match_all('/^(\d{10}) 00000 n $/m', $pdf, $offsets);

        foreach ($offsets[1] as $index => $offset) {
            $this->assertStringStartsWith(
                ($index + 1).' 0 obj',
                substr($pdf, (int) $offset),
                'Un décalage de la table xref ne pointe pas sur son objet.'
            );
        }

        // Les longueurs de flux déclarées doivent être exactes.
        preg_match_all('/<< \/Length (\d+) >>\nstream\n(.*?)\nendstream/s', $pdf, $flux);

        foreach ($flux[1] as $index => $longueur) {
            $this->assertSame((int) $longueur, strlen($flux[2][$index]));
        }
    }

    public function test_le_pdf_porte_les_donnees_relues_en_base(): void
    {
        $this->validerLeParcours();

        $pdf = $this->get('/api/attestation', $this->entetes())->assertOk()->content();

        $this->assertStringContainsString('Attestation de fin de formation', $pdf);
        $this->assertStringContainsString('apprenant-test', $pdf);
        $this->assertStringContainsString('atelier-maintenance-01', $pdf);

        // Score et durée relus en base, pas fournis par le client.
        $this->assertStringContainsString('20 / 20', $pdf);
        $this->assertStringContainsString('19 min', $pdf);
        $this->assertStringContainsString('6 / 6', $pdf);
    }

    /**
     * Les polices de base n'ont pas d'Unicode : un octet par caractère. Un PDF
     * contenant de l'UTF-8 brut afficherait des caractères fantaisistes — et
     * personne ne relit une attestation générée.
     */
    public function test_le_pdf_ne_contient_pas_d_utf8_brut(): void
    {
        $this->validerLeParcours();

        $pdf = $this->get('/api/attestation', $this->entetes())->assertOk()->content();

        preg_match_all('/\((.*?)\) Tj/', $pdf, $litteraux);

        $this->assertNotEmpty($litteraux[1], 'Le PDF ne contient aucun texte.');

        foreach ($litteraux[1] as $litteral) {
            // Un « é » en UTF-8 s'écrit sur DEUX octets (0xC3 0xA9) ; en
            // WinAnsi sur un seul (0xE9). La présence de ces séquences signale
            // une conversion oubliée.
            foreach (["\xC3\xA9", "\xC3\xA8", "\xC3\xA0", "\xC3\xAA", "\xC3\xB4"] as $sequence) {
                $this->assertStringNotContainsString($sequence, $litteral);
            }
        }

        // Et le titre doit bien porter des accents convertis, sinon le test
        // ci-dessus passerait sur un document sans le moindre caractère accentué.
        $this->assertStringContainsString(
            iconv('UTF-8', 'CP1252', 'évaluation'),
            $pdf,
            'Aucun accent converti : le contrôle ne prouverait rien.'
        );
    }

    public function test_le_code_de_verification_est_stable_et_propre_a_l_apprenant(): void
    {
        $this->validerLeParcours('apprenant-a');
        $this->validerLeParcours('apprenant-b');

        $premier = $this->get('/api/attestation', $this->entetes('apprenant-a'))->content();
        $repete = $this->get('/api/attestation', $this->entetes('apprenant-a'))->content();
        $autre = $this->get('/api/attestation', $this->entetes('apprenant-b'))->content();

        preg_match('/([0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4})/', $premier, $codeA);
        preg_match('/([0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4})/', $repete, $codeARepete);
        preg_match('/([0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4})/', $autre, $codeB);

        $this->assertNotEmpty($codeA[1] ?? '');
        $this->assertSame($codeA[1], $codeARepete[1], 'Le code doit être stable pour un même apprenant.');
        $this->assertNotSame($codeA[1], $codeB[1] ?? '', 'Deux apprenants ne peuvent pas partager un code.');
    }

    /**
     * 🔒 Étape 10.9 — la règle est REJOUÉE à la délivrance. Un poste devenu
     * obligatoire après coup doit invalider une attestation déjà « acquise ».
     */
    public function test_la_completion_est_reverifiee_a_la_delivrance(): void
    {
        $this->validerLeParcours();

        $this->get('/api/attestation', $this->entetes())->assertOk();

        // Le poste facultatif POI_03 devient obligatoire.
        \App\Models\InteractionPoint::query()->where('code', 'POI_03')->update(['required' => true]);

        $this->getJson('/api/attestation', $this->entetes())
            ->assertStatus(409)
            ->assertJsonPath('missingRequired', ['POI_03']);
    }

    // ---------------------------------------------------------------- 7.5

    public function test_recommencer_efface_la_progression(): void
    {
        $this->validerLeParcours();

        $this->deleteJson('/api/progress', [], $this->entetes())
            ->assertOk()
            ->assertJsonPath('attemptsPreserved', true);

        $this->assertSame(0, LearnerProgress::count());

        $this->getJson('/api/progress', $this->entetes())
            ->assertOk()
            ->assertJsonPath('completed', false)
            ->assertJsonPath('completedPoints', []);
    }

    /**
     * ⚠️ `max_attempts` est une règle d'évaluation, pas un état de parcours.
     * La contourner en cliquant sur « Recommencer » viderait la décision D5 de
     * son sens.
     */
    public function test_recommencer_ne_rend_pas_les_tentatives_de_quiz(): void
    {
        $this->reussirLeQuiz();
        $this->reussirLeQuiz();

        $this->assertSame(2, Attempt::count());

        $this->deleteJson('/api/progress', [], $this->entetes())->assertOk();

        $this->assertSame(2, Attempt::count());

        $this->postJson('/api/attempts', ['quizId' => $this->quiz->id], $this->entetes())
            ->assertStatus(409)
            ->assertJsonPath('attemptsUsed', 2);
    }

    public function test_recommencer_n_efface_que_sa_propre_progression(): void
    {
        $this->validerLeParcours('apprenant-a');
        $this->validerLeParcours('apprenant-b');

        $this->deleteJson('/api/progress', [], $this->entetes('apprenant-a'))->assertOk();

        $this->assertSame(1, LearnerProgress::count());
        $this->assertSame('apprenant-b', LearnerProgress::firstOrFail()->user_ref);
    }
}
