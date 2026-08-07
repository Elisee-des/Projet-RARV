import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export type Mesures = {
  fps: number
  appels: number
  triangles: number
  geometries: number
  textures: number
  programmes: number
}

type Props = {
  onMesures: (mesures: Mesures) => void
}

const PERIODE_MS = 500

/**
 * Étape 9.2 — Sonde de performance.
 *
 * Lit `renderer.info`, la source de vérité de Three.js : nombre d'appels de
 * dessin, triangles réellement rendus, ressources GPU vivantes. Le compteur
 * de FPS seul ne dit pas POURQUOI ça rame ; les draw calls, si.
 *
 * Échantillonné toutes les 500 ms : mesurer à chaque image coûterait plus
 * cher que ce qu'on mesure.
 */
export function SondeurPerf({ onMesures }: Props) {
  const gl = useThree((s) => s.gl)
  const images = useRef(0)
  const depuis = useRef(performance.now())

  useFrame(() => {
    images.current++

    const maintenant = performance.now()
    const ecoule = maintenant - depuis.current

    if (ecoule < PERIODE_MS) return

    const info = gl.info

    onMesures({
      fps: Math.round((images.current * 1000) / ecoule),
      appels: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programmes: info.programs?.length ?? 0,
    })

    images.current = 0
    depuis.current = maintenant
  })

  return null
}

/** Affichage DOM des mesures, hors du canvas. */
export function PanneauPerf({ mesures }: { mesures: Mesures | null }) {
  if (!mesures) return null

  // Seuils issus du budget de l'étape 1.7.
  const couleur = (valeur: number, alerte: number, critique: number) =>
    valeur >= critique ? 'ko' : valeur >= alerte ? 'info' : 'ok'

  return (
    <dl className="perf" aria-label="Mesures de performance">
      <div>
        <dt>FPS</dt>
        <dd className={mesures.fps < 30 ? 'ko' : mesures.fps < 55 ? 'info' : 'ok'}>{mesures.fps}</dd>
      </div>
      <div>
        <dt>Draw calls</dt>
        <dd className={couleur(mesures.appels, 30, 60)}>{mesures.appels}</dd>
      </div>
      <div>
        <dt>Triangles</dt>
        <dd>{mesures.triangles.toLocaleString('fr-FR')}</dd>
      </div>
      <div>
        <dt>Géométries</dt>
        <dd>{mesures.geometries}</dd>
      </div>
      <div>
        <dt>Textures</dt>
        <dd>{mesures.textures}</dd>
      </div>
      <div>
        <dt>Programmes</dt>
        <dd>{mesures.programmes}</dd>
      </div>
    </dl>
  )
}
