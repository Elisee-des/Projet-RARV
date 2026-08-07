import { useCallback, useEffect, useRef, useState } from 'react'
import { useInteraction } from '../etat/interaction'
import { chargerEnvironnement, obtenirJeton } from '../api/environnement'
import { creerSauvegarde, lireProgression, reinitialiserProgression } from '../api/progression'
import { creerJournal, ouvrirSession } from '../api/evenements'
import { emettre, SOURCE } from '../lms/protocole'
import type { Environnement, Progression } from '../api/types'

/**
 * Séance de formation — tout ce qui ne dépend PAS de la 3D.
 *
 * ## Pourquoi ce hook existe
 *
 * L'étape 10.4 impose un **parcours alternatif 2D** menant à la même formation
 * sans jamais entrer dans la 3D. Les deux parcours partagent tout sauf le
 * rendu : jeton, environnement, session, journal d'événements, progression
 * sauvegardée, complétion, messages vers le LMS.
 *
 * Dupliquer cette logique garantirait qu'elle diverge — et la version 2D, moins
 * utilisée pendant le développement, serait celle qui pourrit. Or c'est
 * précisément celle dont dépendent l'accessibilité **et** les tests E2E de
 * l'étape 10.8.
 *
 * ## ⚠️ Ce hook n'importe RIEN de Three.js, et c'est un contrat
 *
 * Une première version lisait la position via `instantanePosition()`, qui
 * importe `Vector3`. Résultat mesuré au build : **tout Three.js entrait dans le
 * morceau de la page accessible** — 390 Ko sur l'écran conçu pour les machines
 * sans WebGL. Une seule ligne d'import, invisible à la lecture, annulait le
 * découpage de l'étape 10.3.
 *
 * La position est donc *injectée* par l'appelant : la version 3D fournit sa
 * fonction, la version 2D n'en fournit aucune — elle n'a pas de position à
 * restaurer.
 */

/** Position à sauvegarder, telle que l'attend l'API. */
export type InstantanePosition = { position: [number, number, number]; rotation: number } | null

export interface Seance {
  environnement: Environnement
  jeton: string
  progression: Progression | null
  sessionId: string | null
}

export type EtatSeance =
  | { statut: 'chargement' }
  | { statut: 'ok'; seance: Seance }
  | { statut: 'erreur'; message: string }

export type ChoixReprise = 'attente' | 'reprendre' | 'recommencer'

interface Options {
  /** `desktop` | `mobile` — remonté dans le journal et les déclarations xAPI. */
  typeAppareil: string

  /**
   * Le parcours 2D n'a pas de position à restaurer : il n'y a donc rien à
   * demander, et l'écran de reprise serait une question sans objet.
   */
  demanderReprise?: boolean

  /**
   * Position courante du joueur, si le parcours en a une.
   *
   * Injectée plutôt qu'importée : c'est ce qui garde ce hook — et donc la page
   * accessible — indépendant de Three.js.
   */
  positionCourante?: () => InstantanePosition
}

