import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useProgress } from '@react-three/drei'
import { IfInSessionMode, useXR, XR, XRDomOverlay } from '@react-three/xr'
import { Vector3 } from 'three'
import type { Reprise } from '../api/handoff'
import { envoyerAuLms } from '../api/pontLms'
import type { Annotation, ObjetPedagogique } from '../api/types'
import { useSessionSuivi } from '../hooks/useSessionSuivi'
import { ModaleBascule } from '../ui/ModaleBascule'
import { useSupportRA } from '../hooks/useSupportRA'
import { BarreOutils } from '../ui/BarreOutils'
import { Icone } from '../ui/Icone'
import { PanneauAnnotation } from '../ui/PanneauAnnotation'
import { ParcoursTexte } from '../ui/ParcoursTexte'
import { SuperpositionRA } from '../ui/SuperpositionRA'
import { AnimationCamera } from './AnimationCamera'
import { CadrageAuto } from './CadrageAuto'
import { Contenu3D } from './Contenu3D'
import { EcranChargement } from './EcranChargement'
import { Eclairage } from './Eclairage'
import { LimiteErreur } from './LimiteErreur'
import { SceneRA } from './SceneRA'
import { PanneauPerf, SondeurPerf, type Mesures } from './SondeurPerf'
import { webglDisponible } from './webgl'
import type { Mesure } from './ModeleObjet'
import {
  ECHELLE_MAX,
  ECHELLE_MIN,
  PAS_ECHELLE,
  PAS_ROTATION,
  xrStore,
  type EtatPlacement,
} from './xrStore'

type Props = {
  objet: ObjetPedagogique
  /** Lot 6 — présent quand on arrive par scan du QR code du poste desktop. */
  reprise?: Reprise | null
}

