import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Group, MathUtils, type Mesh, type Sprite } from 'three'
import { etatDuPoste, useInteraction } from '../etat/interaction'
import { pastille } from './pastilleTexture'
import type { PointResolu } from './reperes'

interface Props {
  points: PointResolu[]
}

/** Une couleur par type d'activité, cohérente avec le plan de l'étape 0.3. */
const COULEURS: Record<string, string> = {
  panel: '#2563eb',
  video: '#7c3aed',
  document: '#b45309',
  quiz: '#15803d',
}

/**
 * Étapes 5.2, 5.5 et 5.6 — Représentation des 8 postes.
 *
 * ## États (5.6)
 *
 * | État | Rendu |
 * |---|---|
 * | non visité | pastille creuse, numéro visible |
 * | visité | pastille creuse, halo atténué |
 * | terminé | pastille pleine, coche, halo éteint |
 *
 * Les postes **facultatifs** ont un contour pointillé. La différence se lit
 * sans légende, ce qui compte : personne ne lit les légendes.
 *
 * ## Surbrillance (5.2)
 *
 * Le poste visé grossit et son halo s'intensifie, par interpolation. Un
 * changement instantané se lit comme un clignotement ; une transition de
 * 150 ms se lit comme une réponse.
 *
 * ## Repères à distance (5.5)
 *
 * La pastille est un **sprite** : elle fait toujours face à la caméra et
 * conserve une taille lisible quelle que soit la distance. Le halo au sol, lui,
 * marque l'emprise réelle du déclenchement par proximité — on voit tout de
 * suite si deux zones se chevauchent.
 */
export default function Postes({ points }: Props) {
  const vise = useInteraction((etat) => etat.vise)
  const visites = useInteraction((etat) => etat.visites)
  const termines = useInteraction((etat) => etat.termines)

  return (
    <group name="postes">
      {points.map((poste, index) => (
        <Poste
          key={poste.code}
          poste={poste}
          numero={index + 1}
          etat={etatDuPoste(poste.code, visites, termines)}
          vise={vise === poste.code}
        />
      ))}
    </group>
  )
}

function Poste({
  poste,
  numero,
  etat,
  vise,
}: {
  poste: PointResolu
  numero: number
  etat: 'neuf' | 'visite' | 'termine'
  vise: boolean
}) {
  const groupe = useRef<Group>(null)
  const sprite = useRef<Sprite>(null)
  const halo = useRef<Mesh>(null)
  const anneau = useRef<Mesh>(null)

  const couleur = COULEURS[poste.activity.type] ?? '#94a3b8'
  const termine = etat === 'termine'
  const { x, y, z } = poste.position3d

  const texture = pastille({ numero, couleur, termine, requis: poste.required })

  useFrame((horloge) => {
    const t = horloge.clock.elapsedTime

    // 5.2 — surbrillance interpolée plutôt qu'instantanée.
    const echelleVisee = vise ? 1.35 : 1
    if (sprite.current) {
      const actuelle = sprite.current.scale.x
      const cible = 0.42 * echelleVisee
      const lissee = MathUtils.lerp(actuelle, cible, 0.18)
      sprite.current.scale.setScalar(lissee)
    }

    // Respiration lente du halo, éteinte une fois le poste terminé : ce qui
    // reste à faire attire l'œil, ce qui est fait s'efface.
    if (halo.current) {
      const materiau = halo.current.material as { opacity: number }
      const base = termine ? 0.06 : etat === 'visite' ? 0.18 : 0.3
      const pulsation = termine ? 0 : 0.08 * (0.5 + 0.5 * Math.sin(t * 1.6 + numero))
      materiau.opacity = MathUtils.lerp(materiau.opacity, base + pulsation + (vise ? 0.25 : 0), 0.15)
    }

    if (anneau.current) {
      anneau.current.rotation.z = t * 0.25
    }

    if (groupe.current) {
      // Léger flottement — 3 cm d'amplitude. Assez pour attirer l'œil dans une
      // pièce statique, trop peu pour donner l'impression que ça bouge.
      groupe.current.position.y = y + Math.sin(t * 1.1 + numero) * 0.03
    }
  })

  return (
    <group>
      <group ref={groupe} position={[x, y, z]}>
        <sprite ref={sprite} scale={0.42}>
          {/*
            `depthTest` actif, `depthWrite` inactif — le couple habituel des
            sprites transparents.

            La tentation est de désactiver le test de profondeur pour que les
            pastilles se voient à travers les murs, en guise de balisage. On s'en
            abstient : le Viseur, lui, refuse d'interagir avec un poste occulté.
            Une pastille visible mais inactivable est exactement le genre
            d'incohérence qui fait croire à une panne.
          */}
          <spriteMaterial map={texture} transparent depthWrite={false} sizeAttenuation />
        </sprite>

        <mesh ref={halo}>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshBasicMaterial
            color={couleur}
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 5.4 / 5.5 — emprise du déclenchement par proximité, au sol */}
      {poste.trigger.type === 'proximity' && poste.trigger.radius && (
        <mesh ref={anneau} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[poste.trigger.radius - 0.06, poste.trigger.radius, 64]} />
          <meshBasicMaterial
            color={couleur}
            transparent
            opacity={termine ? 0.18 : vise ? 0.75 : 0.42}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Colonne lumineuse : repérable de l'autre bout de la salle */}
      <mesh position={[x, y / 2, z]}>
        <cylinderGeometry args={[0.016, 0.016, Math.max(0.1, y), 8]} />
        <meshBasicMaterial
          color={couleur}
          transparent
          opacity={termine ? 0.12 : poste.required ? 0.4 : 0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
