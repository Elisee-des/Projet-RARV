import { appelApi } from './client'
import { creerFileAttente } from './fileAttente'
import type { TypeEvenement } from './types'

/**
 * Étape 5.8 — Journal d'événements.
 *
 * Le socle est mutualisé (ADR-001) : ces événements partent dans la même table
 * `session_events` que ceux du module « viewer-ra », et alimenteront la même
 * chaîne xAPI au Lot 9. Seul le vocabulaire diffère.
 *
 * ⚠️ **Tamponné puis envoyé par lots.** Un appel HTTP par franchissement de
 * zone saturerait l'API : traverser la salle déclenche plusieurs
 * `point_entered` par seconde, et la limite de débit est à 120 par minute et
 * par session. Le tampon les regroupe en un seul appel.
 */

interface EvenementLocal {
  type: TypeEvenement
  payload?: Record<string, unknown>
  occurredAt: string
}

export async function ouvrirSession(jeton: string, deviceType: string): Promise<string> {
  const reponse = await appelApi<{ sessionId: string }>('/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}` },
    body: JSON.stringify({ deviceType, xrSupported: false }),
  })

  return reponse.sessionId
}

export function creerJournal(jeton: string, sessionId: string, delaiMs = 1500) {
  let tampon: EvenementLocal[] = []
  let minuteur: ReturnType<typeof setTimeout> | null = null

  const file = creerFileAttente(jeton)

  // Étape 7.7 — au démarrage, on rejoue ce qu'une session précédente n'a pas
  // pu envoyer. Un onglet fermé pendant une coupure réseau ne perd rien.
  void file.rejouer()

  const vider = async () => {
    if (tampon.length === 0) return

    const lot = tampon
    tampon = []

    try {
      await appelApi(`/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({ events: lot }),
      })
    } catch {
      // Étape 7.7 — l'envoi a échoué : le lot passe dans la file persistée,
      // qui survit au rechargement et rejoue à la reconnexion. Perdre le
      // journal ne doit jamais interrompre la formation.
      file.empiler({
        chemin: `/sessions/${sessionId}/events`,
        methode: 'POST',
        corps: { events: lot },
      })
    }
  }

  const emettre = (type: TypeEvenement, payload?: Record<string, unknown>) => {
    tampon.push({ type, payload, occurredAt: new Date().toISOString() })

    // Le lot est plafonné à 100 côté serveur : on vide sans attendre plutôt
    // que de se faire refuser l'envoi.
    if (tampon.length >= 90) {
      void vider()
      return
    }

    if (minuteur) clearTimeout(minuteur)
    minuteur = setTimeout(() => void vider(), delaiMs)
  }

  const surFermeture = () => {
    if (tampon.length === 0) return

    void fetch(`/api/sessions/${sessionId}/events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify({ events: tampon }),
    }).catch(() => {})

    tampon = []
  }

  window.addEventListener('pagehide', surFermeture)

  return {
    emettre,
    vider,
    enAttente: file.enAttente,
    arreter: () => {
      window.removeEventListener('pagehide', surFermeture)
      if (minuteur) clearTimeout(minuteur)
      void vider()
      file.arreter()
    },
  }
}
