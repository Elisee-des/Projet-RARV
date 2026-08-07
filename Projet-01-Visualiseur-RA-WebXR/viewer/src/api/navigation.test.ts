import { afterEach, describe, expect, it } from 'vitest'
import { jetonEditeurDepuisUrl } from './editeur'
import { jetonBasculeDepuisUrl } from './handoff'
import { detecterAppareil } from './session'

/** Étape 9.5 — Analyse des URL d'entrée et détection d'appareil. */

function poserUrl(chemin: string, recherche = '') {
  window.history.replaceState({}, '', chemin + recherche)
}

function poserUa(valeur: string) {
  Object.defineProperty(navigator, 'userAgent', { value: valeur, configurable: true })
}

afterEach(() => poserUrl('/'))

describe('jetonBasculeDepuisUrl', () => {
  it('reconnaît une URL de reprise', () => {
    poserUrl('/ar/abcdefghijklmnopqrstuvwx')

    expect(jetonBasculeDepuisUrl()).toBe('abcdefghijklmnopqrstuvwx')
  })

  it('tolère la barre oblique finale', () => {
    poserUrl('/ar/abcdefghijklmnopqrstuvwx/')

    expect(jetonBasculeDepuisUrl()).toBe('abcdefghijklmnopqrstuvwx')
  })

  it('ignore les chemins ordinaires', () => {
    poserUrl('/')
    expect(jetonBasculeDepuisUrl()).toBeNull()

    poserUrl('/editeur/pompe')
    expect(jetonBasculeDepuisUrl()).toBeNull()
  })

  /** Un jeton trop court trahit une URL tronquée ou forgée. */
  it('rejette un jeton trop court', () => {
    poserUrl('/ar/court')

    expect(jetonBasculeDepuisUrl()).toBeNull()
  })
})

describe('jetonEditeurDepuisUrl', () => {
  it('extrait le slug et le jeton', () => {
    poserUrl('/editeur/pompe-centrifuge-01', '?t=jeton-abc')

    expect(jetonEditeurDepuisUrl()).toEqual({
      slug: 'pompe-centrifuge-01',
      jeton: 'jeton-abc',
    })
  })

  it('exige le jeton', () => {
    poserUrl('/editeur/pompe-centrifuge-01')

    expect(jetonEditeurDepuisUrl()).toBeNull()
  })

  it('refuse un slug non conforme', () => {
    poserUrl('/editeur/Pompe_Majuscule', '?t=x')

    expect(jetonEditeurDepuisUrl()).toBeNull()
  })
})

describe('detecterAppareil', () => {
  it('reconnaît Android', () => {
    poserUa('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')

    expect(detecterAppareil()).toBe('android')
  })

  it('reconnaît iOS', () => {
    poserUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605')

    expect(detecterAppareil()).toBe('ios')
  })

  it('reconnaît un poste de bureau', () => {
    poserUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')

    expect(detecterAppareil()).toBe('desktop')
  })
})
