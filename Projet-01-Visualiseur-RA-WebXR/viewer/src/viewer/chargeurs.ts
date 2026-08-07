import type { WebGLRenderer } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * Étape 3.2 — Décodeurs de compression.
 *
 * Les fichiers de décodage sont servis depuis /public, PAS depuis un CDN :
 * une démonstration ne doit pas dépendre de gstatic.com pour afficher un
 * modèle, et une politique de sécurité de contenu stricte (étape 10.2)
 * bloquerait de toute façon l'appel externe.
 *
 * Fichiers copiés depuis node_modules/three par `npm run decodeurs:copier`.
 */
export function configurerChargeurGltf(loader: GLTFLoader, gl: WebGLRenderer): void {
  // ⚠️ Chemins relatifs à la BASE de déploiement, jamais à la racine du
  // domaine : servi sous /viewer/, un chemin absolu « /draco/ » pointerait
  // en dehors de l'application et le décodage échouerait sans message.
  const racine = import.meta.env.BASE_URL

  // Géométrie compressée (Draco)
  const draco = new DRACOLoader().setDecoderPath(`${racine}draco/`)
  loader.setDRACOLoader(draco)

  // Textures compressées (KTX2 / Basis). detectSupport interroge le GPU
  // pour choisir le format transcodé : sans lui, le décodage échoue.
  const ktx2 = new KTX2Loader().setTranscoderPath(`${racine}basis/`).detectSupport(gl)
  loader.setKTX2Loader(ktx2)

  // Géométrie compressée (Meshopt) — décodeur embarqué dans le bundle
  loader.setMeshoptDecoder(MeshoptDecoder)
}
