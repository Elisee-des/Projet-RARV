import { useEffect, useRef } from 'react'
import { ContactShadows } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import { Matrix4, Vector3 } from 'three'
import type { Annotation, ObjetPedagogique } from '../api/types'
import { Contenu3D } from './Contenu3D'
import type { Mesure } from './ModeleObjet'
import { ReticuleRA } from './ReticuleRA'
import type { EtatPlacement } from './xrStore'

type Props = {
  objet: ObjetPedagogique
  mesure: Mesure | null
  selection: Annotation | null
  visitees: ReadonlySet<number>
  onMesure: (mesure: Mesure) => void
  onOuvrir: (annotation: Annotation) => void

  phase: EtatPlacement
  position: Vector3 | null
  rotation: number
  facteur: number
  surfaceDetectee: boolean
  onDetection: (detecte: boolean) => void
  onPlacer: (position: Vector3) => void
}

/**
 * Étapes 5.7, 5.8 et 5.10 — Contenu de la scène en réalité augmentée.
 *
 * L'éclairage y est volontairement plat et sans environnement : par-dessus un
 * flux caméra, une carte d'environnement synthétique produit des reflets qui
 * ne correspondent à rien dans la pièce réelle et « décollent » l'objet.
 * L'ombre de contact fait bien plus pour l'ancrage visuel.
 */
export function SceneRA({
  objet,
  mesure,
  selection,
  visitees,
  onMesure,
  onOuvrir,
  phase,
  position,
  rotation,
  facteur,
  surfaceDetectee,
  onDetection,
  onPlacer,
}: Props) {
  const session = useXR((etat) => etat.session)
  const matriceHit = useRef(new Matrix4())

  // Étape 5.8 — un tap pose l'objet. On écoute l'événement `select` de la
  // session plutôt qu'un clic DOM : c'est le signal officiel de WebXR, émis
  // aussi bien au doigt qu'à la gâchette d'une manette.
  useEffect(() => {
    if (!session || phase === 'place') return

    const surSelection = () => {
      if (!surfaceDetectee) return
      onPlacer(new Vector3().setFromMatrixPosition(matriceHit.current))
    }

    session.addEventListener('select', surSelection)

    return () => session.removeEventListener('select', surSelection)
  }, [session, phase, surfaceDetectee, onPlacer])

  const rayonReel = (mesure?.rayon ?? 0.6) * facteur

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight
        position={[1.5, 3, 1]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />

      {phase === 'recherche' && (
        <ReticuleRA positionDetectee={matriceHit} onDetection={onDetection} visible />
      )}

      {phase === 'place' && position && (
        <group position={position} rotation={[0, rotation, 0]} scale={facteur}>
          <Contenu3D
            objet={objet}
            mesure={mesure}
            selection={selection}
            visitees={visitees}
            onMesure={onMesure}
            onOuvrir={onOuvrir}
            pastilles3D
          />

          {/* Étape 5.10 — c'est l'ombre qui « pose » l'objet sur le sol réel. */}
          <ContactShadows
            position={[0, 0.002, 0]}
            opacity={0.62}
            scale={Math.max(rayonReel * 3, 1)}
            blur={2}
            far={rayonReel * 2}
            resolution={512}
            color="#000000"
          />
        </group>
      )}
    </>
  )
}
