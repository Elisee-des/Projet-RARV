import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export type Qualite = 'reduite' | 'normale'

export interface MesurePerf {
  fps: number
  qualite: Qualite
  drawCalls: number
  triangles: number
  programmes: number
}

interface Props {
  qualite: Qualite
  onMesure: (mesure: MesurePerf) => void
  /** Durée d'observation avant de trancher, en millisecondes. */
  fenetreMs?: number
}

/** En dessous, l'expérience est inconfortable : on dégrade. */
const SEUIL_BASCULE = 26

/** Au-dessus, la marge est confortable : on peut remonter. */
const SEUIL_REMONTEE = 52

/**
 * Étape 3.7 — Mesure du framerate et bascule automatique de qualité.
 *
 * La détection se fait sur une FENÊTRE de 3 secondes, pas image par image :
 * les premières images d'une scène sont toujours lentes (compilation des
 * shaders, téléversement des textures) et déclencheraient une dégradation
 * injustifiée sur une machine parfaitement capable.
 *
 * Les deux seuils sont volontairement éloignés — 26 fps pour descendre,
 * 52 pour remonter. Un seuil unique ferait osciller la qualité en boucle
 * autour de la valeur pivot, ce qui est plus désagréable qu'un rendu
 * franchement dégradé.
 *
 * Ce composant ne décide pas : il mesure et remonte. C'est l'application qui
 * applique, parce que la qualité affecte aussi des réglages hors du Canvas.
 */
export default function DetecteurPerf({ qualite, onMesure, fenetreMs = 3000 }: Props) {
  const gl = useThree((etat) => etat.gl)

  const images = useRef(0)
  const debut = useRef(performance.now())
  const verrouille = useRef(false)

  // Une seule bascule automatique par session : au-delà, on respecte le choix
  // en cours. Sinon un pic de charge ponctuel — un onglet voisin qui compile,
  // un antivirus qui passe — dégraderait durablement la scène.
  useEffect(() => {
    verrouille.current = false
    images.current = 0
    debut.current = performance.now()
  }, [fenetreMs])

  useFrame(() => {
    images.current++

    const ecoule = performance.now() - debut.current
    if (ecoule < fenetreMs) return

    const fps = Math.round((images.current / ecoule) * 1000)
    const info = gl.info

    let suivante = qualite

    if (!verrouille.current) {
      if (fps < SEUIL_BASCULE && qualite === 'normale') {
        suivante = 'reduite'
        verrouille.current = true
      } else if (fps > SEUIL_REMONTEE && qualite === 'reduite') {
        suivante = 'normale'
        verrouille.current = true
      }
    }

    onMesure({
      fps,
      qualite: suivante,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      programmes: info.programs?.length ?? 0,
    })

    images.current = 0
    debut.current = performance.now()
  })

  return null
}
