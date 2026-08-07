import { useEffect, useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { MeshBVH } from 'three-mesh-bvh'
import { configurerChargeurGltf } from './chargeurs'
import { construireCollider } from './collision'

interface Props {
  url: string
  onPret: (bvh: MeshBVH, triangles: number) => void
}

/**
 * Étape 4.1 — Chargement du mesh de collision et construction du BVH.
 *
 * Le `.glb` de collision est chargé **en parallèle** de la scène visible, dans
 * le même `<Suspense>` : les deux téléchargements se recouvrent, et la barre de
 * progression de l'étape 3.3 les compte tous les deux.
 *
 * Rien de ce fichier n'est rendu. Sa géométrie ne sert qu'au BVH, et le
 * composant ne renvoie aucun élément de scène : afficher des boîtes de
 * collision par-dessus la salle serait au mieux inutile, au pire trompeur.
 */
export default function Collider({ url, onPret }: Props) {
  const gl = useThree((etat) => etat.gl)

  const gltf = useLoader(GLTFLoader, url, (loader) =>
    configurerChargeurGltf(loader as GLTFLoader, gl)
  )

  const collider = useMemo(() => construireCollider(gltf.scene), [gltf])

  useEffect(() => {
    onPret(collider.bvh, collider.triangles)
  }, [collider, onPret])

  return null
}
