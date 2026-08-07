import { appelApi } from './client'
import type { Progression } from './types'

/**
 * Étapes 2.8 et 4.10 — Sauvegarde et reprise de progression.
 *
 * Le serveur recalcule systématiquement `completionPct` et `completedAt` : ce
 * module envoie ce qu'il observe, il ne prétend jamais à un état d'avancement.
 */

export interface Instantane {
  visitedPoints: string[]
  completedPoints: string[]
  lastPosition: { position: [number, number, number]; rotation: number } | null
  totalTimeMs: number
}

export function lireProgression(jeton: string): Promise<Progression> {
  return appelApi<Progression>('/progress', {
    headers: { Authorization: `Bearer ${jeton}` },
  })
}

export function ecrireProgression(jeton: string, instantane: Instantane): Promise<Progression> {
  return appelApi<Progression>('/progress', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(instantane),
  })
}

/**
 * Étape 7.5 — « Recommencer ».
 *
 * ⚠️ Efface la progression dans la salle, **pas les tentatives de quiz** :
 * `max_attempts` est une règle d'évaluation, pas un état de parcours. C'est le
 * serveur qui garantit la distinction ; l'interface se contente de la dire à
 * l'apprenant, pour qu'il ne clique pas en croyant récupérer un essai.
 */
export function reinitialiserProgression(jeton: string): Promise<{ attemptsPreserved: boolean }> {
  return appelApi<{ attemptsPreserved: boolean }>('/progress', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jeton}` },
  })
}

/**
 * Sauvegarde débouncée et tolérante à la perte réseau (étapes 7.2 et 7.7).
 *
 * Trois comportements qui comptent :
 *
 * 1. **Débounce.** La position change 60 fois par seconde ; sans temporisation
 *    on inonderait l'API et on épuiserait la limite de débit en quelques
 *    secondes.
 *
 * 2. **Un échec réseau ne perd rien.** L'instantané reste en attente et sera
 *    réémis à la prochaine sauvegarde. Rien à re-jouer manuellement : le
 *    dernier état gagne, et il est complet à lui seul.
 *
 * 3. **`pagehide` plutôt que `beforeunload`.** Sur mobile, `beforeunload` ne se
 *    déclenche pas de façon fiable — un onglet balayé hors de l'écran ne le
 *    reçoit jamais. `pagehide` + `sendBeacon` est le seul couple qui tienne.
 *    Même constat qu'au Lot 4 du module « viewer-ra ».
 */
export function creerSauvegarde(
  jeton: string,
  onReponse?: (progression: Progression) => void,
  delaiMs = 2500
) {
  let minuteur: ReturnType<typeof setTimeout> | null = null
  let enAttente: Instantane | null = null
  let enVol = false

  const envoyer = async () => {
    if (enVol || enAttente === null) return

    const instantane = enAttente
    enVol = true

    try {
      // La réponse porte la progression RECALCULÉE par le serveur — score,
      // pourcentage, complétion. C'est elle qui alimente le HUD : le client
      // n'a pas à refaire le calcul de son côté, et ne pourrait pas le faire
      // juste (le meilleur score vient des tentatives, pas de la progression).
      const progression = await ecrireProgression(jeton, instantane)

      onReponse?.(progression)

      // Ne vider qu'en cas de succès : sinon on perdrait l'état.
      if (enAttente === instantane) enAttente = null
    } catch {
      // Conservé pour la prochaine tentative. Silencieux à dessein : une
      // coupure réseau ne doit pas interrompre la formation.
    } finally {
      enVol = false
    }
  }

  const programmer = (instantane: Instantane) => {
    enAttente = instantane

    if (minuteur) clearTimeout(minuteur)
    minuteur = setTimeout(envoyer, delaiMs)
  }

  const vider = () => {
    if (minuteur) clearTimeout(minuteur)
    void envoyer()
  }

  /**
   * Dernière chance : la page se ferme, plus le temps d'attendre une réponse.
   *
   * `fetch(keepalive)` et non `sendBeacon` : le beacon n'émet que des POST et
   * n'accepte aucun en-tête, alors que la route est en PUT et exige un jeton.
   * Le contourner imposerait soit une route POST redondante, soit le jeton en
   * clair dans l'URL — où il finirait dans les journaux du serveur.
   */
  const surFermeture = () => {
    if (!enAttente) return

    void fetch('/api/progress', {
      method: 'PUT',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify(enAttente),
    }).catch(() => {
      /* la page se ferme : il n'y a plus personne pour traiter l'échec */
    })
  }

  window.addEventListener('pagehide', surFermeture)

  return {
    programmer,
    vider,
    arreter: () => {
      window.removeEventListener('pagehide', surFermeture)
      if (minuteur) clearTimeout(minuteur)
    },
  }
}
