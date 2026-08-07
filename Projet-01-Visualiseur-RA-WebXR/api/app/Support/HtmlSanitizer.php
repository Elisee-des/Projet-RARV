<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Étape 9.8 — Purification du HTML des fiches d'annotation.
 *
 * C'est LA protection de référence, appliquée à l'ÉCRITURE — au moment où le
 * contenu entre dans le système par le back-office du Lot 8. Le filtre côté
 * client (viewer/src/ui/assainir.ts) n'est qu'une seconde barrière : un
 * contenu déjà stocké serait servi à tous les apprenants, et rien ne garantit
 * que le prochain consommateur de l'API exécutera ce filtre.
 *
 * Liste blanche stricte, sans dépendance : le besoin se limite à du texte
 * pédagogique enrichi, pas à du HTML arbitraire.
 */
class HtmlSanitizer
{
    /** @var list<string> */
    private const BALISES = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'small', 'span', 'div',
        'ul', 'ol', 'li', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'code', 'pre', 'blockquote', 'a', 'img',
    ];

    /** @var array<string, list<string>> */
    private const ATTRIBUTS = [
        'a' => ['href', 'title', 'target', 'rel'],
        'img' => ['src', 'alt', 'width', 'height'],
        '*' => ['class'],
    ];

    /** @var list<string> */
    private const PROTOCOLES = ['http', 'https', 'mailto'];

    /** Classes utilitaires reconnues par la feuille de style du viewer. */
    private const CLASSES = ['securite', 'cle', 'note'];

    public function purifier(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $document = new DOMDocument;

        // LIBXML_NOERROR : le HTML d'un formateur n'est pas toujours bien formé,
        // ce n'est pas une raison pour perdre son contenu.
        $charge = @$document->loadHTML(
            '<?xml encoding="UTF-8"><div id="racine">'.$html.'</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_HTML_NODEFDTD
        );

        if (! $charge) {
            return '';
        }

        $racine = $document->getElementById('racine');

        if (! $racine instanceof DOMElement) {
            return '';
        }

        $this->nettoyer($racine);

        $sortie = '';

        foreach ($racine->childNodes as $enfant) {
            $sortie .= $document->saveHTML($enfant);
        }

        return trim($sortie);
    }

    private function nettoyer(DOMNode $noeud): void
    {
        // Copie du tableau : on modifie l'arbre pendant le parcours.
        foreach (iterator_to_array($noeud->childNodes) as $enfant) {
            if ($enfant instanceof DOMElement) {
                $balise = strtolower($enfant->nodeName);

                if (! in_array($balise, self::BALISES, true)) {
                    // La balise interdite disparaît, son TEXTE est conservé :
                    // on retire le vecteur sans effacer le contenu pédagogique.
                    $this->remplacerParTexte($enfant);

                    continue;
                }

                $this->filtrerAttributs($enfant, $balise);
                $this->nettoyer($enfant);

                continue;
            }

            // Commentaires, instructions de traitement, CDATA : rien à faire ici.
            if (! $enfant instanceof \DOMText) {
                $enfant->parentNode?->removeChild($enfant);
            }
        }
    }

    private function remplacerParTexte(DOMElement $element): void
    {
        $texte = $element->ownerDocument?->createTextNode($element->textContent ?? '');

        if ($texte !== null) {
            $element->parentNode?->replaceChild($texte, $element);
        } else {
            $element->parentNode?->removeChild($element);
        }
    }

    private function filtrerAttributs(DOMElement $element, string $balise): void
    {
        $autorises = array_merge(self::ATTRIBUTS[$balise] ?? [], self::ATTRIBUTS['*']);

        foreach (iterator_to_array($element->attributes ?? []) as $attribut) {
            $nom = strtolower($attribut->nodeName);

            // Couvre d'un coup tous les gestionnaires d'événements : onclick,
            // onerror, onload… et ceux qui n'existent pas encore.
            if (! in_array($nom, $autorises, true)) {
                $element->removeAttribute($attribut->nodeName);

                continue;
            }

            if (($nom === 'href' || $nom === 'src') && ! $this->urlSure($attribut->nodeValue ?? '')) {
                $element->removeAttribute($attribut->nodeName);

                continue;
            }

            if ($nom === 'class') {
                $this->filtrerClasses($element, $attribut->nodeValue ?? '');
            }
        }

        // Un lien ouvrant un nouvel onglet ne doit pas donner la main dessus.
        if ($balise === 'a' && $element->getAttribute('target') === '_blank') {
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }

    private function filtrerClasses(DOMElement $element, string $valeur): void
    {
        $retenues = array_values(array_intersect(
            preg_split('/\s+/', trim($valeur)) ?: [],
            self::CLASSES
        ));

        if ($retenues === []) {
            $element->removeAttribute('class');

            return;
        }

        $element->setAttribute('class', implode(' ', $retenues));
    }

    private function urlSure(string $valeur): bool
    {
        $valeur = trim($valeur);

        // Relative : pas de schéma, donc pas de javascript: ni de data:
        if ($valeur !== '' && ! str_contains($valeur, ':')) {
            return true;
        }

        $schema = strtolower((string) parse_url($valeur, PHP_URL_SCHEME));

        return in_array($schema, self::PROTOCOLES, true);
    }
}
