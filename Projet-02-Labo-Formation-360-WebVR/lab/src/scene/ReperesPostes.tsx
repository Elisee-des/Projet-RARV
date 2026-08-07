import { Fragment } from 'react'
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
 * Balises provisoires marquant les 8 postes.
 *
 * ⚠️ Ce n'est pas le système d'interaction — c'est le **contrôle visuel de
 * l'étape 3.5**. Il rend visible, dans la salle, que chaque poste a bien été
 * placé à partir de son Empty nommé et non d'une coordonnée écrite quelque part.
 * Le Lot 5 le remplace par la surbrillance au survol, l'étiquette contextuelle
 * et les indicateurs hors champ.
 *
 * Les postes à déclenchement par proximité affichent en plus leur rayon au sol :
 * on voit immédiatement si deux zones se chevauchent, ce qui rendrait le
 * déclenchement imprévisible.
 */
export default function ReperesPostes({ points }: Props) {
  return (
    <group name="reperes-postes-provisoires">
      {points.map((poste) => {
        const couleur = COULEURS[poste.activity.type] ?? '#94a3b8'
        const { x, y, z } = poste.position3d

        return (
          <Fragment key={poste.code}>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[0.12, 16, 12]} />
              <meshStandardMaterial
                color={couleur}
                emissive={couleur}
                emissiveIntensity={0.9}
                roughness={0.4}
              />
            </mesh>

            {/* Colonne lumineuse : repérable de l'autre bout de la salle */}
            <mesh position={[x, y / 2, z]}>
              <cylinderGeometry args={[0.02, 0.02, Math.max(0.1, y), 8]} />
              <meshStandardMaterial
                color={couleur}
                emissive={couleur}
                emissiveIntensity={0.5}
                transparent
                opacity={poste.required ? 0.55 : 0.28}
              />
            </mesh>

            {poste.trigger.type === 'proximity' && poste.trigger.radius && (
              <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[poste.trigger.radius - 0.04, poste.trigger.radius, 48]} />
                <meshBasicMaterial color={couleur} transparent opacity={0.5} />
              </mesh>
            )}
          </Fragment>
        )
      })}
    </group>
  )
}
