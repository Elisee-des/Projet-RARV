import type { WebGLRenderer } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * Étape 3.2 — Décodeurs de compression.
 *
 * Les fichiers de décodage sont servis depuis /public, PAS depuis un CDN : une
 * démonstration ne doit pas dépendre de gstatic.com pour afficher une salle, et
 * la politique de sécurité de contenu de l'étape 11.2 bloquerait de toute façon
 * l'appel externe.
 *
 * Fichiers copiés depuis node_modules/three par `npm run decodeurs:copier`,
 * exécuté automatiquement avant `dev` et `build`.
 *
 * Le blocking du Lot 1 n'est pas encore compressé, mais les décodeurs sont
 * configurés dès maintenant : c'est `gltf-transform optimize` de l'étape 1.8
 * qui produira du Draco et du KTX2, et le chargeur doit déjà savoir les lire.
 */
export function configurerChargeurGltf(loader: GLTFLoader, gl: WebGLRenderer): void {
  // ⚠️ Relatif à la BASE de déploiement, jamais à la racine du domaine :
  // servi sous /labo/, un chemin absolu « /draco/ » pointerait en dehors de
  // l'application et le décodage échouerait sans message.
  const racine = import.meta.env.BASE_URL

  const draco = new DRACOLoader().setDecoderPath(`${racine}draco/`)
  loader.setDRACOLoader(draco)

  // detectSupport interroge le GPU pour choisir le format transcodé.
  // Sans cet appel, le décodage KTX2 échoue silencieusement.
  const ktx2 = new KTX2Loader().setTranscoderPath(`${racine}basis/`).detectSupport(gl)
  loader.setKTX2Loader(ktx2)

  loader.setMeshoptDecoder(MeshoptDecoder)
}
