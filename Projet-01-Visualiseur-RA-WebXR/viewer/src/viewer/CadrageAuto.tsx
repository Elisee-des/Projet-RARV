import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Mesure } from './ModeleObjet'

type Props = {
  mesure: Mesure | null
  /** Rempli par ce composant : permet à la barre d'outils de recadrer. */
  actionReinitialiser: RefObject<(() => void) | null>
}

/**
 * Étapes 3.5 et 3.6 — Cadrage automatique et bornes des contrôles.
 *
 * Le cadrage est calculé à partir de la sphère englobante du modèle, jamais
 * de valeurs codées en dur : le viewer doit fonctionner aussi bien avec la
 * pompe de 1,5 m qu'avec le vrai modèle du Lot 1, sans réglage manuel.
 */
export function CadrageAuto({ mesure, actionReinitialiser }: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  useEffect(() => {
    if (!mesure || !controls || !(camera instanceof PerspectiveCamera)) return

    const { centre, rayon } = mesure

    // Distance permettant d'inscrire la sphère englobante dans le champ de
    // vision, avec 25 % de marge.
    const fovRad = (camera.fov * Math.PI) / 180
    const distance = (rayon / Math.sin(fovRad / 2)) * 1.25

    const pose = new Vector3(
      centre.x + distance * 0.55,
      centre.y + distance * 0.38,
      centre.z + distance * 0.74
    )

    const cadrer = () => {
      camera.position.copy(pose)
      camera.near = Math.max(distance - rayon * 4, 0.01)
      camera.far = distance + rayon * 20
      camera.updateProjectionMatrix()

      controls.target.copy(centre)
      controls.update()
    }

    // Bornes : empêche de coller au modèle, de s'en éloigner à l'infini
    // et de passer sous le plan du sol (étape 3.5).
    controls.minDistance = rayon * 0.9
    controls.maxDistance = rayon * 8
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minPolarAngle = 0.05

    cadrer()
    actionReinitialiser.current = cadrer

    return () => {
      actionReinitialiser.current = null
    }
  }, [mesure, controls, camera, actionReinitialiser])

  return null
}
