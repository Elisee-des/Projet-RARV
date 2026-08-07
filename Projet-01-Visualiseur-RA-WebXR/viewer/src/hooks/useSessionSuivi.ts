import { useCallback, useEffect, useRef, useState } from 'react'
import type { Reprise } from '../api/handoff'
import {
  cloturerSession,
  detecterAppareil,
  envoyerEvenements,
  obtenirJeton,
  ouvrirSession,
  type Evenement,
  type TypeEvenement,
} from '../api/session'

const DELAI_ENVOI_MS = 1500
const TAILLE_LOT_MAX = 100

export type EtatSuivi = 'inactif' | 'ouverture' | 'actif' | 'erreur'

/**
 * Étape 4.8 — Journalisation des interactions.
 *
 * Les événements sont TAMPONNÉS puis envoyés par lots : un appel réseau par
 * clic saturerait l'API et l'appareil, surtout pendant une session RA.
 *
 * Étape 6.4 — quand `reprise` est fourni (arrivée par QR code), aucune
 * nouvelle session n'est ouverte : on poursuit celle du poste desktop.
 */
export function useSessionSuivi(
  slug: string,
  xrSupported: boolean | null,
  reprise: Reprise | null = null
) {
  const [etat, setEtat] = useState<EtatSuivi>('inactif')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [jeton, setJeton] = useState<string | null>(null)

  const jetonRef = useRef<string | null>(null)
  const sessionRef = useRef<string | null>(null)
  const tampon = useRef<Evenement[]>([])
  const minuterie = useRef<number | null>(null)
  // Une session reprise appartient au desktop : c'est lui qui la clôture.
  const doitCloturer = useRef(reprise === null)

  const vider = useCallback(async (keepalive = false) => {
    if (!jetonRef.current || !sessionRef.current || tampon.current.length === 0) return

    const lot = tampon.current.splice(0, TAILLE_LOT_MAX)

    try {
      await envoyerEvenements(jetonRef.current, sessionRef.current, lot, keepalive)
    } catch (erreur) {
      console.warn('[suivi] envoi des événements échoué', erreur)
    }
  }, [])

  const journaliser = useCallback(
    (type: TypeEvenement, payload?: Record<string, unknown>) => {
      tampon.current.push({ type, payload, occurredAt: new Date().toISOString() })

      if (minuterie.current !== null) window.clearTimeout(minuterie.current)
      minuterie.current = window.setTimeout(() => void vider(), DELAI_ENVOI_MS)
    },
    [vider]
  )

  useEffect(() => {
    if (xrSupported === null) return

    const controleur = new AbortController()
    let annule = false

    async function demarrer() {
      setEtat('ouverture')

      try {
        // Reprise : le jeton et la session viennent du QR code.
        if (reprise) {
          jetonRef.current = reprise.jeton
          sessionRef.current = reprise.sessionId
        } else {
          const t = await obtenirJeton(slug, controleur.signal)
          const id = await ouvrirSession(
            t,
            { deviceType: detecterAppareil(), xrSupported: xrSupported === true },
            controleur.signal
          )
          jetonRef.current = t
          sessionRef.current = id
        }

        if (annule) return

        setJeton(jetonRef.current)
        setSessionId(sessionRef.current)
        setEtat('actif')
      } catch (erreur) {
        if (annule) return
        console.warn('[suivi] session non ouverte — la consultation continue', erreur)
        setEtat('erreur')
      }
    }

    void demarrer()

    return () => {
      annule = true
      controleur.abort()
    }
  }, [slug, xrSupported, reprise])

  useEffect(() => {
    const surSortie = () => {
      if (!jetonRef.current || !sessionRef.current) return

      void vider(true)

      // Le mobile arrivé par bascule ne clôture pas : le desktop poursuit la
      // consultation et fermera la session lui-même.
      if (doitCloturer.current) {
        void cloturerSession(jetonRef.current, sessionRef.current, true)
        sessionRef.current = null
      }
    }

    // pagehide couvre les cas que beforeunload rate sur mobile (bascule
    // d'application, verrouillage de l'écran).
    window.addEventListener('pagehide', surSortie)

    return () => {
      window.removeEventListener('pagehide', surSortie)
      surSortie()
    }
  }, [vider])

  return { etat, journaliser, sessionId, jeton }
}
