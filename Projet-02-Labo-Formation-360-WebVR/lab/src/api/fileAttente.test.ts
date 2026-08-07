import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creerFileAttente } from './fileAttente'

/**
 * Étape 10.7 — File d'attente hors-ligne (étape 7.7).
 *
 * Le comportement qui compte n'est pas « ça envoie », c'est « ça ne perd rien
 * et ça ne bloque pas ». Ces trois cas sont ceux qui font la différence entre
 * une file utile et une file qui se remplit jusqu'à saturation.
 */
describe('creerFileAttente', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const entree = (chemin: string) => ({ chemin, methode: 'POST' as const, corps: { a: 1 } })

  it('persiste les entrées empilées', () => {
    const file = creerFileAttente('jeton')

    file.empiler(entree('/sessions/x/events'))
    file.empiler(entree('/sessions/y/events'))

    expect(file.enAttente()).toBe(2)

    // Une nouvelle instance retrouve la file : c'est tout l'intérêt, survivre
    // à un rechargement de page.
    expect(creerFileAttente('jeton').enAttente()).toBe(2)
  })

  it('vide la file quand le réseau répond', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201 }))

    const file = creerFileAttente('jeton')
    file.empiler(entree('/a'))
    file.empiler(entree('/b'))

    expect(await file.rejouer()).toBe(2)
    expect(file.enAttente()).toBe(0)
  })

  it('conserve tout quand le réseau est coupé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const file = creerFileAttente('jeton')
    file.empiler(entree('/a'))

    expect(await file.rejouer()).toBe(0)
    expect(file.enAttente()).toBe(1)
  })

  /**
   * ⚠️ Sans cette règle, une requête définitivement invalide — session
   * expirée, format refusé — bloquerait toute la file derrière elle,
   * indéfiniment.
   */
  it('abandonne une entrée refusée en 4xx plutôt que de bloquer la file', async () => {
    const appels = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 422 })
      .mockResolvedValueOnce({ ok: true, status: 201 })

    vi.stubGlobal('fetch', appels)

    const file = creerFileAttente('jeton')
    file.empiler(entree('/invalide'))
    file.empiler(entree('/valide'))

    await file.rejouer()

    expect(file.enAttente()).toBe(0)
    expect(appels).toHaveBeenCalledTimes(2)
  })

  /** Une panne serveur, elle, se retente : ce n'est pas la faute du client. */
  it('s’arrête au premier 5xx pour préserver l’ordre du journal', async () => {
    const appels = vi.fn().mockResolvedValue({ ok: false, status: 503 })

    vi.stubGlobal('fetch', appels)

    const file = creerFileAttente('jeton')
    file.empiler(entree('/a'))
    file.empiler(entree('/b'))

    await file.rejouer()

    expect(file.enAttente()).toBe(2)
    expect(appels).toHaveBeenCalledTimes(1)
  })

  it('ne perd pas l’application quand localStorage est indisponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const file = creerFileAttente('jeton')

    // Navigation privée, quota dépassé, stockage bloqué par une politique :
    // la file dégrade en « rien de persisté », elle ne fait pas tomber la page.
    expect(() => file.empiler(entree('/a'))).not.toThrow()
    expect(file.enAttente()).toBe(0)
  })
})
