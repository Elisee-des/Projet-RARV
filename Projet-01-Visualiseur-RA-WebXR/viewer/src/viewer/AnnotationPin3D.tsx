import { useMemo } from 'react'
import { Billboard } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Annotation } from '../api/types'
import { pastilleTexture, type EtatPastille } from './pastilleTexture'

type Props = {
  annotation: Annotation
  rayon: number
  actif: boolean
  visite: boolean
  onOuvrir: (annotation: Annotation) => void
}

/**
 * Étape 5.12 — Pastille d'annotation en réalité augmentée.
 *
 * Version purement 3D de la pastille du Lot 4. Indispensable : en mode
 * `dom-overlay`, le rendu WebXR compose la scène avec le flux caméra, et les
 * éléments HTML de `<Html>` de drei ne s'affichent pas dans cette composition.
 *
 * `<Billboard>` fait toujours face à la caméra ; le numéro reste donc lisible
 * quel que soit l'endroit d'où l'utilisateur regarde l'objet.
 */
export function AnnotationPin3D({ annotation, rayon, actif, visite, onOuvrir }: Props) {
  const etat: EtatPastille = actif ? 'active' : visite ? 'visitee' : 'neutre'
  const texture = useMemo(() => pastilleTexture(annotation.order, etat), [annotation.order, etat])

  const surClic = (evenement: ThreeEvent<MouseEvent>) => {
    evenement.stopPropagation()
    onOuvrir(annotation)
  }

  return (
    <Billboard position={annotation.position}>
      <mesh onClick={surClic} onPointerDown={(e) => e.stopPropagation()}>
        {/* Zone de contact plus large que le visuel : viser au doigt, sur un
            objet vu de loin, demande une cible généreuse. */}
        <circleGeometry args={[rayon * (actif ? 1.25 : 1), 32]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </Billboard>
  )
}
