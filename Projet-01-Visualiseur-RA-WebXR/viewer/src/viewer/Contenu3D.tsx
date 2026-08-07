import { Suspense } from 'react'
import type { Annotation, ObjetPedagogique } from '../api/types'
import { AnnotationPin } from './AnnotationPin'
import { AnnotationPin3D } from './AnnotationPin3D'
import { ModeleObjet, type Mesure } from './ModeleObjet'

type Props = {
  objet: ObjetPedagogique
  mesure: Mesure | null
  selection: Annotation | null
  visitees: ReadonlySet<number>
  onMesure: (mesure: Mesure) => void
  onOuvrir: (annotation: Annotation) => void
  /** En RA, les pastilles doivent être 3D : `<Html>` ne s'affiche pas
   *  dans la composition WebXR en mode dom-overlay. */
  pastilles3D?: boolean
}

/**
 * Modèle et pastilles réunis dans un seul groupe, partagé entre le mode
 * navigateur et le mode réalité augmentée. Toute transformation appliquée à
 * ce groupe s'applique donc identiquement à l'objet et à ses annotations.
 */
export function Contenu3D({
  objet,
  mesure,
  selection,
  visitees,
  onMesure,
  onOuvrir,
  pastilles3D = false,
}: Props) {
  const echelle = objet.placement.scale

  // Rayon de pastille proportionnel à l'objet : lisible sur une pompe de
  // 1,5 m comme sur une pièce de 20 cm.
  const rayonLocal = mesure ? Math.max(mesure.rayon / echelle, 0.01) : 0.6
  const rayonPastille = rayonLocal * 0.075

  /*
   * Décollement des pastilles, le long de leur normale.
   *
   * Les positions relevées au raycast sont EXACTEMENT sur la surface. Le
   * rayon d'occlusion touche donc cette même surface au point visé, et la
   * pastille se masque elle-même — y compris au sommet de l'objet, là où
   * rien ne peut la cacher.
   *
   * Proportionnel au modèle : une valeur fixe en mètres serait invisible sur
   * un équipement de trois mètres et grotesque sur une pièce de vingt
   * centimètres.
   */
  const decalage = rayonLocal * 0.06

  return (
    <group scale={echelle}>
      <Suspense fallback={null}>
        <ModeleObjet url={objet.assets.glb} echelle={echelle} onMesure={onMesure} />
      </Suspense>

      {mesure &&
        objet.annotations.map((annotation) =>
          pastilles3D ? (
            <AnnotationPin3D
              key={annotation.id}
              annotation={annotation}
              rayon={rayonPastille}
              decalage={decalage}
              actif={selection?.id === annotation.id}
              visite={visitees.has(annotation.id)}
              onOuvrir={onOuvrir}
            />
          ) : (
            <AnnotationPin
              key={annotation.id}
              annotation={annotation}
              decalage={decalage}
              actif={selection?.id === annotation.id}
              visite={visitees.has(annotation.id)}
              onOuvrir={onOuvrir}
            />
          )
        )}
    </group>
  )
}
