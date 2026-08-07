import { useEffect, useState } from 'react'
import { horsChamp, type CibleHorsChamp } from '../scene/boussole'
import { useInteraction } from '../etat/interaction'
import type { PointResolu } from '../scene/reperes'

interface Props {
  points: PointResolu[]
}

const COULEURS: Record<string, string> = {
  panel: '#2563eb',
  video: '#7c3aed',
  document: '#b45309',
  quiz: '#15803d',
}

/** 12 Hz : la tête ne tourne pas assez vite pour que ça se voie. */
const PERIODE_MS = 80

/** Au-delà, l'écran se couvre de flèches et l'information disparaît. */
const MAX_FLECHES = 3

/**
 * Étape 5.5 — Indicateurs hors champ.
 *
 * ⚠️ Le plan y insiste : « dans une salle fermée, l'utilisateur ne sait pas où
 * aller. Les indicateurs hors champ sont ce qui fait la différence entre "je me
 * perds" et "je comprends le parcours". »
 *
 * Deux règles de sélection, sans lesquelles le dispositif se retourne contre
 * lui-même :
 *
 * 1. **Seuls les postes qui restent à faire** sont signalés. Fléché vers ce
 *    qu'on a déjà terminé, l'écran devient du bruit.
 * 2. **Trois flèches au maximum**, les plus proches. Huit flèches simultanées
 *    ne désignent plus rien.
 */
export default function IndicateursHorsChamp({ points }: Props) {
  const [cibles, setCibles] = useState<CibleHorsChamp[]>([])
  const termines = useInteraction((etat) => etat.termines)
  const ouvert = useInteraction((etat) => etat.ouvert)

  useEffect(() => {
    const minuteur = setInterval(() => {
      setCibles(horsChamp.map((c) => ({ ...c })))
    }, PERIODE_MS)

    return () => clearInterval(minuteur)
  }, [])

  // Pendant une activité, l'écran appartient au contenu pédagogique.
  if (ouvert) return null

  const restants = cibles
    .filter((cible) => {
      const poste = points.find((p) => p.code === cible.code)
      return poste && poste.required && !termines.includes(cible.code)
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_FLECHES)

  if (restants.length === 0) return null

  return (
    <div style={styles.zone} aria-hidden="true">
      {restants.map((cible) => {
        const poste = points.find((p) => p.code === cible.code)
        const couleur = COULEURS[poste?.activity.type ?? ''] ?? '#94a3b8'

        // Placement sur une ellipse inscrite dans l'écran : la flèche apparaît
        // du côté où il faut tourner la tête.
        const x = 50 + Math.cos(cible.angle) * 41
        const y = 50 - Math.sin(cible.angle) * 38

        return (
          <div
            key={cible.code}
            style={{
              ...styles.fleche,
              left: `${x}%`,
              top: `${y}%`,
              borderColor: couleur,
            }}
          >
            <span style={{ ...styles.pointe, transform: `rotate(${-cible.angle}rad)` }}>➜</span>
            <span style={styles.distance}>{cible.distance.toFixed(0)} m</span>
          </div>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  zone: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 11 },
  fleche: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 8px',
    borderRadius: 999,
    border: '1px solid',
    background: 'rgb(15 23 42 / 0.72)',
    backdropFilter: 'blur(4px)',
    fontSize: 11,
    color: 'var(--texte)',
    whiteSpace: 'nowrap',
  },
  pointe: { display: 'inline-block', fontSize: 12, lineHeight: 1 },
  distance: { fontVariantNumeric: 'tabular-nums', color: 'var(--texte-doux)' },
}
