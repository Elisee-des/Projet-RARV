import { useRef } from 'react'
import { useXRHitTest } from '@react-three/xr'
import { Matrix4, type Group } from 'three'

type Props = {
  /** Rempli en continu par le hit-test ; lu au moment du placement. */
  positionDetectee: React.RefObject<Matrix4>
  onDetection: (detecte: boolean) => void
  visible: boolean
}

const matriceAide = new Matrix4()

/**
 * Étape 5.7 — Réticule de placement.
 *
 * Un hit-test continu depuis le point de vue (`viewer`) projette un anneau
 * sur la première surface plane rencontrée. C'est le repère qui dit à
 * l'utilisateur « la RA a compris où est ton sol ».
 *
 * La position est écrite dans une ref et appliquée dans le callback, jamais
 * poussée dans un état React : le hit-test s'exécute à chaque image, et un
 * setState par image effondrerait le framerate.
 */
export function ReticuleRA({ positionDetectee, onDetection, visible }: Props) {
  const groupe = useRef<Group>(null)
  const detecteAvant = useRef(false)

  useXRHitTest(
    (resultats, getWorldMatrix) => {
      const detecte = resultats.length > 0

      if (detecte) {
        getWorldMatrix(matriceAide, resultats[0])
        positionDetectee.current.copy(matriceAide)

        if (groupe.current) {
          groupe.current.position.setFromMatrixPosition(matriceAide)
          groupe.current.visible = visible
        }
      } else if (groupe.current) {
        groupe.current.visible = false
      }

      // Notifie uniquement les changements d'état, pas chaque image.
      if (detecte !== detecteAvant.current) {
        detecteAvant.current = detecte
        onDetection(detecte)
      }
    },
    'viewer',
    'plane'
  )

  return (
    <group ref={groupe} visible={false}>
      {/* Couché à plat sur la surface détectée */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.09, 0.11, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.085, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.18} toneMapped={false} />
      </mesh>
    </group>
  )
}