export function Viewer({ objet, reprise = null }: Props) {
  const [modaleBascule, setModaleBascule] = useState(false)
  const [mesure, setMesure] = useState<Mesure | null>(null)
  const [cleRendu, setCleRendu] = useState(0)
  const [selection, setSelection] = useState<Annotation | null>(null)
  const [visitees, setVisitees] = useState<ReadonlySet<number>>(new Set())
  const [erreurRA, setErreurRA] = useState<string | null>(null)
  const [parcoursTexte, setParcoursTexte] = useState(false)
  const [contextePerdu, setContextePerdu] = useState(false)
  const [mesuresPerf, setMesuresPerf] = useState<Mesures | null>(null)

  // Étape 9.2 — profilage activé à la demande, jamais en production par défaut.
  const debug = new URLSearchParams(window.location.search).has('debug')

  // État de la réalité augmentée
  const [enRA, setEnRA] = useState(false)
  const [phaseRA, setPhaseRA] = useState<EtatPlacement>('recherche')
  const [positionRA, setPositionRA] = useState<Vector3 | null>(null)
  const [rotationRA, setRotationRA] = useState(0)
  const [facteurRA, setFacteurRA] = useState(1)
  const [surfaceDetectee, setSurfaceDetectee] = useState(false)

  const actionReinitialiser = useRef<(() => void) | null>(null)
  const chargementSignale = useRef(false)
  const completionSignalee = useRef(false)

  const support = useSupportRA()
  const { active } = useProgress()

  const xrSupported = support === 'verification' ? null : support === 'webxr'
  const { journaliser, sessionId, jeton } = useSessionSuivi(objet.slug, xrSupported, reprise)

  const annotations = objet.annotations
  const echelle = objet.placement.scale

  const onMesure = useCallback((m: Mesure) => setMesure(m), [])

  useEffect(() => {
    if (!mesure || chargementSignale.current) return
    chargementSignale.current = true
    journaliser('model_loaded', { slug: objet.slug, triangles: objet.perf.triangles })
    envoyerAuLms({ type: 'ready', slug: objet.slug, annotations: annotations.length })
  }, [mesure, journaliser, objet.slug, objet.perf.triangles, annotations.length])

  // Étape 7.2 — la leçon hôte suit la progression en direct.
  useEffect(() => {
    if (annotations.length === 0) return
    envoyerAuLms({ type: 'progress', consultees: visitees.size, total: annotations.length })
  }, [visitees, annotations.length])

  useEffect(() => {
    envoyerAuLms({ type: 'ar', actif: enRA })
  }, [enRA])

  const ouvrir = useCallback(
    (annotation: Annotation) => {
      setSelection(annotation)
      setVisitees((precedent) => {
        if (precedent.has(annotation.id)) return precedent
        const suivant = new Set(precedent)
        suivant.add(annotation.id)
        return suivant
      })
      journaliser('annotation_opened', {
        annotation_id: annotation.id,
        label: annotation.label,
      })
    },
    [journaliser]
  )

  const fermer = useCallback(() => {
    if (selection) journaliser('annotation_closed', { annotation_id: selection.id })
    setSelection(null)
  }, [selection, journaliser])

  const decaler = useCallback(
    (pas: number) => {
      if (annotations.length === 0) return
      const index = selection ? annotations.findIndex((a) => a.id === selection.id) : -1
      ouvrir(annotations[(index + pas + annotations.length) % annotations.length])
    },
    [annotations, selection, ouvrir]
  )

  useEffect(() => {
    if (completionSignalee.current) return
    if (annotations.length === 0 || visitees.size < annotations.length) return
    completionSignalee.current = true
    journaliser('completed', { annotations: annotations.length })
    envoyerAuLms({ type: 'completed', slug: objet.slug })
  }, [visitees, annotations.length, journaliser, objet.slug])

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape' && selection) return fermer()
      if (!selection) return
      if (evenement.key === 'ArrowRight') {
        evenement.preventDefault()
        decaler(1)
      }
      if (evenement.key === 'ArrowLeft') {
        evenement.preventDefault()
        decaler(-1)
      }
    }

    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [selection, fermer, decaler])

  const cibleCamera = useMemo(() => {
    if (!selection || enRA) return null
    const [x, y, z] = selection.position
    return new Vector3(x * echelle, y * echelle, z * echelle)
  }, [selection, echelle, enRA])

  const reinitialiser = useCallback(() => {
    setSelection(null)
    actionReinitialiser.current?.()
  }, [])

  /* ---- Réalité augmentée ------------------------------------------- */

  const entrerRA = useCallback(async () => {
    setErreurRA(null)
    try {
      await xrStore.enterAR()
    } catch (cause) {
      console.warn('[RA] session refusée', cause)

      // Étape 9.7 — distinguer les causes : « autorisez la caméra » est
      // inutile quand le vrai problème est un appareil incompatible.
      const nom = cause instanceof DOMException ? cause.name : ''

      setErreurRA(
        nom === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorisez-le dans les paramètres du site, puis réessayez."
          : nom === 'NotSupportedError'
            ? "Cet appareil ne prend pas en charge la réalité augmentée."
            : "La session de réalité augmentée n'a pas pu démarrer. Réessayez, ou utilisez la version texte."
      )
    }
  }, [])

  const quitterRA = useCallback(() => {
    void xrStore.getState().session?.end()
  }, [])

  // Étape 5.13 — un changement de session remet l'état de placement à zéro et
  // journalise l'entrée comme la sortie.
  const surChangementSession = useCallback(
    (actif: boolean) => {
      setEnRA(actif)
      setPhaseRA('recherche')
      setPositionRA(null)
      setRotationRA(0)
      setFacteurRA(1)
      setSurfaceDetectee(false)
      setSelection(null)
      journaliser(actif ? 'ar_entered' : 'ar_exited', { slug: objet.slug })
    },
    [journaliser, objet.slug]
  )

  const placer = useCallback(
    (position: Vector3) => {
      setPositionRA(position)
      setPhaseRA('place')
      journaliser('model_placed', {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      })
    },
    [journaliser]
  )

  const repositionner = useCallback(() => {
    setPhaseRA('recherche')
    setPositionRA(null)
    setSelection(null)
  }, [])

  const ajusterEchelle = useCallback((sens: number) => {
    setFacteurRA((f) =>
      Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, Number((f + sens * PAS_ECHELLE).toFixed(2))))
    )
  }, [])

  const ajusterRotation = useCallback((sens: number) => {
    setRotationRA((r) => r + sens * PAS_ROTATION)
  }, [])

  /* ------------------------------------------------------------------ */

  // Étape 9.4 — sans WebGL, le contenu reste intégralement consultable.
  // Le parcours texte n'est pas un message d'excuse : c'est la formation.
  if (!webglDisponible()) {
    return (
      <div className="viewer viewer--texte">
        <p className="viewer__avis" role="status">
          <Icone nom="alerte" /> Ce navigateur ne peut pas afficher de 3D — accélération
          matérielle désactivée ou non disponible. Voici la version texte, avec le même contenu
          et le même suivi.
        </p>
        <ParcoursTexte objet={objet} visitees={visitees} onOuvrir={ouvrir} autonome />
      </div>
    )
  }

  const rayon = mesure?.rayon ?? 1
  const enChargement = !enRA && (active || mesure === null)

  return (
    <div className={`viewer ${selection && !enRA ? 'viewer--fiche-ouverte' : ''}`}>
      <LimiteErreur
        key={cleRendu}
        repli={(message) => (
          <PanneauErreur
            titre="Le modèle 3D n'a pas pu être chargé"
            message={message}
            onReessayer={() => {
              setMesure(null)
              chargementSignale.current = false
              setCleRendu((k) => k + 1)
            }}
          />
        )}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, near: 0.05, far: 100, position: [1.8, 1.2, 2.4] }}
          // Étape 9.7 — perte du contexte GPU : mise en veille prolongée,
          // pilote qui redémarre, onglet inactif trop longtemps. Sans
          // preventDefault, le navigateur n'essaie même pas de le restaurer.
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (evenement) => {
              evenement.preventDefault()
              setContextePerdu(true)
            })
            gl.domElement.addEventListener('webglcontextrestored', () => setContextePerdu(false))
          }}
        >
          {debug && <SondeurPerf onMesures={setMesuresPerf} />}
          <XR store={xrStore}>
            <SurveillanceSessionRA onChangement={surChangementSession} />

            {/* --- Mode navigateur --- */}
            <IfInSessionMode deny="immersive-ar">
              <color attach="background" args={['#11151a']} />
              <Eclairage rayon={rayon} />

              <Suspense fallback={null}>
                <Contenu3D
                  objet={objet}
                  mesure={mesure}
                  selection={selection}
                  visitees={visitees}
                  onMesure={onMesure}
                  onOuvrir={ouvrir}
                />
              </Suspense>

              <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} />
              <CadrageAuto mesure={mesure} actionReinitialiser={actionReinitialiser} />
              <AnimationCamera cible={cibleCamera} rayon={rayon} />
            </IfInSessionMode>

            {/* --- Mode réalité augmentée --- */}
            <IfInSessionMode allow="immersive-ar">
              <SceneRA
                objet={objet}
                mesure={mesure}
                selection={selection}
                visitees={visitees}
                onMesure={onMesure}
                onOuvrir={ouvrir}
                phase={phaseRA}
                position={positionRA}
                rotation={rotationRA}
                facteur={facteurRA}
                surfaceDetectee={surfaceDetectee}
                onDetection={setSurfaceDetectee}
                onPlacer={placer}
              />

              <XRDomOverlay>
                <SuperpositionRA
                  phase={phaseRA}
                  surfaceDetectee={surfaceDetectee}
                  facteur={facteurRA}
                  consultees={visitees.size}
                  total={annotations.length}
                  selection={selection}
                  onRepositionner={repositionner}
                  onEchelle={ajusterEchelle}
                  onRotation={ajusterRotation}
                  onQuitter={quitterRA}
                  onFermerFiche={fermer}
                  onAnnotationPrecedente={() => decaler(-1)}
                  onAnnotationSuivante={() => decaler(1)}
                />
              </XRDomOverlay>
            </IfInSessionMode>
          </XR>
        </Canvas>

        {enChargement && <EcranChargement poster={objet.assets.poster} titre={objet.title} />}

        {debug && <PanneauPerf mesures={mesuresPerf} />}

        {contextePerdu && (
          <div className="erreur" role="alert">
            <div className="erreur__carte">
              <p className="erreur__titre">
                <Icone nom="alerte" /> Affichage 3D interrompu
              </p>
              <p className="erreur__message">
                Le navigateur a libéré le contexte graphique — souvent après une mise en veille.
                Il se rétablit généralement seul ; sinon, rechargez la page ou passez à la version texte.
              </p>
              <button type="button" className="outils__bouton" onClick={() => setParcoursTexte(true)}>
                <Icone nom="versionTexte" /> Ouvrir la version texte
              </button>
            </div>
          </div>
        )}

        {!enRA && annotations.length > 0 && (
          <Progression
            consultees={visitees.size}
            total={annotations.length}
            onPrecedent={() => decaler(-1)}
            onSuivant={() => decaler(1)}
          />
        )}

        {!enRA && (
          <BarreOutils
            support={support}
            usdz={objet.assets.usdz}
            onReinitialiser={reinitialiser}
            onEntrerRA={entrerRA}
            // Étape 5.16 — iOS ne signale jamais la fin de Quick Look :
            // on journalise l'entrée, la sortie restera inconnue.
            onQuickLook={() => journaliser('ar_entered', { mode: 'quicklook' })}
            // Étape 6.2 — la bascule n'a de sens que sans RA locale, et
            // seulement une fois la session ouverte : il faut une session
            // à rattacher au téléphone.
            onBasculeMobile={
              support === 'indisponible' && sessionId && jeton
                ? () => setModaleBascule(true)
                : undefined
            }
            onParcoursTexte={() => setParcoursTexte(true)}
          />
        )}

        {modaleBascule && sessionId && jeton && (
          <ModaleBascule
            jeton={jeton}
            sessionId={sessionId}
            onFermer={() => setModaleBascule(false)}
          />
        )}

        {/* Étape 6.3 — arrivée par QR code. Le navigateur EXIGE un geste
            utilisateur pour ouvrir une session WebXR : impossible de lancer
            la RA automatiquement, d'où cet écran d'accueil. */}
        {reprise && !enRA && support === 'webxr' && (
          <div className="reprise" role="dialog" aria-labelledby="reprise-titre">
            <div className="reprise__boite">
              <p className="reprise__pastille">Reprise depuis votre ordinateur</p>
              <h2 id="reprise-titre">{objet.title}</h2>
              <p className="reprise__texte">
                Votre progression est conservée. Touchez le bouton pour poser l'objet dans votre pièce.
              </p>
              <button type="button" className="reprise__bouton" onClick={entrerRA}>
                <Icone nom="telephone" taille={18} /> Lancer la réalité augmentée
              </button>
            </div>
          </div>
        )}

        {!enRA && erreurRA && (
          <p className="alerte-ra" role="alert">
            {erreurRA}
          </p>
        )}

        {!enRA && selection && !parcoursTexte && (
          <PanneauAnnotation
            annotation={selection}
            total={annotations.length}
            onFermer={fermer}
            onPrecedente={() => decaler(-1)}
            onSuivante={() => decaler(1)}
          />
        )}

        {/* Étape 9.4 — disponible en permanence, pas seulement en secours. */}
        {!enRA && parcoursTexte && (
          <ParcoursTexte
            objet={objet}
            visitees={visitees}
            onOuvrir={ouvrir}
            onFermer={() => setParcoursTexte(false)}
          />
        )}
      </LimiteErreur>
    </div>
  )
}

