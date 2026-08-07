import { describe, expect, it } from 'vitest'
import { assainirHtml } from './assainir'

/**
 * Étape 9.5 — Seconde barrière de purification, côté client.
 *
 * La protection de référence est côté serveur, à l'écriture (étape 9.8).
 * Celle-ci couvre le cas où un contenu douteux serait déjà en base.
 */
describe('assainirHtml', () => {
  it('conserve le contenu pédagogique', () => {
    const html = '<p><strong>Rôle.</strong> Convertit la vitesse en pression.</p>'

    expect(assainirHtml(html)).toContain('<strong>Rôle.</strong>')
  })

  it('supprime les scripts en gardant le texte', () => {
    const sortie = assainirHtml('<p>Avant</p><script>alert(1)</script>')

    expect(sortie).not.toContain('<script')
    expect(sortie).toContain('Avant')
  })

  it('supprime les gestionnaires d\'événements', () => {
    const sortie = assainirHtml('<p onclick="voler()">Texte</p>')

    expect(sortie).not.toContain('onclick')
    expect(sortie).toContain('Texte')
  })

  it('neutralise les protocoles dangereux', () => {
    const sortie = assainirHtml('<a href="javascript:alert(1)">Lien</a>')

    expect(sortie).not.toContain('javascript:')
    expect(sortie).toContain('Lien')
  })

  it('protège les liens ouvrant un nouvel onglet', () => {
    const sortie = assainirHtml('<a href="https://exemple.test" target="_blank">Doc</a>')

    expect(sortie).toContain('noopener')
  })

  it('supprime les styles en ligne', () => {
    const sortie = assainirHtml('<p style="position:fixed;inset:0">X</p>')

    expect(sortie).not.toContain('style=')
  })

  it('supprime les iframes', () => {
    const sortie = assainirHtml('<iframe src="https://malveillant.test"></iframe><p>Reste</p>')

    expect(sortie).not.toContain('<iframe')
    expect(sortie).toContain('Reste')
  })
})
