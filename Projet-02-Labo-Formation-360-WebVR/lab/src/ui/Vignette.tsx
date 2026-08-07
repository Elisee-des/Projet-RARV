import { useEffect, useRef } from 'react'
import { etatJoueur } from '../scene/etatJoueur'
import { useReglages } from '../etat/reglages'

const VITESSE_MAX = 3.9
const OPACITE_MAX = 0.5

/**
 * Étape 4.7 — Vignettage au déplacement.
 *
 * Assombrir la périphérie pendant qu'on avance réduit nettement le mal des
 * transports : le conflit entre l'oreille interne, qui ne sent aucun mouvement,
 * et la vision périphérique, qui en voit beaucoup, est atténué à la source.
 * C'est la technique standard des jeux en vue subjective, et elle vaut aussi
 * en VR (Lot 8).
 *
 * L'opacité est écrite **directement dans le style du nœud**, sans passer par
 * un état React : elle change à chaque image, et la faire transiter par le
 * rendu React coûterait plus cher que l'effet lui-même.
 */
export default function Vignette() {
  const active = useReglages((etat) => etat.vignette)
  const noeud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return

    let image = 0
    let opacite = 0

    const boucle = () => {
      const rapport = Math.min(1, etatJoueur.vitesse / VITESSE_MAX)
      const visee = rapport * OPACITE_MAX

      // Lissage : une vignette qui apparaît d'un coup à chaque pas serait
      // elle-même une source d'inconfort.
      opacite += (visee - opacite) * 0.12

      if (noeud.current) noeud.current.style.opacity = opacite.toFixed(3)

      image = requestAnimationFrame(boucle)
    }

    image = requestAnimationFrame(boucle)

    return () => cancelAnimationFrame(image)
  }, [active])

  if (!active) return null

  return <div ref={noeud} style={styles.vignette} aria-hidden="true" />
}

const styles: Record<string, React.CSSProperties> = {
  vignette: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0,
    zIndex: 10,
    background:
      'radial-gradient(ellipse at center, transparent 38%, rgb(0 0 0 / 0.55) 78%, rgb(0 0 0 / 0.9) 100%)',
  },
}
