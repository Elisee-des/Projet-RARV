import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  chargerObjet,
  creerAnnotation,
  modifierAnnotation,
  reordonnerAnnotations,
  supprimerAnnotation,
  type BrouillonAnnotation,
  type ObjetEditable,
} from '../api/editeur'
import { liens } from '../api/liens'
import type { Annotation, Triplet } from '../api/types'
import { Icone } from '../ui/Icone'
import { AnnotationPin } from '../viewer/AnnotationPin'
import { CadrageAuto } from '../viewer/CadrageAuto'
import { Eclairage } from '../viewer/Eclairage'
import { LimiteErreur } from '../viewer/LimiteErreur'
import type { Mesure } from '../viewer/ModeleObjet'
import { ModeleEditable } from './ModeleEditable'
import { PanneauAnnotations } from './PanneauAnnotations'

type Props = {
  slug: string
  jeton: string
}

export type Brouillon = BrouillonAnnotation & { piece: string }

export function Editeur({ slug, jeton }: Props) {
  const [objet, setObjet] = useState<ObjetEditable | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [mesure, setMesure] = useState<Mesure | null>(null)
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [edition, setEdition] = useState<Annotation | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const cadrer = useRef<(() => void) | null>(null)

  useEffect(() => {
    chargerObjet(slug, jeton)
      .then(setObjet)
      .catch((cause: Error) => setErreur(cause.message))
  }, [slug, jeton])

  const annoncer = useCallback((texte: string) => {
    setMessage(texte)
    window.setTimeout(() => setMessage(null), 3000)
  }, [])

  const onMesure = useCallback((m: Mesure) => setMesure(m), [])

  // Étape 8.4 — un clic sur le modèle prépare une annotation à cet endroit.
  const piquer = useCallback((position: Triplet, normale: Triplet, piece: string) => {
    setEdition(null)
    setBrouillon({
      piece,
      label: piece.replace(/[-_]/g, ' '),
      title: '',
      bodyHtml: '<p></p>',
      position,
      normal: normale,
    })
  }, [])

  const enregistrer = useCallback(
    async (champs: BrouillonAnnotation) => {
      if (!objet) return
      setOccupe(true)

      try {
        if (edition) {
          const maj = await modifierAnnotation(slug, jeton, edition.id, champs)
          setObjet({
            ...objet,
            annotations: objet.annotations.map((a) => (a.id === maj.id ? maj : a)),
          })
          annoncer('Annotation modifiée.')
        } else {
          const creee = await creerAnnotation(slug, jeton, champs)
          setObjet({ ...objet, annotations: [...objet.annotations, creee] })
          annoncer('Annotation ajoutée.')
        }

        setBrouillon(null)
        setEdition(null)
      } catch (cause) {
        setErreur(cause instanceof Error ? cause.message : 'Enregistrement impossible.')
      } finally {
        setOccupe(false)
      }
    },
    [objet, edition, slug, jeton, annoncer]
  )

  const supprimer = useCallback(
    async (annotation: Annotation) => {
      if (!objet) return
      if (!window.confirm(`Supprimer l'annotation « ${annotation.title || annotation.label} » ?`)) return

      setOccupe(true)

      try {
        await supprimerAnnotation(slug, jeton, annotation.id)
        setObjet({ ...objet, annotations: objet.annotations.filter((a) => a.id !== annotation.id) })
        if (edition?.id === annotation.id) setEdition(null)
        annoncer('Annotation supprimée.')
      } catch (cause) {
        setErreur(cause instanceof Error ? cause.message : 'Suppression impossible.')
      } finally {
        setOccupe(false)
      }
    },
    [objet, slug, jeton, edition, annoncer]
  )

  // Étape 8.5 — l'ordre est envoyé en bloc : le serveur le réécrit dans une
  // transaction, jamais annotation par annotation.
  const reordonner = useCallback(
    async (ids: number[]) => {
      if (!objet) return

      const avant = objet.annotations
      const parId = new Map(avant.map((a) => [a.id, a]))
      setObjet({ ...objet, annotations: ids.map((id) => parId.get(id)!).filter(Boolean) })

      try {
        const remises = await reordonnerAnnotations(slug, jeton, ids)
        setObjet((precedent) => (precedent ? { ...precedent, annotations: remises } : precedent))
      } catch (cause) {
        setObjet({ ...objet, annotations: avant }) // retour à l'état antérieur
        setErreur(cause instanceof Error ? cause.message : 'Réordonnancement impossible.')
      }
    },
    [objet, slug, jeton]
  )

  if (erreur && !objet) {
    return (
      <div className="page page--centre">
        <div className="erreur__carte" role="alert">
          <p className="erreur__titre">
            <Icone nom="alerte" /> Éditeur indisponible
          </p>
          <p className="erreur__message">{erreur}</p>
        </div>
      </div>
    )
  }

  if (!objet) {
    return (
      <div className="page page--centre">
        <p className="page__attente">Chargement de l'éditeur…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <nav className="ruban" aria-label="Navigation principale">
        <a href={liens.backOffice()}>
          <Icone nom="retour" /> Back-office
        </a>
        <a href={liens.lecon(objet.slug)}>
          <Icone nom="lecon" /> Voir la leçon
        </a>
        <a href={liens.tableauDeBord()}>
          <Icone nom="graphique" /> Tableau de bord
        </a>
        <a href={liens.accueil()}>
          <Icone nom="accueil" /> Accueil
        </a>
      </nav>

      <header className="entete">
        <div>
          <h1 className="entete__titre">
            <Icone nom="annotation" taille={17} /> Éditeur d'annotations — {objet.title}
          </h1>
          <p className="entete__categorie">
            {objet.status === 'published' ? 'Publié' : 'Brouillon'} · {objet.slug} ·{' '}
            {objet.perf.triangles?.toLocaleString('fr-FR') ?? '—'} triangles
          </p>
        </div>
        <dl className="entete__mesures">
          <div>
            <dt>Annotations</dt>
            <dd>{objet.annotations.length}</dd>
          </div>
        </dl>
      </header>

      <div className="editeur">
        <div className="editeur__scene">
          <LimiteErreur
            repli={(m) => (
              <div className="erreur">
                <div className="erreur__carte">
                  <p className="erreur__titre">
                    <Icone nom="alerte" /> Modèle illisible
                  </p>
                  <p className="erreur__message">{m}</p>
                </div>
              </div>
            )}
          >
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ fov: 45, near: 0.05, far: 100, position: [1.8, 1.2, 2.4] }}
            >
              <color attach="background" args={['#11151a']} />
              <Eclairage rayon={mesure?.rayon ?? 1} />

              <Suspense fallback={null}>
                <ModeleEditable
                  url={objet.assets.glb}
                  echelle={objet.placement.scale}
                  onMesure={onMesure}
                  onPiquer={piquer}
                >
                  {objet.annotations.map((annotation) => (
                    <AnnotationPin
                      key={annotation.id}
                      annotation={annotation}
                      actif={edition?.id === annotation.id}
                      visite={false}
                      onOuvrir={(a) => {
                        setBrouillon(null)
                        setEdition(a)
                      }}
                    />
                  ))}

                  {brouillon && (
                    <mesh position={brouillon.position}>
                      <sphereGeometry args={[(mesure?.rayon ?? 1) * 0.035, 16, 16]} />
                      <meshBasicMaterial color="#f59e0b" toneMapped={false} />
                    </mesh>
                  )}
                </ModeleEditable>
              </Suspense>

              <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} />
              <CadrageAuto mesure={mesure} actionReinitialiser={cadrer} />
            </Canvas>
          </LimiteErreur>

          <p className="editeur__consigne">
            {brouillon
              ? `Point posé sur « ${brouillon.piece} » — complétez la fiche à droite.`
              : 'Cliquez sur une pièce du modèle pour y poser une annotation.'}
          </p>
        </div>

        <PanneauAnnotations
          objet={objet}
          brouillon={brouillon}
          edition={edition}
          occupe={occupe}
          message={message}
          erreur={erreur}
          onAnnuler={() => {
            setBrouillon(null)
            setEdition(null)
          }}
          onEnregistrer={enregistrer}
          onEditer={setEdition}
          onSupprimer={supprimer}
          onReordonner={reordonner}
        />
      </div>
    </div>
  )
}
