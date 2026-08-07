import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import type { Annotation, Triplet } from '../api/types'

type Props = {
  annotation: Annotation
  actif: boolean
  visite: boolean
  /** Décollement de la surface, en unités locales du modèle. */
  decalage?: number
  onOuvrir: (annotation: Annotation) => void
}

/**
 * Position décollée de la surface, le long de la normale.
 *
 * ⚠️ Sans ce décalage, la pastille SE MASQUE ELLE-MÊME : elle est posée
 * exactement sur la géométrie, et le rayon d'occlusion touche cette même
 * surface au point visé. Une pastille placée au sommet de l'objet — donc
 * jamais cachée par quoi que ce soit — disparaissait ainsi selon l'angle
 * de vue.
 *
 * C'est à cela que sert la normale relevée au raycast de l'étape 8.4.
 */
export function positionDecollee(annotation: Annotation, decalage: number): Triplet {
  const [x, y, z] = annotation.position
  const normale = annotation.normal

  if (!normale || decalage <= 0) return annotation.position

  return [
    x + normale[0] * decalage,
    y + normale[1] * decalage,
    z + normale[2] * decalage,
  ]
}

/**
 * Étapes 4.1 → 4.3 — Pastille d'annotation.
 *
 * Positionnée en coordonnées LOCALES du modèle, à l'intérieur du même groupe
 * que lui : elle suit donc ses rotations et son échelle.
 *
 * `occlude` masque la pastille quand une pièce du modèle passe devant. Sans
 * cela, les annotations de la face arrière flottent devant l'objet et le
 * repère spatial s'effondre.
 */
export function AnnotationPin({ annotation, actif, visite, decalage = 0, onOuvrir }: Props) {
  const position = useMemo(
    () => positionDecollee(annotation, decalage),
    [annotation, decalage]
  )

  const classes = [
    'pastille',
    visite && 'pastille--visitee',
    actif && 'pastille--active',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <group position={position}>
      <Html center occlude zIndexRange={[24, 0]}>
        <button
          type="button"
          className={classes}
          onClick={() => onOuvrir(annotation)}
          aria-label={`Annotation ${annotation.order} sur ${annotation.label}${visite ? ' (déjà consultée)' : ''}`}
          aria-pressed={actif}
          data-annotation={annotation.id}
        >
          <span aria-hidden="true">{annotation.order}</span>
        </button>
      </Html>
    </group>
  )
}
