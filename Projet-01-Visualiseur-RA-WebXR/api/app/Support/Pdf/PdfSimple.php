<?php

namespace App\Support\Pdf;

/**
 * Écriture PDF minimale, sans dépendance.
 *
 * Le besoin se limite à une attestation d'une page : du texte, quelques
 * filets, deux polices. Une bibliothèque PDF complète — plusieurs mégaoctets,
 * des dizaines de classes, une surface de mise à jour — serait démesurée pour
 * ça, et c'est une dépendance de plus à suivre pour un livrable qui ne changera
 * jamais de forme.
 *
 * Le format PDF est du texte : un catalogue d'objets, une table de références
 * croisées, un trailer. Les polices de base (Helvetica) sont garanties
 * présentes dans tout lecteur, donc rien à embarquer.
 *
 * ⚠️ **Encodage.** Les polices de base ne connaissent pas l'Unicode : chaque
 * caractère tient sur un octet, en WinAnsi (proche de Latin-1). Le texte est
 * donc translittéré. Écrire de l'UTF-8 brut produirait des caractères
 * fantaisistes — et personne ne relit une attestation générée.
 *
 * Le même principe a servi côté front pour les fiches techniques du Lot 6
 * (`scripts/generer-assets-pedagogiques.mjs`).
 */
final class PdfSimple
{
    private const LARGEUR = 595.28;   // A4 en points

    private const HAUTEUR = 841.89;

    private const MARGE = 56.0;

    /** Limite basse déclenchant un saut de page. */
    private const BAS = self::MARGE + 24;

    /** @var list<list<string>> flux de contenu, un par page */
    private array $pages = [];

    /** @var list<string> */
    private array $flux = [];

    private float $y;

    public function __construct()
    {
        $this->y = self::HAUTEUR - self::MARGE;
    }

    public function titre(string $texte): self
    {
        return $this->ecrire($texte, taille: 20, police: 'F2', interligne: 1.3);
    }

    public function sousTitre(string $texte): self
    {
        return $this->ecrire($texte, taille: 10, couleur: '0.42 0.45 0.5');
    }

    public function section(string $texte): self
    {
        $this->espace(8);

        return $this->ecrire($texte, taille: 12.5, police: 'F2', interligne: 1.35)->espace(2);
    }

    public function paragraphe(string $texte): self
    {
        return $this->ecrire($texte, taille: 10.5)->espace(5);
    }

    /** @param array<string, string> $lignes */
    public function definitions(array $lignes): self
    {
        foreach ($lignes as $cle => $valeur) {
            if ($this->y < self::BAS) {
                $this->nouvellePage();
            }

            $this->flux[] = 'BT';
            $this->flux[] = sprintf(
                '/F1 10.5 Tf 1 0 0 1 %.2f %.2f Tm (%s) Tj',
                self::MARGE,
                $this->y,
                $this->litteral($cle)
            );
            $this->flux[] = sprintf(
                '/F2 10.5 Tf 1 0 0 1 %.2f %.2f Tm (%s) Tj',
                self::MARGE + 190,
                $this->y,
                $this->litteral($valeur)
            );
            $this->flux[] = 'ET';

            $this->y -= 17;
        }

        return $this->espace(4);
    }

    /** @param list<string> $items */
    public function liste(array $items): self
    {
        foreach ($items as $item) {
            $this->ecrire('- '.$item, taille: 10.5);
        }

        return $this->espace(5);
    }

    public function encadre(string $texte): self
    {
        return $this->espace(2)->ecrire($texte, taille: 10, couleur: '0.66 0.24 0.09')->espace(6);
    }

    public function petit(string $texte): self
    {
        return $this->ecrire($texte, taille: 8.5, couleur: '0.55 0.58 0.62');
    }

    public function espace(float $hauteur): self
    {
        $this->y -= $hauteur;

        if ($this->y < self::BAS) {
            $this->nouvellePage();
        }

        return $this;
    }

    public function filet(): self
    {
        if ($this->y < self::BAS) {
            $this->nouvellePage();
        }

        $this->flux[] = sprintf(
            '0.75 0.78 0.82 RG 0.8 w %.2f %.2f m %.2f %.2f l S',
            self::MARGE,
            $this->y,
            self::LARGEUR - self::MARGE,
            $this->y
        );

        $this->y -= 12;

        return $this;
    }

