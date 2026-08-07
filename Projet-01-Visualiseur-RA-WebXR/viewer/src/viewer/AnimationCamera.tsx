import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  cible: Vector3 | null
  rayon: number
}

const REACTIVITE = 0.09
const SEUIL_ARRET = 0.004

/**
 * Étape 4.5 — Déplacement de la caméra vers l'annotation ouverte.
 *
 * La caméra conserve sa DIRECTION actuelle et se contente de se recentrer :
 * l'utilisateur garde ainsi son repère spatial, au lieu d'être téléporté sur
 * un point de vue imposé.
 *
 * `prefers-reduced-motion` supprime l'interpolation : le déplacement de caméra
 * est un déclencheur classique de malaise vestibulaire.
 */
export function AnimationCamera({ cible, rayon }: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const pose = useRef<{ position: Vector3; regard: Vector3 } | null>(null)

  useEffect(() => {
    if (!cible || !controls) {
      pose.current = null
      return
    }

    const direction = camera.position.clone().sub(controls.target)
    const distance = Math.max(rayon * 1.5, 0.3)

    if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1)

    const position = cible.clone().add(direction.normalize().multiplyScalar(distance))

    const mouvementReduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (mouvementReduit) {
      camera.position.copy(position)
      controls.target.copy(cible)
      controls.update()
      return
    }

    pose.current = { position, regard: cible.clone() }
  }, [cible, controls, camera, rayon])

  useFrame(() => {
    if (!pose.current || !controls) return

    camera.position.lerp(pose.current.position, REACTIVITE)
    controls.target.lerp(pose.current.regard, REACTIVITE)
    controls.update()

    if (camera.position.distanceTo(pose.current.position) < SEUIL_ARRET) {
      pose.current = null
    }
  })

  return null
}
