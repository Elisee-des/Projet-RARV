import { afterEach, describe, expect, it, vi } from 'vitest'
import { jetonEditeurDepuisUrl } from './editeur'
import { jetonBasculeDepuisUrl } from './handoff'

/**
 * Déploiement sous un sous-chemin.
 *
 * Ces tests protègent contre une panne qui ne se manifesterait QU'EN
 * PRODUCTION : servi sous `/viewer/`, le viewer ne reconnaîtrait plus ses
 * propres routes, et la bascule QR comme l'éditeur cesseraient de fonctionner
 * sans la moindre erreur visible en développement.
 */

function poserBase(base: string) {
  vi.stubEnv('BASE_URL', base)
}

function poserUrl(chemin: string, recherche = '') {
  window.history.replaceState({}, '', chemin + recherche)
}

afterEach(() => {
  vi.unstubAllEnvs()
  poserUrl('/')
})

describe('routes sous une base de déploiement', () => {
  it('reconnaît la reprise QR à la racine', () => {
    poserBase('/')
    poserUrl('/ar/abcdefghijklmnopqrstuvwx')

    expect(jetonBasculeDepuisUrl()).toBe('abcdefghijklmnopqrstuvwx')
  })

  it('reconnaît la reprise QR sous /viewer/', () => {
    poserBase('/viewer/')
    poserUrl('/viewer/ar/abcdefghijklmnopqrstuvwx')

    expect(jetonBasculeDepuisUrl()).toBe('abcdefghijklmnopqrstuvwx')
  })

  it("reconnaît l'éditeur sous /viewer/", () => {
    poserBase('/viewer/')
    poserUrl('/viewer/editeur/pompe-centrifuge-01', '?t=jeton-abc')

    expect(jetonEditeurDepuisUrl()).toEqual({
      slug: 'pompe-centrifuge-01',
      jeton: 'jeton-abc',
    })
  })

  /** Le même chemin, servi depuis une autre base, ne doit rien déclencher. */
  it('ignore un chemin qui ne relève pas de la base', () => {
    poserBase('/viewer/')
    poserUrl('/labo/ar/abcdefghijklmnopqrstuvwx')

    expect(jetonBasculeDepuisUrl()).toBeNull()
  })
})