export function useSeance({
  typeAppareil,
  demanderReprise = true,
  positionCourante,
}: Options) {
  const [etat, setEtat] = useState<EtatSeance>({ statut: 'chargement' })
  const [progression, setProgression] = useState<Progression | null>(null)
  const [choixReprise, setChoixReprise] = useState<ChoixReprise>('attente')
  const [horsLigne, setHorsLigne] = useState(0)

  const amorcer = useInteraction((e) => e.amorcer)

  const debut = useRef(Date.now())
  const tempsAnterieur = useRef(0)
  const journal = useRef<ReturnType<typeof creerJournal> | null>(null)
  const seanceRef = useRef<Seance | null>(null)

  /* ---------------------------------------------------------------- *
   * Ouverture
   * ---------------------------------------------------------------- */
  useEffect(() => {
    let annule = false

    const ouvrir = async () => {
      try {
        const jeton = await obtenirJeton()
        const environnement = await chargerEnvironnement()

        let anterieure: Progression | null = null
        try {
          anterieure = await lireProgression(jeton)
        } catch {
          /* première visite */
        }

        let sessionId: string | null = null
        try {
          sessionId = await ouvrirSession(jeton, typeAppareil)
        } catch {
          // Le journal est un confort d'analyse, pas une condition d'accès à
          // la formation : son échec ne doit pas bloquer l'apprenant.
        }

        if (annule) return

        if (anterieure) amorcer(anterieure.visitedPoints, anterieure.completedPoints)

        setProgression(anterieure)

        const aReprendre =
          demanderReprise &&
          anterieure !== null &&
          (anterieure.lastPosition !== null || anterieure.completedPoints.length > 0)

        setChoixReprise(aReprendre ? 'attente' : 'reprendre')
        setEtat({ statut: 'ok', seance: { environnement, jeton, progression: anterieure, sessionId } })
      } catch (erreur) {
        if (!annule) setEtat({ statut: 'erreur', message: (erreur as Error).message })
      }
    }

    void ouvrir()

    return () => {
      annule = true
    }
  }, [amorcer, demanderReprise, typeAppareil])

  const seance = etat.statut === 'ok' ? etat.seance : null

  useEffect(() => {
    seanceRef.current = seance
    tempsAnterieur.current = seance?.progression?.totalTimeMs ?? 0
  }, [seance])

  /* ---------------------------------------------------------------- *
   * Journal d'événements
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!seance?.sessionId) return

    journal.current = creerJournal(seance.jeton, seance.sessionId)

    return () => {
      journal.current?.arreter()
      journal.current = null
    }
  }, [seance])

  /* ---------------------------------------------------------------- *
   * Sauvegarde débouncée
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!seance || choixReprise === 'attente') return

    const sauvegarde = creerSauvegarde(seance.jeton, setProgression)

    const minuteur = setInterval(() => {
      sauvegarde.programmer({
        visitedPoints: useInteraction.getState().visites,
        completedPoints: useInteraction.getState().termines,
        lastPosition: positionCourante?.() ?? null,
        totalTimeMs: tempsAnterieur.current + (Date.now() - debut.current),
      })

      setHorsLigne(journal.current?.enAttente() ?? 0)
    }, 3000)

    return () => {
      clearInterval(minuteur)
      sauvegarde.vider()
      sauvegarde.arreter()
    }
  }, [seance, choixReprise, positionCourante])

  /* ---------------------------------------------------------------- *
   * Messages vers la page hôte (9.2)
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!progression) return

    emettre({
      source: SOURCE,
      type: 'progress',
      environment: progression.environment,
      completionPct: progression.completionPct,
      completedPoints: progression.completedPoints.length,
      requiredRemaining: progression.missingRequired.length,
    })

    const meilleur = progression.quiz.best

    if (meilleur) {
      emettre({
        source: SOURCE,
        type: 'score',
        environment: progression.environment,
        score: meilleur.score,
        maxScore: meilleur.maxScore,
        percentage: meilleur.percentage,
        passed: progression.quiz.passed,
      })
    }

    if (progression.completed) {
      emettre({
        source: SOURCE,
        type: 'completed',
        environment: progression.environment,
        completionPct: progression.completionPct,
        score: meilleur?.score ?? null,
        maxScore: meilleur?.maxScore ?? null,
        completedAt: progression.completedAt,
      })
    }
  }, [progression])

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  const emettreEvenement = useCallback(
    (type: Parameters<NonNullable<typeof journal.current>['emettre']>[0], charge?: Record<string, unknown>) => {
      journal.current?.emettre(type, charge)
    },
    []
  )

  const ouvrirActivite = useCallback((code: string) => {
    useInteraction.getState().ouvrir(code)
    journal.current?.emettre('activity_started', { point_code: code })
  }, [])

  const terminerActivite = useCallback((code: string) => {
    useInteraction.getState().marquerTermine(code)
    journal.current?.emettre('activity_completed', { point_code: code })
  }, [])

  /** Étape 7.5 — efface la progression, pas les tentatives de quiz. */
  const recommencer = useCallback(async () => {
    if (!seanceRef.current) return

    try {
      await reinitialiserProgression(seanceRef.current.jeton)
    } catch {
      /* la remise à zéro locale reste utile même si l'appel a échoué */
    }

    useInteraction.getState().amorcer([], [])
    debut.current = Date.now()
    tempsAnterieur.current = 0

    setProgression(null)
    setChoixReprise('recommencer')
  }, [])

  return {
    etat,
    seance,
    progression,
    choixReprise,
    setChoixReprise,
    horsLigne,
    debutSeance: debut,
    tempsAnterieur,
    emettreEvenement,
    ouvrirActivite,
    terminerActivite,
    recommencer,
  }
}
