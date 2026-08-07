import { useCallback, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Group, Matrix4, Vector3 } from 'three'
import type { Triplet } from '../api/types'
import { ModeleObjet, type Mesure } from '../viewer/ModeleObjet'

type Props = {
  url: string
  echelle: number
  onMesure: (mesure: Mesure) => void
  onPiquer: (position: Triplet, normale: Triplet, piece: string) => void
  children?: React.ReactNode
}

const inverse = new Matrix4()

/**
 * Étape 8.4 — Le clic qui pose une annotation.
 *
 * ⚠️ Le piège du lot : `event.point` est en espace MONDE et `face.normal` en
 * espace local du maillage touché. Or une annotation doit être stockée en
 * espace local du MODÈLE — sinon les pastilles se décrochent dès que l'objet
 * tourne, donc systématiquement en réalité augmentée.
 *
 * On reprojette donc les deux dans le repère du groupe racine.
 */
export function ModeleEditable({ url, echelle, onMesure, onPiquer, children }: Props) {
  const racine = useRef<Group>(null)

  const surClic = useCallback(
    (evenement: ThreeEvent<MouseEvent>) => {
      if (!racine.current || !evenement.face) return

      evenement.stopPropagation()

      inverse.copy(racine.current.matrixWorld).invert()

      // Point d'impact : monde → local du modèle
      const position = evenement.point.clone().applyMatrix4(inverse)

      // Normale : local du maillage → monde → local du modèle
      const normale = evenement.face.normal
        .clone()
        .transformDirection(evenement.object.matrixWorld)
        .transformDirection(inverse)
        .normalize()

      const arrondir = (v: Vector3): Triplet => [
        Number(v.x.toFixed(4)),
        Number(v.y.toFixed(4)),
        Number(v.z.toFixed(4)),
      ]

      onPiquer(arrondir(position), arrondir(normale), evenement.object.name || 'pièce sans nom')
    },
    [onPiquer]
  )

  return (
    <group ref={racine} scale={echelle} onClick={surClic}>
      <ModeleObjet url={url} echelle={echelle} onMesure={onMesure} />
      {children}
    </group>
  )
}
