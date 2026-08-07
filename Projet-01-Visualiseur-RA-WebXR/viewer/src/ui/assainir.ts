/**
 * Nettoyage du HTML des fiches d'annotation.
 *
 * ⚠️ Ce n'est PAS la protection principale. La purification de référence a
 * lieu côté serveur à l'écriture (étape 9.8), là où le contenu entre dans le
 * système via le back-office du Lot 8. Ce filtre est une seconde barrière :
 * si un contenu douteux franchit l'API, il ne s'exécutera pas ici.
 *
 * Liste blanche stricte : tout élément ou attribut non listé disparaît.
 */

const BALISES_AUTORISEES = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'SMALL',
  'UL', 'OL', 'LI', 'H4', 'H5', 'H6',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
  'CODE', 'PRE', 'BLOCKQUOTE', 'SPAN', 'DIV', 'A', 'IMG',
])

const ATTRIBUTS_AUTORISES: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'width', 'height']),
  '*': new Set(['class']),
}

const PROTOCOLES_SURS = ['http:', 'https:', 'mailto:']

function urlSure(valeur: string): boolean {
  try {
    return PROTOCOLES_SURS.includes(new URL(valeur, window.location.origin).protocol)
  } catch {
    return false
  }
}

export function assainirHtml(html: string): string {
  const document_ = new DOMParser().parseFromString(html, 'text/html')

  const parcourir = (noeud: Element) => {
    for (const enfant of Array.from(noeud.children)) {
      if (!BALISES_AUTORISEES.has(enfant.tagName)) {
        // Remplace la balise interdite par son contenu textuel : on retire
        // le vecteur sans effacer l'information pédagogique.
        enfant.replaceWith(document_.createTextNode(enfant.textContent ?? ''))
        continue
      }

      for (const attribut of Array.from(enfant.attributes)) {
        const nom = attribut.name.toLowerCase()
        const autorises = ATTRIBUTS_AUTORISES[enfant.tagName] ?? new Set<string>()

        const permis =
          autorises.has(nom) || ATTRIBUTS_AUTORISES['*'].has(nom)

        if (!permis) {
          enfant.removeAttribute(attribut.name)
          continue
        }

        if ((nom === 'href' || nom === 'src') && !urlSure(attribut.value)) {
          enfant.removeAttribute(attribut.name)
        }
      }

      // Les liens sortants ne doivent pas donner la main sur l'onglet ouvrant.
      if (enfant.tagName === 'A' && enfant.getAttribute('target') === '_blank') {
        enfant.setAttribute('rel', 'noopener noreferrer')
      }

      parcourir(enfant)
    }
  }

  parcourir(document_.body)

  return document_.body.innerHTML
}
