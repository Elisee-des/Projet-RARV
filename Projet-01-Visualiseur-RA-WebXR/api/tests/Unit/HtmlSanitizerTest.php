<?php

namespace Tests\Unit;

use App\Support\HtmlSanitizer;
use PHPUnit\Framework\TestCase;

/**
 * Étape 9.8 — Purification du HTML des fiches.
 */
class HtmlSanitizerTest extends TestCase
{
    private HtmlSanitizer $purificateur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->purificateur = new HtmlSanitizer;
    }

    // --- Ce qui doit passer ------------------------------------------------

    public function test_conserve_le_contenu_pedagogique_legitime(): void
    {
        $html = '<p><strong>Rôle.</strong> La volute convertit la vitesse en pression.</p>'
            .'<h4>Points de contrôle</h4><ul><li>Absence de fuite</li><li>Serrage au couple</li></ul>';

        $this->assertSame($html, $this->purificateur->purifier($html));
    }

    public function test_conserve_les_classes_utilitaires_du_viewer(): void
    {
        $sortie = $this->purificateur->purifier('<p class="securite">Consigner avant intervention.</p>');

        $this->assertStringContainsString('class="securite"', $sortie);
    }

    public function test_retire_les_classes_inconnues(): void
    {
        $sortie = $this->purificateur->purifier('<p class="securite bidon">Texte</p>');

        $this->assertStringContainsString('class="securite"', $sortie);
        $this->assertStringNotContainsString('bidon', $sortie);
    }

    // --- Ce qui doit être neutralisé ---------------------------------------

    public function test_supprime_les_scripts_en_gardant_le_texte(): void
    {
        $sortie = $this->purificateur->purifier('<p>Avant</p><script>alert(1)</script><p>Après</p>');

        $this->assertStringNotContainsString('<script', $sortie);
        $this->assertStringContainsString('Avant', $sortie);
        $this->assertStringContainsString('Après', $sortie);
    }

    public function test_supprime_tous_les_gestionnaires_d_evenements(): void
    {
        $sortie = $this->purificateur->purifier(
            '<p onclick="voler()" onmouseover="x()" ondblclick="y()">Texte</p>'
        );

        $this->assertStringNotContainsString('onclick', $sortie);
        $this->assertStringNotContainsString('onmouseover', $sortie);
        $this->assertStringNotContainsString('ondblclick', $sortie);
        $this->assertStringContainsString('Texte', $sortie);
    }

    public function test_supprime_le_onerror_d_une_image(): void
    {
        // Vecteur classique : l'image échoue volontairement pour déclencher le script.
        $sortie = $this->purificateur->purifier('<img src="https://exemple.test/a.png" onerror="alert(1)">');

        $this->assertStringNotContainsString('onerror', $sortie);
        $this->assertStringContainsString('src="https://exemple.test/a.png"', $sortie);
    }

    public function test_refuse_les_protocoles_dangereux(): void
    {
        $sortie = $this->purificateur->purifier(
            '<a href="javascript:alert(1)">Cliquez</a><img src="data:text/html;base64,PHNjcmlwdD4=">'
        );

        $this->assertStringNotContainsString('javascript:', $sortie);
        $this->assertStringNotContainsString('data:text/html', $sortie);
        // Le texte du lien reste lisible.
        $this->assertStringContainsString('Cliquez', $sortie);
    }

    public function test_accepte_les_url_relatives_et_https(): void
    {
        $sortie = $this->purificateur->purifier(
            '<a href="/documents/fiche.pdf">Fiche</a><a href="https://exemple.test">Site</a>'
        );

        $this->assertStringContainsString('href="/documents/fiche.pdf"', $sortie);
        $this->assertStringContainsString('href="https://exemple.test"', $sortie);
    }

    public function test_protege_les_liens_ouvrant_un_nouvel_onglet(): void
    {
        $sortie = $this->purificateur->purifier('<a href="https://exemple.test" target="_blank">Doc</a>');

        $this->assertStringContainsString('rel="noopener noreferrer"', $sortie);
    }

    public function test_supprime_les_iframes_et_les_objets(): void
    {
        $sortie = $this->purificateur->purifier(
            '<iframe src="https://malveillant.test"></iframe><object data="x"></object><p>Reste</p>'
        );

        $this->assertStringNotContainsString('<iframe', $sortie);
        $this->assertStringNotContainsString('<object', $sortie);
        $this->assertStringContainsString('Reste', $sortie);
    }

    public function test_supprime_les_styles_en_ligne(): void
    {
        // Un style arbitraire permet de recouvrir l'interface du viewer.
        $sortie = $this->purificateur->purifier('<p style="position:fixed;inset:0;z-index:9999">X</p>');

        $this->assertStringNotContainsString('style=', $sortie);
    }

    public function test_supprime_les_commentaires(): void
    {
        $sortie = $this->purificateur->purifier('<p>Visible</p><!-- note interne -->');

        $this->assertStringNotContainsString('note interne', $sortie);
    }

    // --- Robustesse --------------------------------------------------------

    public function test_supporte_un_html_mal_forme(): void
    {
        // Le HTML d'un formateur n'est pas toujours bien formé ; ce n'est pas
        // une raison pour perdre son travail.
        $sortie = $this->purificateur->purifier('<p>Ouvert <strong>gras</p>');

        $this->assertStringContainsString('Ouvert', $sortie);
        $this->assertStringContainsString('gras', $sortie);
    }

    public function test_supporte_le_vide_et_les_accents(): void
    {
        $this->assertSame('', $this->purificateur->purifier(''));
        $this->assertSame('', $this->purificateur->purifier('   '));

        $sortie = $this->purificateur->purifier('<p>Étanchéité de l\'arbre — garniture mécanique</p>');

        $this->assertStringContainsString('Étanchéité', $sortie);
        $this->assertStringContainsString('mécanique', $sortie);
    }
}
