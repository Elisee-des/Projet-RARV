import { Euler, Object3D, Quaternion, Vector3 } from 'three'
import type { Environnement, PointInteraction } from '../api/types'

/**
 * Étape 3.5 — Lecture des repères nommés exportés dans le `.glb`.
 *
 * ⭐ C'est la pièce qui désamorce le piège n°1 du projet.
 *
 * La salle sera itérée des dizaines de fois au Lot 1 : on déplace un établi,
 * on élargit une allée, on tourne un poste. Si les 8 points d'interaction
 * vivaient sous forme de coordonnées — dans le code ou en base — chaque
 * itération obligerait à les repositionner à la main, et ils dériveraient
 * silencieusement dès la première fois qu'on oublie.
 *
 * Ici, la géométrie porte ses propres repères : des Empty nommés `SPAWN` et
 * `POI_01`…`POI_08`. Déplacer un poste sous Blender déplace son point
 * d'interaction, sans toucher à une ligne de code.
 *
 * Les valeurs de la base ne servent que de repli, pour le cas où le `.glb`
 * n'aurait pas encore été instrumenté.
 */

export interface Repere {
  nom: string
  position: Vector3
  quaternion: Quaternion
  /** Lacet en degrés autour de +Y. 0 = regarde vers −Z (convention Three.js). */
  lacet: number
}

export interface PointResolu extends PointInteraction {
  /** Position finale, du `.glb` en priorité. */
  position3d: Vector3
  /** D'où vient la position — utile au panneau de debug de l'étape 10.2. */
  source: 'glb' | 'base'
}

export interface GrapheScene {
  spawn: { position: Vector3; lacet: number; source: 'glb' | 'base' }
  points: PointResolu[]
  /** Repères présents dans le `.glb` mais qu'aucun poste ne réclame. */
  orphelins: string[]
  /** Postes déclarés par l'API sans repère ni position de repli. */
  introuvables: string[]
}

const RAD_VERS_DEG = 180 / Math.PI

/**
 * Indexe tous les repères nommés d'une scène glTF.
 *
 * Les positions sont relevées en coordonnées MONDE (`getWorldPosition`) et non
 * locales : un Empty parenté à un meuble sous Blender doit donner sa position
 * réelle dans la salle, pas relative à son parent.
 */
export function indexerReperes(racine: Object3D): Map<string, Repere> {
  const index = new Map<string, Repere>()

  // Les transformations monde ne sont pas à jour tant que la scène n'a pas été
  // rendue au moins une fois. On les force ici.
  racine.updateWorldMatrix(true, true)

  racine.traverse((objet) => {
    if (!/^(SPAWN|POI_\d{2})$/.test(objet.name)) return

    const position = objet.getWorldPosition(new Vector3())
    const quaternion = objet.getWorldQuaternion(new Quaternion())
    const euler = new Euler().setFromQuaternion(quaternion, 'YXZ')

    index.set(objet.name, {
      nom: objet.name,
      position,
      quaternion,
      lacet: euler.y * RAD_VERS_DEG,
    })
  })

  return index
}

/**
 * Croise les repères du `.glb` avec les postes déclarés par l'API et construit
 * le graphe exploitable par le reste de l'application.
 */
export function construireGraphe(
  racine: Object3D,
  environnement: Environnement
): GrapheScene {
  const reperes = indexerReperes(racine)
  const reclames = new Set<string>(['SPAWN'])

  // --- Point d'apparition --------------------------------------------
  const repereSpawn = reperes.get('SPAWN')

  const spawn = repereSpawn
    ? { position: repereSpawn.position.clone(), lacet: repereSpawn.lacet, source: 'glb' as const }
    : {
        position: new Vector3(...(environnement.spawn.position ?? [0, 0, 0])),
        lacet: environnement.spawn.rotation,
        source: 'base' as const,
      }

  // --- Postes ---------------------------------------------------------
  const points: PointResolu[] = []
  const introuvables: string[] = []

  for (const poste of environnement.points) {
    reclames.add(poste.code)

    const repere = reperes.get(poste.code)

    if (repere) {
      points.push({ ...poste, position3d: repere.position.clone(), source: 'glb' })
      continue
    }

    if (poste.position) {
      points.push({ ...poste, position3d: new Vector3(...poste.position), source: 'base' })
      continue
    }

    // Ni repère dans le .glb, ni position de repli : le poste est déclaré mais
    // ne peut pas être placé. On le signale plutôt que de l'afficher à
    // l'origine du monde, où il serait incompréhensible.
    introuvables.push(poste.code)
  }

  const orphelins = [...reperes.keys()].filter((nom) => !reclames.has(nom))

  return { spawn, points, orphelins, introuvables }
}

/**
 * Hauteur d'œil appliquée au point d'apparition.
 *
 * Sous Blender, l'Empty `SPAWN` est posé AU SOL — c'est ce qu'on voit et ce
 * qu'on manipule. La caméra, elle, doit être à hauteur d'œil. La conversion se
 * fait ici, une fois, plutôt que d'exiger que le graphiste place son repère à
 * 1,65 m du sol et de le laisser se tromper.
 */
export function positionCamera(spawn: Vector3, hauteurOeil: number): Vector3 {
  return new Vector3(spawn.x, spawn.y + hauteurOeil, spawn.z)
}
