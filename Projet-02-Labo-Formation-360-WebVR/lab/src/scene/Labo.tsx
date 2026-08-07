import { useEffect, useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { configurerChargeurGltf } from './chargeurs'
import { appliquerLightmap, preparerMateriaux } from './lightmaps'
import { construireGraphe, type GrapheScene } from './reperes'
import type { Environnement } from '../api/types'

interface Props {
  environnement: Environnement
  urlScene: string
  onGraphePret: (graphe: GrapheScene, diagnostic: Diagnostic) => void
}

export interface Diagnostic {
  maillages: number
  avecUv1: number
  lightmapsAppliquees: number
  reperesGlb: number
  orphelins: string[]
  introuvables: string[]
}

/**
 * Étapes 3.2, 3.4 et 3.5 — Chargement de la salle.
 *
 * Le composant est suspendu par `useLoader` pendant le téléchargement :
 * l'écran de chargement de l'étape 3.3 est affiché par le `<Suspense>` parent,
 * avec la progression réelle.
 */
export default function Labo({ environnement, urlScene, onGraphePret }: Props) {
  const gl = useThree((etat) => etat.gl)

  const gltf = useLoader(GLTFLoader, urlScene, (loader) =>
    configurerChargeurGltf(loader as GLTFLoader, gl)
  )

  // Préparation des matériaux dès que la scène est là, avant le premier rendu :
  // corriger l'espace colorimétrique après coup provoquerait un flash.
  const { scene, statsMateriaux } = useMemo(() => {
    const racine = gltf.scene
    return { scene: racine, statsMateriaux: preparerMateriaux(racine) }
  }, [gltf])

  useEffect(() => {
    let annule = false

    const finaliser = async () => {
      // Étape 3.4 — lightmaps. Le blocking du Lot 1 n'en a pas encore ;
      // l'appel est en place pour que le branchement soit prêt le jour où
      // le baking produit ses textures.
      let eclaires = 0

      for (const url of environnement.assets.lightmaps) {
        try {
          eclaires += await appliquerLightmap(scene, url)
        } catch (erreur) {
          // Une lightmap manquante dégrade le rendu, elle ne doit pas empêcher
          // d'entrer dans la salle.
          console.warn('Lightmap ignorée :', url, erreur)
        }
      }

      if (annule) return

      const graphe = construireGraphe(scene, environnement)

      onGraphePret(graphe, {
        maillages: statsMateriaux.maillages,
        avecUv1: statsMateriaux.avecUv1,
        lightmapsAppliquees: eclaires,
        reperesGlb: graphe.points.filter((p) => p.source === 'glb').length,
        orphelins: graphe.orphelins,
        introuvables: graphe.introuvables,
      })
    }

    void finaliser()

    return () => {
      annule = true
    }
  }, [environnement, onGraphePret, scene, statsMateriaux])

  return (
    <>
      {/*
        Éclairage minimal — décision D4. La scène de production est éclairée par
        ses lightmaps précalculées ; ce qui suit n'existe que pour rendre le
        blocking lisible tant que le baking du Lot 1.7 n'a pas eu lieu, et
        disparaîtra le jour où les lightmaps arriveront.
      */}
      <ambientLight intensity={environnement.assets.lightmaps.length > 0 ? 0.25 : 1.0} />
      <directionalLight position={[6, 9, 4]} intensity={1.2} castShadow={false} />
      <hemisphereLight args={['#cfe3ff', '#2b2f36', 0.6]} />

      <primitive object={scene} />
    </>
  )
}
