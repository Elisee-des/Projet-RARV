import { useEffect, useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { Box3, Mesh, Sphere, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { configurerChargeurGltf } from './chargeurs'

export type Mesure = {
  centre: Vector3
  rayon: number
  hauteur: number
}

type Props = {
  url: string
  echelle: number
  onMesure: (mesure: Mesure) => void
}

/**
 * Étape 3.2 — Chargement du modèle 3D.
 *
 * Suspend le rendu pendant le téléchargement : c'est <Suspense> en amont
 * qui affiche l'écran de progression.
 */
export function ModeleObjet({ url, echelle, onMesure }: Props) {
  const gl = useThree((s) => s.gl)

  const gltf = useLoader(GLTFLoader, url, (loader) => {
    configurerChargeurGltf(loader as GLTFLoader, gl)
  })

  // Cloner : useLoader met le résultat en cache, et deux montages du même
  // modèle partageraient sinon le même graphe de scène.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])

  useEffect(() => {
    scene.traverse((objet) => {
      if (objet instanceof Mesh) {
        objet.castShadow = true
        objet.receiveShadow = true
      }
    })

    // Étape 3.6 — mesures servant au cadrage automatique de la caméra.
    const boite = new Box3().setFromObject(scene)
    const sphere = boite.getBoundingSphere(new Sphere())
    const taille = boite.getSize(new Vector3())

    onMesure({
      centre: sphere.center.clone().multiplyScalar(echelle),
      rayon: Math.max(sphere.radius * echelle, 0.01),
      hauteur: taille.y * echelle,
    })
  }, [scene, echelle, onMesure])

  // L'échelle est portée par le groupe parent, pas ici : les pastilles
  // d'annotation doivent subir exactement les mêmes transformations que le
  // modèle, sans quoi elles se décrochent dès qu'il tourne (Lot 5, RA).
  return <primitive object={scene} />
}
