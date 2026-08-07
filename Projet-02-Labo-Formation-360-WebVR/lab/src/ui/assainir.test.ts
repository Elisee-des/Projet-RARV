import { describe, expect, it } from 'vitest'
import { assainir } from './assainir'

/**
 * Étape 10.7 — Assainissement du HTML, seconde barrière côté client.
 *
 * Les vecteurs testés sont ceux qui traversent les filtres écrits à coups
 * d'expressions régulières. La barrière de référence est côté serveur
 * (`HtmlSur`), celle-ci protège d'une réponse d'API altérée en transit et du
 * jour où ces composants seront branchés sur une autre source.
 */
describe('assainir', () => {
  const vecteurs: Array<[string, string, string]> = [
    ['balise script', '<p>a</p><script>alert(1)</script>', 'alert(1)'],
    ['gestionnaire onerror', '<img src=x onerror=alert(1)>', 'onerror'],
    ['onload sur svg', '<svg/onload=alert(1)>', 'onload'],
    ['onclick sur balise permise', '<p onclick="voler()">t</p>', 'onclick'],
    ['href javascript', '<a href="javascript:alert(1)">l</a>', 'javascript:'],
    ['href javascript en casse mixte', '<a href="JaVaScRiPt:alert(1)">l</a>', 'avascript'],
    ['href data', '<a href="data:text/html;base64,PHM=">l</a>', 'data:'],
    ['iframe', '<iframe src="//x.test"></iframe>', 'iframe'],
    ['attribut style', '<p style="position:fixed;inset:0">t</p>', 'position:fixed'],
    ['formulaire', '<form action="//x.test"><input name="mdp"></form>', 'x.test'],
  ]

  it.each(vecteurs)('neutralise : %s', (_nom, entree, interdit) => {
    expect(assainir(entree).toLowerCase()).not.toContain(interdit.toLowerCase())
  })

  it('conserve le texte d’une balise interdite', () => {
    const sortie = assainir('<p>Couple de <marquee>serrage</marquee> : 25 N·m</p>')

    expect(sortie).toContain('serrage')
    expect(sortie).not.toContain('marquee')
  })

  it('laisse passer le contenu pédagogique légitime', () => {
    const entree =
      '<p><strong>Rôle.</strong> La volute convertit la vitesse en pression.</p>' +
      '<ul><li>Absence de fuite</li></ul>' +
      '<table><tr><th scope="col">Diamètre</th><td colspan="2">M12</td></tr></table>'

    const sortie = assainir(entree)

    for (const attendu of ['<strong>', '<ul>', '<li>', 'scope="col"', 'colspan="2"', 'Diamètre']) {
      expect(sortie).toContain(attendu)
    }
  })

  it('isole les liens externes de la page qui les ouvre', () => {
    const sortie = assainir('<a href="https://exemple.fr">Fiche</a>')

    expect(sortie).toContain('target="_blank"')
    expect(sortie).toContain('rel="noopener noreferrer"')
  })

  it('accepte une URL relative', () => {
    expect(assainir('<img src="/images/epi.webp" alt="EPI">')).toContain('/images/epi.webp')
  })

  /**
   * ⚠️ Le piège de la collection vivante : remplacer un nœud pendant
   * l'itération décale les indices et fait sauter le suivant.
   */
  it('n’oublie pas un script placé après une balise interdite', () => {
    const sortie = assainir('<center>a</center><script>alert(1)</script><center>b</center>')

    expect(sortie).not.toContain('alert')
    expect(sortie).toContain('a')
    expect(sortie).toContain('b')
  })
})
