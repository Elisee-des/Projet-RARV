import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace, Vector3 } from 'three'
import type { MeshBVH } from 'three-mesh-bvh'

import Labo, { type Diagnostic } from './scene/Labo'
import Collider from './scene/Collider'
import ControleurJoueur from './scene/ControleurJoueur'
import Postes from './scene/Postes'
import Viseur from './scene/Viseur'
import AmbianceSonore from './scene/AmbianceSonore'
import DetecteurPerf, { type MesurePerf, type Qualite } from './scene/DetecteurPerf'
import { type GrapheScene } from './scene/reperes'
import { qualiteInitiale, webglDisponible } from './scene/webgl'
import { instantanePosition } from './scene/etatJoueur'
import { SALLE } from './scene/dimensions'

import Joystick from './entrees/Joystick'
import { estTactile } from './entrees/regard'

import EcranChargement from './ui/EcranChargement'
import EcranErreur from './ui/EcranErreur'
import LimiteErreur from './ui/LimiteErreur'
import Hud from './ui/Hud'
import MiniCarte from './ui/MiniCarte'
import Confort from './ui/Confort'
import Vignette from './ui/Vignette'
import Reticule from './ui/Reticule'
import IndicateursHorsChamp from './ui/IndicateursHorsChamp'
import ActiviteOuverte from './ui/ActiviteOuverte'

import HudApprenant from './ui/HudApprenant'
import Reprise from './ui/Reprise'
import EcranFin from './ui/EcranFin'

import { suivrePreferenceMouvement } from './etat/reglages'
import { useInteraction } from './etat/interaction'
import { chargerEnvironnement, obtenirJeton } from './api/environnement'
import { creerSauvegarde, lireProgression, reinitialiserProgression } from './api/progression'
import { creerJournal, ouvrirSession } from './api/evenements'
import { emettre, SOURCE } from './lms/protocole'
import type { Environnement, Progression } from './api/types'

/** Étape 7.3 — y a-t-il vraiment quelque chose à reprendre ? */
function meriteUneReprise(progression: Progression | null): boolean {
  if (!progression) return false

  return progression.lastPosition !== null || progression.completedPoints.length > 0
}

interface Seance {
  environnement: Environnement
  jeton: string
  progression: Progression | null
  sessionId: string | null
}

type EtatSeance =
  | { statut: 'chargement' }
  | { statut: 'ok'; seance: Seance }
  | { statut: 'erreur'; message: string }

type Journal = ReturnType<typeof creerJournal>

