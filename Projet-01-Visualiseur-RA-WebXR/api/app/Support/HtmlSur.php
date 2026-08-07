<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Étape 10.9 — Purification du HTML pédagogique, **côté serveur**.
 *
 * C'est la barrière de RÉFÉRENCE. Le client en possède une seconde
 * (`src/ui/assainir.ts`), mais un client peut être contourné : il suffit
 * d'appeler l'API directement. Seul le serveur peut garantir qu'un contenu
 * stocké ne sortira jamais avec du script dedans.
 *
 * Aujourd'hui les panneaux viennent d'un seeder que nous écrivons. Cela change
 * le jour où un back-office permet de les éditer (Lot 8 du module « viewer-ra »),
 * et ce jour-là la faille serait déjà en production depuis des mois. On la ferme
 * maintenant, pendant que c'est gratuit.
 *
 * ## Liste blanche, jamais liste noire
 *
 * Tout ce qui n'est pas explicitement autorisé disparaît. Vingt ans de
 * contournements de filtres XSS ont montré qu'une liste noire laisse toujours
 * passer quelque chose.
 *
 * ## Analyse par parseur, jamais par expression régulière
 *
 * `DOMDocument` comprend le HTML comme un navigateur le comprend. Une
 * expression régulière ne voit que du texte : `<img src=x onerror=alert(1)>`,
 * `<svg/onload=…>` ou une balise à attribut non quoté passent la plupart des
 * regex publiées.
 */
final class HtmlSur
{
    /** @var list<string> */
    private const BALISES = [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'small',
        'h3', 'h4', 'h5',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'figure', 'figcaption', 'img',
        'code', 'pre', 'kbd', 'abbr',
        'a', 'hr', 'blockquote',
    ];

    /** @var array<string, list<string>> */
    private const ATTRIBUTS = [
        'a' => ['href', 'title'],
        'img' => ['src', 'alt', 'width', 'height', 'loading'],
        'td' => ['colspan', 'rowspan'],
        'th' => ['colspan', 'rowspan', 'scope'],
        'abbr' => ['title'],
        '*' => ['class'],
    ];

    /** @var list<string> */
    private const PROTOCOLES = ['http', 'https', 'mailto'];

    public static function purifier(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return $html;
        }

        $document = new DOMDocument;

        // `LIBXML_NOERROR` : un fragment n'est pas un document complet, libxml
        // s'en plaint. `mb_encode_numericentity` force l'UTF-8, sans quoi les
        // accents ressortent en mojibake — DOMDocument suppose du Latin-1.
        $precedent = libxml_use_internal_errors(true);

        $document->loadHTML(
            '<?xml encoding="UTF-8"?><div id="racine-purification">'.$html.'</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );

        libxml_clear_errors();
        libxml_use_internal_errors($precedent);

        $racine = $document->getElementById('racine-purification');

        if (! $racine instanceof DOMElement) {
            return '';
        }

        self::nettoyer($racine, $document);

        $sortie = '';

        foreach ($racine->childNodes as $enfant) {
            $sortie .= $document->saveHTML($enfant);
        }

        return trim($sortie);
    }

    /**
     * Purifie récursivement les enfants d'un nœud.
     *
     * ⚠️ Le parcours se fait sur une COPIE de la liste d'enfants. `childNodes`
     * est une collection vivante : remplacer un nœud pendant l'itération
     * décale les indices et fait sauter le nœud suivant — un `<script>` posé
     * juste après une balise interdite survivrait au filtre.
     */
    private static function nettoyer(DOMNode $noeud, DOMDocument $document): void
    {
        $enfants = iterator_to_array($noeud->childNodes);

        foreach ($enfants as $enfant) {
            if (! $enfant instanceof DOMElement) {
                continue; // texte, commentaire — inoffensif une fois ré-encodé
            }

            $balise = strtolower($enfant->nodeName);

            if (! in_array($balise, self::BALISES, true)) {
                self::remplacerParSonContenu($enfant, $balise, $document);

                continue;
            }

            self::filtrerAttributs($enfant, $balise);
            self::nettoyer($enfant, $document);
        }
    }

    /**
     * Une balise interdite disparaît, son TEXTE reste.
     *
     * ⚠️ Sauf `<script>` et `<style>`, dont le contenu n'est pas du texte
     * lisible mais du code. Les déballer réinjecterait le script en clair dans
     * la page — exactement ce qu'on cherche à empêcher.
     */
    private static function remplacerParSonContenu(DOMElement $element, string $balise, DOMDocument $document): void
    {
        if (in_array($balise, ['script', 'style', 'iframe', 'object', 'embed'], true)) {
            $element->parentNode?->removeChild($element);

            return;
        }

        $parent = $element->parentNode;

        if ($parent === null) {
            return;
        }

        // On purifie AVANT de déballer : les enfants remontent d'un niveau et
        // ne seraient plus visités par la récursion en cours.
        self::nettoyer($element, $document);

        while ($element->firstChild !== null) {
            $parent->insertBefore($element->firstChild, $element);
        }

        $parent->removeChild($element);
    }

    private static function filtrerAttributs(DOMElement $element, string $balise): void
    {
        $permis = array_merge(self::ATTRIBUTS[$balise] ?? [], self::ATTRIBUTS['*']);

        // Copie : `attributes` est également une collection vivante.
        foreach (iterator_to_array($element->attributes ?? []) as $attribut) {
            $nom = strtolower($attribut->nodeName);

            if (! in_array($nom, $permis, true)) {
                $element->removeAttribute($attribut->nodeName);

                continue;
            }

            if (in_array($nom, ['href', 'src'], true) && ! self::urlSure($attribut->nodeValue)) {
                $element->removeAttribute($attribut->nodeName);
            }
        }

        // Tout lien externe s'ouvre isolé de la page qui l'a ouvert : sans
        // `noopener`, la page cible peut rediriger la nôtre.
        if ($balise === 'a' && $element->hasAttribute('href')) {
            $element->setAttribute('target', '_blank');
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }

    private static function urlSure(?string $valeur): bool
    {
        $url = trim((string) $valeur);

        if ($url === '') {
            return false;
        }

        // Relatif : pas de schéma, donc pas de `javascript:` ni de `data:`.
        if (! preg_match('#^([a-z][a-z0-9+.-]*):#i', $url, $trouve)) {
            return true;
        }

        return in_array(strtolower($trouve[1]), self::PROTOCOLES, true);
    }
}
