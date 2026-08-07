import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { FrontSide, Ray, Vector3 } from 'three'
import type { MeshBVH } from 'three-mesh-bvh'
import { useInteraction } from '../etat/interaction'
import { horsChamp } from './boussole'
import type { PointResolu } from './reperes'

interface Props {
  bvh: MeshBVH
  points: PointResolu[]
  actif: boolean
}

/** Angle maximal entre l'axe de visée et le poste, en radians (~9°). */
const CONE_VISEE = 0.16

/** Portée du réticule, en mètres. */
const PORTEE_VISEE = 6

const versPoste = new Vector3()
const rayon = new Ray()
const projection = new Vector3()

/**
 * Étapes 5.1, 5.4 et 5.5 — Visée, proximité et boussole.
 *
 * ## Visée (5.1)
 *
 * Plutôt que de lancer un rayon sur des maillages de collision invisibles
 * ajoutés autour de chaque poste, on compare l'**angle** entre l'axe de la
 * caméra et la direction de chaque poste. C'est plus simple, plus stable — un
 * poste reste visable même si sa pastille est en partie masquée — et cela évite
 * d'introduire une géométrie fantôme dans la scène.
 *
 * ## Occlusion
 *
 * L'angle seul permettrait de viser à travers un mur. On lance donc un rayon
 * dans le **BVH de collision déjà construit pour le Lot 4** : si quelque chose
 * se trouve entre l'œil et le poste, le poste n'est pas visable. Aucune
 * structure supplémentaire, aucun coût de construction.
 *
 * ## Priorité
 *
 * La **proximité l'emporte sur la visée**. Un apprenant planté devant l'armoire
 * à EPI mais qui regarde ailleurs doit voir l'armoire proposée : c'est là qu'il
 * est, et c'est ce qu'il vient faire.
 */
export default function Viseur({ bvh, points, actif }: Props) {
  const camera = useThree((etat) => etat.camera)
  const viser = useInteraction((etat) => etat.viser)
  const accumulateur = useRef(0)

  useFrame((_, delta) => {
    // Une activité est ouverte : plus rien n'est visé (étape 5.7).
    if (!actif) {
      viser(null, null)
      return
    }

    // 20 Hz suffit largement : la visée n'a pas besoin d'être recalculée à
    // chaque image, et l'occlusion coûte un lancer de rayon par poste.
    accumulateur.current += delta
    if (accumulateur.current < 0.05) return
    accumulateur.current = 0

    const oeil = camera.position
    const regard = camera.getWorldDirection(projection).clone()

    let viseCode: string | null = null
    let meilleurAngle = CONE_VISEE
    let procheCode: string | null = null
    let meilleureDistance = Infinity

    horsChamp.length = 0

    for (const poste of points) {
      versPoste.subVectors(poste.position3d, oeil)
      const distance = versPoste.length()

      versPoste.normalize()
      const angle = Math.acos(Math.min(1, Math.max(-1, versPoste.dot(regard))))

      const degage = distance < 0.6 || !occulte(bvh, oeil, versPoste, distance)

      // 5.4 — déclenchement par proximité, avec le rayon déclaré par l'API.
      if (poste.trigger.type === 'proximity' && poste.trigger.radius) {
        const auSol = Math.hypot(poste.position3d.x - oeil.x, poste.position3d.z - oeil.z)

        if (auSol <= poste.trigger.radius && auSol < meilleureDistance) {
          meilleureDistance = auSol
          procheCode = poste.code
        }
      }

      // 5.1 — visée au réticule.
      if (degage && distance <= PORTEE_VISEE && angle < meilleurAngle) {
        meilleurAngle = angle
        viseCode = poste.code
      }

      // 5.5 — le poste est-il hors du champ de vision ?
      projection.copy(poste.position3d).project(camera)

      const devant = projection.z < 1
      const dansLeCadre = devant && Math.abs(projection.x) < 0.92 && Math.abs(projection.y) < 0.92

      if (!dansLeCadre) {
        horsChamp.push({
          code: poste.code,
          // Angle écran depuis le centre. Pour un poste derrière soi, la
          // projection s'inverse : on la retourne pour que la flèche pointe
          // du bon côté au lieu d'indiquer l'exact opposé.
          angle: Math.atan2(
            devant ? -projection.y : projection.y,
            devant ? projection.x : -projection.x
          ),
          distance,
        })
      }
    }

    if (procheCode) viser(procheCode, 'proximite')
    else viser(viseCode, viseCode ? 'visee' : null)
  })

  return null
}

/** Y a-t-il de la géométrie entre l'œil et le poste ? */
function occulte(bvh: MeshBVH, oeil: Vector3, direction: Vector3, distance: number): boolean {
  rayon.origin.copy(oeil)
  rayon.direction.copy(direction)

  // Marge de 0,25 m : les pastilles sont posées sur les meubles qu'elles
  // désignent. Sans elle, chaque poste s'occulterait lui-même.
  const impact = bvh.raycastFirst(rayon, FrontSide, 0.05, distance - 0.25)

  return impact !== null
}