export default function App() {
  const [etat, setEtat] = useState<EtatSeance>({ statut: 'chargement' })
  const [graphe, setGraphe] = useState<GrapheScene | null>(null)
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const [bvh, setBvh] = useState<MeshBVH | null>(null)
  const [trianglesCollision, setTrianglesCollision] = useState(0)
  const [mesure, setMesure] = useState<MesurePerf | null>(null)
  const [son, setSon] = useState(false)

  // Lot 7 — progression recalculée par le serveur à chaque sauvegarde.
  const [progressionCourante, setProgressionCourante] = useState<Progression | null>(null)
  const [choixReprise, setChoixReprise] = useState<'attente' | 'reprendre' | 'recommencer'>('attente')
  const [finVisible, setFinVisible] = useState(false)
  const [finDejaMontree, setFinDejaMontree] = useState(false)
  const [horsLigne, setHorsLigne] = useState(0)

  const [qualiteDepart] = useState<Qualite>(qualiteInitiale)
  const [qualite, setQualite] = useState<Qualite>(qualiteDepart)

  const vise = useInteraction((e) => e.vise)
  const ouvert = useInteraction((e) => e.ouvert)
  const visites = useInteraction((e) => e.visites)
  const termines = useInteraction((e) => e.termines)
  const ouvrirActivite = useInteraction((e) => e.ouvrir)
  const fermerActivite = useInteraction((e) => e.fermer)
  const marquerTermine = useInteraction((e) => e.marquerTermine)
  const amorcerInteraction = useInteraction((e) => e.amorcer)

  const webgl = useMemo(webglDisponible, [])
  const tactile = useMemo(estTactile, [])
  const debutSeance = useRef(Date.now())
  const tempsAnterieur = useRef(0)
  const journal = useRef<Journal | null>(null)

  // `recommencer` est déclaré avant que `seance` ne soit calculée, et il est
  // appelé depuis deux écrans distincts. Une référence évite de le recréer à
  // chaque rendu et de propager la dépendance dans toute la chaîne.
  const seanceRef = useRef<Seance | null>(null)

  /**
   * Étape 7.5 — recommencer.
   *
   * L'ordre compte : on efface côté serveur AVANT de vider l'état local, sinon
   * la sauvegarde débouncée réécrirait la progression qu'on vient de supprimer.
   */
  const recommencer = useCallback(async () => {
    if (!seanceRef.current) return

    try {
      await reinitialiserProgression(seanceRef.current.jeton)
    } catch {
      /* la remise à zéro locale reste utile même si l'appel a échoué */
    }

    useInteraction.getState().amorcer([], [])
    debutSeance.current = Date.now()
    tempsAnterieur.current = 0

    setProgressionCourante(null)
    setFinVisible(false)
    setFinDejaMontree(false)
    setChoixReprise('recommencer')
  }, [])

  /* -------------------------------------------------------------- *
   * Ouverture de séance
   * -------------------------------------------------------------- */
  useEffect(() => {
    let annule = false

    const ouvrir = async () => {
      try {
        const jeton = await obtenirJeton()
        const environnement = await chargerEnvironnement()

        let progression: Progression | null = null
        try {
          progression = await lireProgression(jeton)
        } catch {
          /* première visite */
        }

        // Étape 5.8 — session de parcours, mutualisée avec le module viewer-ra.
        let sessionId: string | null = null
        try {
          sessionId = await ouvrirSession(jeton, tactile ? 'mobile' : 'desktop')
        } catch {
          // Le journal est un confort d'analyse, pas une condition d'accès à la
          // formation : son échec ne doit pas bloquer l'apprenant.
        }

        if (annule) return

        if (progression) {
          amorcerInteraction(progression.visitedPoints, progression.completedPoints)
        }

        setProgressionCourante(progression)

        // 7.3 — on ne pose la question que s'il y a réellement quelque chose à
        // reprendre. Un rechargement dans les premières secondes ne doit pas
        // faire apparaître une modale sans objet.
        setChoixReprise(meriteUneReprise(progression) ? 'attente' : 'reprendre')

        setEtat({ statut: 'ok', seance: { environnement, jeton, progression, sessionId } })
      } catch (erreur) {
        if (!annule) setEtat({ statut: 'erreur', message: (erreur as Error).message })
      }
    }

    void ouvrir()
    const arreterSuivi = suivrePreferenceMouvement()

    return () => {
      annule = true
      arreterSuivi()
    }
  }, [amorcerInteraction, tactile])

  const seance = etat.statut === 'ok' ? etat.seance : null

  useEffect(() => {
    seanceRef.current = seance
    tempsAnterieur.current = seance?.progression?.totalTimeMs ?? 0
  }, [seance])

  /* -------------------------------------------------------------- *
   * Étape 5.8 — journal d'événements
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!seance?.sessionId) return

    journal.current = creerJournal(seance.jeton, seance.sessionId)

    return () => {
      journal.current?.arreter()
      journal.current = null
    }
  }, [seance])

  useEffect(() => {
    if (graphe && bvh) {
      journal.current?.emettre('scene_loaded', {
        postes: graphe.points.length,
        depuis_glb: graphe.points.filter((p) => p.source === 'glb').length,
      })
    }
  }, [graphe, bvh])

  useEffect(() => {
    if (vise) journal.current?.emettre('point_entered', { point_code: vise })
  }, [vise])

  /* -------------------------------------------------------------- *
   * Étape 4.10 — sauvegarde débouncée
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!seance || !graphe || choixReprise === 'attente') return

    const sauvegarde = creerSauvegarde(seance.jeton, setProgressionCourante)

    const minuteur = setInterval(() => {
      sauvegarde.programmer({
        visitedPoints: useInteraction.getState().visites,
        completedPoints: useInteraction.getState().termines,
        lastPosition: instantanePosition(),
        totalTimeMs: tempsAnterieur.current + (Date.now() - debutSeance.current),
      })

      setHorsLigne(journal.current?.enAttente() ?? 0)
    }, 3000)

    return () => {
      clearInterval(minuteur)
      sauvegarde.vider()
      sauvegarde.arreter()
    }
  }, [seance, graphe, choixReprise])

  /* -------------------------------------------------------------- *
   * Étape 9.2 — messages vers la page hôte du LMS
   * -------------------------------------------------------------- *
   *
   * Émis depuis un effet plutôt qu'au fil des actions : la source de vérité est
   * la progression RECALCULÉE par le serveur, pas ce que le client croit avoir
   * fait. Un LMS qui recevrait une progression optimiste afficherait un module
   * validé que le serveur refuse d'attester.
   */
  useEffect(() => {
    if (!seance || !graphe) return

    emettre({
      source: SOURCE,
      type: 'ready',
      environment: seance.environnement.slug,
      title: seance.environnement.title,
      pointCount: graphe.points.length,
    })
  }, [seance, graphe])

  useEffect(() => {
    if (!progressionCourante) return

    emettre({
      source: SOURCE,
      type: 'progress',
      environment: progressionCourante.environment,
      completionPct: progressionCourante.completionPct,
      completedPoints: progressionCourante.completedPoints.length,
      requiredRemaining: progressionCourante.missingRequired.length,
    })

    const meilleur = progressionCourante.quiz.best

    if (meilleur) {
      emettre({
        source: SOURCE,
        type: 'score',
        environment: progressionCourante.environment,
        score: meilleur.score,
        maxScore: meilleur.maxScore,
        percentage: meilleur.percentage,
        passed: progressionCourante.quiz.passed,
      })
    }

    if (progressionCourante.completed) {
      emettre({
        source: SOURCE,
        type: 'completed',
        environment: progressionCourante.environment,
        completionPct: progressionCourante.completionPct,
        score: meilleur?.score ?? null,
        maxScore: meilleur?.maxScore ?? null,
        completedAt: progressionCourante.completedAt,
      })
    }
  }, [progressionCourante])

  /* -------------------------------------------------------------- *
   * Étape 7.5 — l'écran de fin s'ouvre une fois, à la validation
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!progressionCourante?.completed || finDejaMontree) return

    setFinVisible(true)
    setFinDejaMontree(true)
  }, [progressionCourante?.completed, finDejaMontree])

  /* -------------------------------------------------------------- *
   * Étape 5.4 — ouverture au clavier
   * -------------------------------------------------------------- */
  const surOuvrir = useCallback(
    (code: string) => {
      ouvrirActivite(code)
      journal.current?.emettre('activity_started', { point_code: code })
    },
    [ouvrirActivite]
  )

  const surTerminer = useCallback(
    (code: string) => {
      marquerTermine(code)
      journal.current?.emettre('activity_completed', { point_code: code })
    },
    [marquerTermine]
  )

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.code !== 'KeyE') return

      const etatCourant = useInteraction.getState()
      if (etatCourant.ouvert || !etatCourant.vise) return

      evenement.preventDefault()
      surOuvrir(etatCourant.vise)
    }

    window.addEventListener('keydown', surTouche)

    return () => window.removeEventListener('keydown', surTouche)
  }, [surOuvrir])

  const surGraphePret = useCallback((nouveau: GrapheScene, infos: Diagnostic) => {
    setGraphe(nouveau)
    setDiagnostic(infos)
  }, [])

  const surColliderPret = useCallback((nouveau: MeshBVH, triangles: number) => {
    setBvh(nouveau)
    setTrianglesCollision(triangles)
  }, [])

  const surMesure = useCallback((nouvelle: MesurePerf) => {
    setMesure(nouvelle)
    setQualite(nouvelle.qualite)
  }, [])

  /* -------------------------------------------------------------- *
   * Impasses (étape 3.8)
   * -------------------------------------------------------------- */

  if (!webgl) {
    return (
      <EcranErreur
        titre="La 3D n'est pas disponible sur cet appareil"
        message="Votre navigateur n'expose pas WebGL — accélération matérielle désactivée,
                pilote non pris en charge, ou machine sans GPU. La formation reste entièrement
                suivable dans sa version sans 3D."
      />
    )
  }

  if (etat.statut === 'erreur') {
    return (
      <EcranErreur
        titre="L'atelier n'a pas pu être chargé"
        message="Le serveur n'a pas répondu. Vérifiez que l'API Laravel est démarrée sur le
                port 8000, puis réessayez."
        detail={etat.message}
        onReessayer={() => window.location.reload()}
      />
    )
  }

  if (etat.statut === 'chargement' || !seance) {
    return <EcranChargement progression={8} titre="Préparation de la séance" etape="ouverture de la session" />
  }

  const { environnement, progression } = seance
  const urlScene = environnement.assets.scene
  const urlCollision = environnement.assets.collision

  if (!urlScene || !urlCollision) {
    return (
      <EcranErreur
        titre="Scène 3D incomplète"
        message="Cet environnement n'a pas encore de fichier de scène ou de mesh de collision.
                Le Lot 1 doit les produire, ou le blocking doit être généré."
        detail="npm run blocking:generer"
      />
    )
  }

  // 7.3 — la position de reprise n'est utilisée que si l'apprenant l'a choisie.
  const reprise = choixReprise === 'reprendre' ? (progression?.lastPosition ?? null) : null

  const depart = reprise
    ? new Vector3(...reprise.position)
    : (graphe?.spawn.position ?? new Vector3(5, 0, 6.5))

  const lacetDepart = reprise?.rotation ?? graphe?.spawn.lacet ?? 0
  const posteOuvert = graphe?.points.find((p) => p.code === ouvert) ?? null
  const pret = graphe !== null && bvh !== null

  // Tant que l'apprenant n'a pas répondu, on ne démarre ni la simulation ni la
  // sauvegarde : le placer quelque part avant qu'il ait choisi rendrait la
  // question caduque.
  const enAttenteDeChoix = choixReprise === 'attente'

  return (
    <LimiteErreur>
      <Canvas
        dpr={qualite === 'reduite' ? [1, 1.25] : [1, 2]}
        camera={{ fov: 62, near: 0.1, far: 60 }}
        gl={{ antialias: qualiteDepart === 'normale', powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          gl.outputColorSpace = SRGBColorSpace

          gl.domElement.addEventListener('webglcontextlost', (evenement) => {
            evenement.preventDefault()
            console.warn('Contexte WebGL perdu — restauration en cours')
          })
        }}
      >
        <color attach="background" args={['#0b1220']} />
        <fog attach="fog" args={['#0b1220', 18, 42]} />

        <Suspense fallback={null}>
          <Labo environnement={environnement} urlScene={urlScene} onGraphePret={surGraphePret} />
          <Collider url={urlCollision} onPret={surColliderPret} />
          {graphe && <Postes points={graphe.points} />}
        </Suspense>

        {pret && graphe && bvh && !enAttenteDeChoix && (
          <>
            <ControleurJoueur
              bvh={bvh}
              environnement={environnement}
              points={graphe.points}
              depart={depart}
              lacetDepart={lacetDepart}
              verrouille={ouvert !== null || finVisible}
            />
            <Viseur bvh={bvh} points={graphe.points} actif={ouvert === null && !finVisible} />
          </>
        )}

        {graphe && <AmbianceSonore active={son} position={[SALLE.largeur / 2, 1.6, SALLE.profondeur / 2]} />}

        <DetecteurPerf qualite={qualite} onMesure={surMesure} />
      </Canvas>

      <ChargementScene titre={environnement.title} pret={pret} />

      {/* 7.3 — la question passe avant tout le reste */}
      {pret && enAttenteDeChoix && progression && (
        <Reprise
          progression={progression}
          titre={environnement.title}
          onReprendre={() => setChoixReprise('reprendre')}
          onRecommencer={() => void recommencer()}
        />
      )}

      {pret && graphe && !enAttenteDeChoix && (
        <>
          <Vignette />

          {/* 7.1 — HUD permanent de l'apprenant */}
          <HudApprenant
            points={graphe.points}
            progression={progressionCourante}
            debutSeance={debutSeance.current}
            tempsAnterieurMs={tempsAnterieur.current}
            horsLigne={horsLigne}
            onOuvrirFin={() => setFinVisible(true)}
          />

          {!ouvert && !finVisible && (
            <>
              <Reticule points={graphe.points} tactile={tactile} onOuvrir={surOuvrir} />
              <IndicateursHorsChamp points={graphe.points} />
              {tactile && <Joystick />}
            </>
          )}

          <Hud
            environnement={environnement}
            graphe={graphe}
            diagnostic={diagnostic}
            mesure={mesure}
            qualite={qualite}
            son={son}
            onBasculerSon={() => setSon((actif) => !actif)}
            trianglesCollision={trianglesCollision}
            posteProche={vise}
            repriseActive={reprise !== null}
            tactile={tactile}
            visites={visites.length}
            termines={termines.length}
          />

          <MiniCarte environnement={environnement} points={graphe.points} termines={termines} />

          <Confort />

          {posteOuvert && !finVisible && (
            <ActiviteOuverte
              poste={posteOuvert}
              jeton={seance.jeton}
              sessionId={seance.sessionId}
              dejaTermine={termines.includes(posteOuvert.code)}
              onFermer={fermerActivite}
              onTerminer={surTerminer}
            />
          )}

          {/* 7.5 et 7.6 — récapitulatif et attestation */}
          {finVisible && progressionCourante && (
            <EcranFin
              progression={progressionCourante}
              points={graphe.points}
              titre={environnement.title}
              jeton={seance.jeton}
              onFermer={() => setFinVisible(false)}
              onRecommencer={() => void recommencer()}
            />
          )}
        </>
      )}
    </LimiteErreur>
  )
}

function ChargementScene({ titre, pret }: { titre: string; pret: boolean }) {
  const { progress, item, active } = useProgress()

  if (pret && !active) return null

  const etape = progress >= 100 ? 'construction du BVH de collision' : (item ?? 'téléchargement de la salle')

  return (
    <EcranChargement
      titre={titre}
      progression={Math.max(10, progress)}
      etape={etape.replace(/^https?:\/\/[^/]+/, '').slice(0, 64)}
    />
  )
}