    /**
     * Assemble le document.
     *
     * Numérotation des objets, avec N pages :
     *   1              catalogue
     *   2              arbre des pages
     *   3 … 2+N        pages
     *   3+N … 2+2N     flux de contenu
     *   3+2N, 4+2N     polices
     */
    public function rendu(): string
    {
        $pages = [...$this->pages, $this->flux];
        $n = count($pages);

        $idPremierePage = 3;
        $idPremierContenu = 3 + $n;
        $idF1 = 3 + 2 * $n;
        $idF2 = 4 + 2 * $n;

        $refs = implode(' ', array_map(
            fn (int $i) => ($idPremierePage + $i).' 0 R',
            range(0, $n - 1)
        ));

        $objets = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            sprintf('<< /Type /Pages /Kids [%s] /Count %d >>', $refs, $n),
        ];

        foreach (range(0, $n - 1) as $i) {
            $objets[] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] '
                .'/Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> /Contents %d 0 R >>',
                self::LARGEUR,
                self::HAUTEUR,
                $idF1,
                $idF2,
                $idPremierContenu + $i
            );
        }

        foreach ($pages as $contenu) {
            $texte = implode("\n", $contenu);
            $objets[] = sprintf("<< /Length %d >>\nstream\n%s\nendstream", strlen($texte), $texte);
        }

        $objets[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
        $objets[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

        $pdf = "%PDF-1.4\n";
        $decalages = [];

        foreach ($objets as $index => $objet) {
            $decalages[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n".$objet."\nendobj\n";
        }

        $debutXref = strlen($pdf);

        $pdf .= sprintf("xref\n0 %d\n0000000000 65535 f \n", count($objets) + 1);

        foreach ($decalages as $decalage) {
            $pdf .= sprintf("%010d 00000 n \n", $decalage);
        }

        $pdf .= sprintf(
            "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n",
            count($objets) + 1,
            $debutXref
        );

        return $pdf;
    }

    private function ecrire(
        string $texte,
        float $taille = 10.5,
        string $police = 'F1',
        float $interligne = 1.45,
        ?string $couleur = null,
    ): self {
        foreach ($this->decouper($texte, $taille) as $ligne) {
            if ($this->y < self::BAS) {
                $this->nouvellePage();
            }

            if ($couleur !== null) {
                $this->flux[] = $couleur.' rg';
            }

            $this->flux[] = sprintf(
                'BT /%s %s Tf 1 0 0 1 %.2f %.2f Tm (%s) Tj ET',
                $police,
                $taille,
                self::MARGE,
                $this->y,
                $this->litteral($ligne)
            );

            if ($couleur !== null) {
                $this->flux[] = '0 0 0 rg';
            }

            $this->y -= $taille * $interligne;
        }

        return $this;
    }

    /**
     * Découpe un paragraphe pour tenir dans la largeur utile.
     *
     * Largeur moyenne approchée à 0,5 em : les polices de base sont
     * proportionnelles, mais un calcul exact demanderait leurs métriques, pour
     * un gain nul sur du texte courant.
     *
     * @return list<string>
     */
    private function decouper(string $texte, float $taille): array
    {
        $largeurUtile = self::LARGEUR - self::MARGE * 2;
        $maximum = (int) floor($largeurUtile / ($taille * 0.5));

        $lignes = [];
        $ligne = '';

        foreach (preg_split('/\s+/', trim($texte)) ?: [] as $mot) {
            if ($ligne !== '' && mb_strlen($ligne) + mb_strlen($mot) + 1 > $maximum) {
                $lignes[] = $ligne;
                $ligne = $mot;
            } else {
                $ligne = $ligne === '' ? $mot : $ligne.' '.$mot;
            }
        }

        if ($ligne !== '') {
            $lignes[] = $ligne;
        }

        return $lignes;
    }

    /** Translittère en WinAnsi puis échappe les caractères réservés du PDF. */
    private function litteral(string $texte): string
    {
        $remplacements = [
            '’' => "'", '‘' => "'", '“' => '"', '”' => '"',
            '—' => '-', '–' => '-', '…' => '...', '·' => '-',
            '≥' => '>=', '≤' => '<=', '×' => 'x', '✓' => 'v',
        ];

        $texte = strtr($texte, $remplacements);

        // //TRANSLIT dégrade les caractères absents plutôt que de couper la
        // chaîne, ce que ferait la conversion stricte.
        $converti = @iconv('UTF-8', 'CP1252//TRANSLIT', $texte);

        if ($converti === false) {
            $converti = preg_replace('/[^\x20-\x7E]/', '?', $texte) ?? '';
        }

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $converti);
    }

    private function nouvellePage(): void
    {
        $this->pages[] = $this->flux;
        $this->flux = [];
        $this->y = self::HAUTEUR - self::MARGE;
    }
}
