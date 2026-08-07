import { afterEach, describe, expect, it, vi } from 'vitest'
import { detecterSupportRA } from './useSupportRA'

/** Étape 9.5 — Détection des capacités de réalité augmentée. */

function poserXr(reponse: boolean | Error | null) {
  if (reponse === null) {
    Object.defineProperty(navigator, 'xr', { value: undefined, configurable: true })
    return
  }

  Object.defineProperty(navigator, 'xr', {
    configurable: true,
    value: {
      isSessionSupported: vi.fn(() =>
        reponse instanceof Error ? Promise.reject(reponse) : Promise.resolve(reponse)
      ),
    },
  })
}

// Capturée AVANT toute installation d'espion : `restoreMocks` remet la
// méthode d'origine après chaque test, mais pas pendant.
const creerElement = document.createElement.bind(document)

function poserQuickLook(supporte: boolean) {
  vi.spyOn(document, 'createElement').mockImplementation(((
    balise: string,
    options?: ElementCreationOptions
  ) => {
    if (balise !== 'a') return creerElement(balise, options)

    return { relList: { supports: () => supporte } } as unknown as HTMLElement
  }) as typeof document.createElement)
}

afterEach(() => {
  Object.defineProperty(navigator, 'xr', { value: undefined, configurable: true })
})

describe('detecterSupportRA', () => {
  it('retourne webxr quand immersive-ar est supporté', async () => {
    poserXr(true)

    await expect(detecterSupportRA()).resolves.toBe('webxr')
  })

  it('retourne quicklook sur un appareil iOS sans WebXR', async () => {
    poserXr(null)
    poserQuickLook(true)

    await expect(detecterSupportRA()).resolves.toBe('quicklook')
  })

  it('retourne indisponible sur un poste de bureau', async () => {
    poserXr(null)
    poserQuickLook(false)

    await expect(detecterSupportRA()).resolves.toBe('indisponible')
  })

  /**
   * `isSessionSupported` rejette hors contexte sécurisé. Une exception non
   * traitée laisserait l'interface bloquée sur « Détection en cours… ».
   */
  it('ne se bloque pas si isSessionSupported rejette', async () => {
    poserXr(new Error('SecurityError'))
    poserQuickLook(false)

    await expect(detecterSupportRA()).resolves.toBe('indisponible')
  })

  /**
   * Un appareil qui gère la vraie RA ne doit pas basculer sur le chemin
   * dégradé d'iOS : WebXR est testé en premier.
   */
  it('préfère WebXR quand les deux sont disponibles', async () => {
    poserXr(true)
    poserQuickLook(true)

    await expect(detecterSupportRA()).resolves.toBe('webxr')
  })

  it('retombe sur quicklook quand immersive-ar est refusé', async () => {
    poserXr(false)
    poserQuickLook(true)

    await expect(detecterSupportRA()).resolves.toBe('quicklook')
  })
})
