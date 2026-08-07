import { BufferGeometry, Mesh, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MeshBVH } from 'three-mesh-bvh'
import { HAUTEUR_OEIL } from './dimensions'

/**
 * Étape 4.1 — Construction du BVH de collision. **Décision D3.**
 *
 * Le BVH est bâti sur le **mesh de collision dédié**, jamais sur la géométrie
 * visible. C'est la décision qui rend la chose tenable : la salle finale du
 * Lot 1 comptera 150 000 triangles avec des chanfreins, des tuyaux et des
 * poignées ; le mesh de collision en compte 180, tous des boîtes. Tester une
 * capsule contre la géométrie visible coûterait cent fois plus cher pour un
 * résultat *pire* — un personnage qui accroche sur chaque détail.
 *
 * On instancie `MeshBVH` directement plutôt que d'installer `computeBoundsTree`
 * sur le prototype de `BufferGeometry`. Le résultat est identique, mais sans
 * modifier une classe de Three.js pour toute l'application : le BVH appartient
 * à ce module, et une bibliothèque tierce ne peut pas tomber dessus par hasard.
 */

/** Rayon de la capsule du joueur, en mètres. */
export const RAYON_JOUEUR = 0.35

/** Hauteur totale de la capsule. Légèrement au-dessus de la hauteur d'œil. */
export const HAUTEUR_JOUEUR = 1.7

/** Longueur du segment central de la capsule (hors calottes). */
export const LONGUEUR_SEGMENT = HAUTEUR_JOUEUR - 2 * RAYON_JOUEUR

/**
 * Hauteur du haut de la capsule au-dessus des pieds.
 *
 * La position du joueur est le CENTRE DE LA CALOTTE HAUTE — c'est la convention
 * de `three-mesh-bvh`, et la garder évite de traduire dans tous les sens.
 */
export const HAUT_DEPUIS_PIEDS = LONGUEUR_SEGMENT + RAYON_JOUEUR

/**
 * Décalage entre la position du joueur et l'œil.
 *
 * Les repères `SPAWN` et `POI_xx` sont posés AU SOL sous Blender. Toute la
 * conversion sol → capsule → œil est concentrée ici, une fois.
 */
export const DECALAGE_CAMERA = HAUTEUR_OEIL - HAUT_DEPUIS_PIEDS

export interface Collider {
  bvh: MeshBVH
  geometrie: BufferGeometry
  triangles: number
}

/**
 * Fusionne toute la géométrie du `.glb` de collision en un seul maillage, dans
 * l'espace monde, et en construit le BVH.
 *
 * Deux précautions :
 *
 * 1. **Les transformations sont cuites** dans les sommets. Le BVH ne connaît
 *    pas la hiérarchie de la scène : un mur positionné par son nœud parent
 *    serait testé à l'origine du monde.
 *
 * 2. **Seule la position est conservée.** Normales, UV et couleurs ne servent
 *    à rien à la collision, et `mergeGeometries` refuse de fusionner des
 *    géométries dont les jeux d'attributs diffèrent — ce qui arrive dès que
 *    deux exports Blender ne sont pas rigoureusement identiques.
 */
export function construireCollider(racine: Object3D): Collider {
  racine.updateWorldMatrix(true, true)

  const geometries: BufferGeometry[] = []

  racine.traverse((objet) => {
    if (!(objet instanceof Mesh)) return

    const geometrie = objet.geometry.clone().applyMatrix4(objet.matrixWorld)

    for (const nom of Object.keys(geometrie.attributes)) {
      if (nom !== 'position') geometrie.deleteAttribute(nom)
    }

    geometrie.morphAttributes = {}

    // Dé-indexation : `mergeGeometries` exige que toutes les géométries soient
    // indexées ou aucune. Sur un mesh de collision — quelques centaines de
    // triangles — le surcoût en sommets est sans conséquence.
    geometries.push(geometrie.index ? geometrie.toNonIndexed() : geometrie)
  })

  if (geometries.length === 0) {
    throw new Error('Le fichier de collision ne contient aucune géométrie.')
  }

  const fusionnee = mergeGeometries(geometries, false)

  if (!fusionnee) {
    throw new Error('Fusion de la géométrie de collision impossible.')
  }

  const position = fusionnee.getAttribute('position')

  return {
    bvh: new MeshBVH(fusionnee),
    geometrie: fusionnee,
    triangles: position.count / 3,
  }
}
