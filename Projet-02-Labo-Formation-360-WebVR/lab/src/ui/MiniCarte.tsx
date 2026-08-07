import { useEffect, useState } from 'react'
import { etatJoueur } from '../scene/etatJoueur'
import { useNavigation } from '../etat/navigation'
import type { PointResolu } from '../scene/reperes'
import type { Environnement } from '../api/types'

interface Props {
  environnement: Environnement
  points: PointResolu[]
  termines: string[]
}

const COULEURS: Record<string, string> = {
  panel: '#2563eb',
  video: '#7c3aed',
  document: '#b45309',
  quiz: '#15803d',
}

/** 15 Hz : imperceptible à l'œil, 4× moins de rendus React qu'à 60. */
const PERIODE_MS = 66

/**
 * Étape 4.8 — Mini-carte.
 *
 * ⚠️ Le plan la classe parmi les parades au risque R4 (« utilisateurs
 * perdus »), avec les indicateurs hors champ et le déplacement guidé. Dans une
 * salle fermée sans repère extérieur, savoir *où l'on est* et *ce qu'il reste à
 * faire* est ce qui sépare « je comprends le parcours » de « je tourne en rond
 * et j'abandonne ».
 *
 * Chaque pastille est **cliquable** : c'est le déclencheur du déplacement
 * guidé de l'étape 4.9. Un apprenant qui ne sait pas jouer aux FPS n'a jamais
 * besoin de savoir se déplacer.
 */
export default function MiniCarte({ environnement, points, termines }: Props) {
  const [joueur, setJoueur] = useState({ x: 0, z: 0, lacet: 0 })
  const allerVers = useNavigation((etat) => etat.allerVers)
  const cible = useNavigation((etat) => etat.cible)

  useEffect(() => {
    const minuteur = setInterval(() => {
      setJoueur({
        x: etatJoueur.pieds.x,
        z: etatJoueur.pieds.z,
        lacet: etatJoueur.lacet,
      })
    }, PERIODE_MS)

    return () => clearInterval(minuteur)
  }, [])

  const bornes = environnement.bounds

  if (!bornes) return null

  const { largeur, profondeur } = bornes
  const COTE = 168
  const echelle = COTE / Math.max(largeur, profondeur)
  const l = largeur * echelle
  const p = profondeur * echelle

  const versEcran = (x: number, z: number) => ({ cx: x * echelle, cy: z * echelle })
  const moi = versEcran(joueur.x, joueur.z)

  const restants = points.filter((poste) => poste.required && !termines.includes(poste.code)).length

  return (
    <div style={styles.cadre}>
      <div style={styles.entete}>
        <span style={styles.titre}>Plan de l'atelier</span>
        <span style={styles.restants}>
          {restants === 0 ? 'tous les postes requis faits' : `${restants} poste${restants > 1 ? 's' : ''} requis`}
        </span>
      </div>

      <svg width={l} height={p} viewBox={`0 0 ${l} ${p}`} style={styles.plan} role="img" aria-label="Plan de la salle">
        <rect x={0} y={0} width={l} height={p} rx={4} fill="rgb(15 23 42 / 0.55)" stroke="rgb(148 163 184 / 0.35)" />

        {points.map((poste) => {
          const { cx, cy } = versEcran(poste.position3d.x, poste.position3d.z)
          const fait = termines.includes(poste.code)
          const vise = cible === poste.code
          const couleur = COULEURS[poste.activity.type] ?? '#94a3b8'

          return (
            <g
              key={poste.code}
              onClick={() => allerVers(poste.code)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`Aller au poste ${poste.label}${fait ? ', terminé' : ''}`}
              onKeyDown={(evenement) => {
                if (evenement.key === 'Enter' || evenement.key === ' ') allerVers(poste.code)
              }}
            >
              {/* Cible de clic généreuse : une pastille de 6 px est intouchable au doigt */}
              <circle cx={cx} cy={cy} r={13} fill="transparent" />

              {vise && <circle cx={cx} cy={cy} r={10} fill="none" stroke="#38bdf8" strokeWidth={1.5} />}

              <circle
                cx={cx}
                cy={cy}
                r={poste.required ? 6 : 5}
                fill={fait ? couleur : 'rgb(15 23 42 / 0.9)'}
                stroke={couleur}
                strokeWidth={poste.required ? 2 : 1.4}
                strokeDasharray={poste.required ? undefined : '2 2'}
              />

              {fait && (
                <path
                  d={`M ${cx - 2.6} ${cy} l 1.9 2 l 3.4 -3.8`}
                  fill="none"
                  stroke="#0b1220"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              )}

              <text x={cx} y={cy - 10} fontSize={7.5} textAnchor="middle" fill="var(--texte-doux)">
                {poste.code.replace('POI_', '')}
              </text>
            </g>
          )
        })}

        {/* Le joueur, avec son cône de vision */}
        <g transform={`translate(${moi.cx} ${moi.cy}) rotate(${180 - joueur.lacet})`}>
          <path d="M 0 0 L -9 -17 A 19 19 0 0 1 9 -17 Z" fill="rgb(56 189 248 / 0.22)" />
          <circle r={4} fill="#38bdf8" stroke="#0b1220" strokeWidth={1.2} />
        </g>
      </svg>

      <p style={styles.aide}>Touchez un poste pour vous y rendre automatiquement.</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  cadre: {
    position: 'fixed',
    top: 16,
    right: 16,
    padding: '10px 12px 8px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    zIndex: 14,
  },
  entete: { display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 7 },
  titre: { fontSize: 12, fontWeight: 600 },
  restants: { fontSize: 10.5, color: 'var(--texte-doux)' },
  plan: { display: 'block' },
  aide: { margin: '7px 0 0', fontSize: 10, color: 'var(--texte-doux)', maxWidth: 170, lineHeight: 1.4 },
}
