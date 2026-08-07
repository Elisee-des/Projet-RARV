/**
 * Assainissement du HTML des panneaux (étape 10.9).
 *
 * ⚠️ **Seconde barrière.** La purification de référence est côté serveur — c'est
 * elle qui fait autorité, parce qu'un client peut être contourné. Celle-ci
 * protège contre un contenu qui aurait échappé au filtre serveur, contre une
 * réponse d'API altérée en transit, et contre le jour où quelqu'un branchera
 * ces composants sur une autre source.
 *
 * Approche par **liste blanche** : tout ce qui n'est pas explicitement autorisé
 * disparaît. Une liste noire laisse toujours passer quelque chose — c'est la
 * leçon de vingt ans de contournements de filtres XSS.
 *
 * Le contenu est analysé par le parseur du navigateur (`DOMParser`) plutôt que
 * par des expressions régulières. Écrire un analyseur HTML à la main est le
 * plus sûr moyen de se tromper : `<img src=x onerror=alert(1)>` passe la
 * plupart des regex.
 */

const BALISES_AUTORISEES = new Set([
  'P', 'BR', 'STRONG', 'EM', 'B', 'I', 'U', 'SPAN', 'SMALL',
  'H3', 'H4', 'H5',
  'UL', 'OL', 'LI',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
  'FIGURE', 'FIGCAPTION', 'IMG',
  'CODE', 'PRE', 'KBD', 'ABBR',
  'A', 'HR', 'BLOCKQUOTE',
])

const ATTRIBUTS_AUTORISES: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  IMG: new Set(['src', 'alt', 'width', 'height', 'loading']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan', 'scope']),
  ABBR: new Set(['title']),
  '*': new Set(['class']),
}

const PROTOCOLES_SURS = ['http:', 'https:', 'mailto:']

export function assainir(html: string): string {
  const document_ = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const racine = document_.body.firstElementChild

  if (!racine) return ''

  nettoyer(racine)

  return racine.innerHTML
}

/**
 * Balises dont le CONTENU est du code, pas du texte lisible.
 *
 * ⚠️ Elles doivent être supprimées avec leur sous-arbre, pas déballées.
 * Une première version les traitait comme les autres balises inconnues : le
 * `<script>` disparaissait, mais son contenu — `alert(1)` — restait dans la
 * page en texte. Inoffensif tel quel, mais c'est exactement le genre de résidu
 * qui redevient exécutable dès qu'un contenu est réinjecté ailleurs. Le
 * pendant serveur (`HtmlSur`) traitait déjà ce cas ; le client ne le faisait
 * pas, et un test unitaire l'a montré.
 */
const BALISES_A_SUPPRIMER = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'])

function nettoyer(noeud: Element): void {
  // Copie du tableau : on modifie la liste d'enfants pendant le parcours.
  for (const enfant of [...noeud.children]) {
    if (BALISES_A_SUPPRIMER.has(enfant.tagName)) {
      enfant.remove()
      continue
    }

    if (!BALISES_AUTORISEES.has(enfant.tagName)) {
      // La balise disparaît, son TEXTE reste. Supprimer le sous-arbre entier
      // ferait disparaître du contenu pédagogique légitime à cause d'une
      // simple balise inconnue.
      //
      // On nettoie AVANT de déballer : les enfants remontent d'un niveau et ne
      // seraient plus visités par la récursion en cours.
      nettoyer(enfant)
      enfant.replaceWith(...enfant.childNodes)
      continue
    }

    const permis = ATTRIBUTS_AUTORISES[enfant.tagName] ?? new Set<string>()
    const communs = ATTRIBUTS_AUTORISES['*']

    for (const attribut of [...enfant.attributes]) {
      const nom = attribut.name.toLowerCase()

      if (!permis.has(nom) && !communs.has(nom)) {
        enfant.removeAttribute(attribut.name)
        continue
      }

      // `javascript:` et `data:` dans un href ou un src exécutent du code.
      if ((nom === 'href' || nom === 'src') && !urlSure(attribut.value)) {
        enfant.removeAttribute(attribut.name)
      }
    }

    // Tout lien externe part dans un nouvel onglet, sans donner accès à
    // `window.opener` — sinon la page ouverte peut rediriger la nôtre.
    if (enfant.tagName === 'A' && enfant.getAttribute('href')) {
      enfant.setAttribute('target', '_blank')
      enfant.setAttribute('rel', 'noopener noreferrer')
    }

    nettoyer(enfant)
  }
}

function urlSure(valeur: string): boolean {
  try {
    return PROTOCOLES_SURS.includes(new URL(valeur, window.location.origin).protocol)
  } catch {
    return false
  }
}
