import { Html } from '@react-three/drei'
import type { Annotation } from '../api/types'

type Props = {
  annotation: Annotation
  actif: boolean
  visite: boolean
  onOuvrir: (annotation: Annotation) => void
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
export function AnnotationPin({ annotation, actif, visite, onOuvrir }: Props) {
  const classes = [
    'pastille',
    visite && 'pastille--visitee',
    actif && 'pastille--active',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <group position={annotation.position}>
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