/** Remonte l'état de la session XR au composant parent, hors du Canvas. */
function SurveillanceSessionRA({ onChangement }: { onChangement: (actif: boolean) => void }) {
  const session = useXR((etat) => etat.session)

  useEffect(() => {
    onChangement(session != null)
  }, [session, onChangement])

  return null
}

function Progression({
  consultees,
  total,
  onPrecedent,
  onSuivant,
}: {
  consultees: number
  total: number
  onPrecedent: () => void
  onSuivant: () => void
}) {
  const termine = consultees >= total

  return (
    <div className={`progression ${termine ? 'progression--terminee' : ''}`}>
      <div className="progression__piste" aria-hidden="true">
        <div className="progression__barre" style={{ width: `${(consultees / total) * 100}%` }} />
      </div>

      <div className="progression__ligne">
        <p className="progression__texte" role="status" aria-live="polite">
          {termine ? (
            <>
              <Icone nom="termine" taille={14} /> Toutes consultées
            </>
          ) : (
            `${consultees} / ${total} annotations`
          )}
        </p>

        {/*
          Ces flèches ne sont pas un confort. Une pastille située derrière une
          pièce est masquée — c'est le rôle de l'occlusion — et rien
          n'indiquerait comment l'atteindre. Elles garantissent que les N
          annotations restent accessibles quel que soit l'angle de vue.
        */}
        <span className="progression__fleches">
          <button type="button" onClick={onPrecedent} aria-label="Annotation précédente">
            <Icone nom="precedent" taille={15} />
          </button>
          <button type="button" onClick={onSuivant} aria-label="Annotation suivante">
            <Icone nom="suivant" taille={15} />
          </button>
        </span>
      </div>
    </div>
  )
}

function PanneauErreur({
  titre,
  message,
  onReessayer,
}: {
  titre: string
  message: string
  onReessayer?: () => void
}) {
  return (
    <div className="erreur" role="alert">
      <div className="erreur__carte">
        <p className="erreur__titre">
          <Icone nom="alerte" /> {titre}
        </p>
        <p className="erreur__message">{message}</p>
        {onReessayer && (
          <button type="button" className="outils__bouton" onClick={onReessayer}>
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}
