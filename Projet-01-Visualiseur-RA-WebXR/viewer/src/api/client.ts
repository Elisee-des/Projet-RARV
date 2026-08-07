import type { ObjetPedagogique } from './types'

/** Erreur portant le code HTTP, pour distinguer « introuvable » de « serveur muet ». */
export class ErreurApi extends Error {
  readonly statut: number | null

  constructor(message: string, statut: number | null = null) {
    super(message)
    this.name = 'ErreurApi'
    this.statut = statut
  }
}

export async function recupererObjet(
  slug: string,
  signal?: AbortSignal
): Promise<ObjetPedagogique> {
  let reponse: Response

  try {
    reponse = await fetch(`/api/objects/${encodeURIComponent(slug)}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (cause) {
    // Réseau coupé, serveur éteint, DNS… (étape 3.8)
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ErreurApi("L'API est injoignable. Le serveur Laravel est-il démarré ?")
  }

  if (!reponse.ok) {
    throw new ErreurApi(
      reponse.status === 404
        ? 'Objet pédagogique introuvable.'
        : `Le serveur a répondu ${reponse.status}.`,
      reponse.status
    )
  }

  const { data } = (await reponse.json()) as { data: ObjetPedagogique }

  return data
}
