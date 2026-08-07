import { useInteraction } from '../etat/interaction'
import type { PointResolu } from '../scene/reperes'

interface Props {
  points: PointResolu[]
  tactile: boolean
  onOuvrir: (code: string) => void
}

const LIBELLES: Record<string, string> = {
  panel: 'Panneau d’information',
  video: 'Vidéo',
  document: 'Document à télécharger',
  quiz: 'Quiz noté',
}

/**
 * Étapes 5.1 et 5.3 — Réticule et étiquette contextuelle.
 *
 * L'étiquette dit **quoi** et **comment** : « Tableau électrique — Vidéo ·
 * Appuyez sur E ». Sans le *comment*, l'apprenant voit un objet en surbrillance
 * et ne sait pas quoi en faire ; c'est le moment exact où l'on perd les gens
 * qui ne jouent pas aux jeux vidéo.
 *
 * L'instruction s'adapte au périphérique : « Appuyez sur E » n'a aucun sens sur
 * un téléphone, et « Touchez » n'en a aucun avec une souris.
 */
export default function Reticule({ points, tactile, onOuvrir }: Props) {
  const vise = useInteraction((etat) => etat.vise)
  const source = useInteraction((etat) => etat.source)
  const termines = useInteraction((etat) => etat.termines)

  const poste = points.find((p) => p.code === vise)

  return (
    <>
      <div style={{ ...styles.reticule, ...(poste ? styles.reticuleActif : null) }} aria-hidden="true" />

      {poste && (
        <div style={styles.etiquette} role="status" aria-live="polite">
          <p style={styles.titre}>{poste.label}</p>

          <p style={styles.meta}>
            {LIBELLES[poste.activity.type] ?? poste.activity.type}
            {poste.required ? ' · obligatoire' : ' · facultatif'}
            {termines.includes(poste.code) && ' · ✓ terminé'}
          </p>

          <button type="button" style={styles.action} onClick={() => onOuvrir(poste.code)}>
            {tactile ? 'Toucher pour ouvrir' : 'Appuyez sur E — ou cliquez ici'}
          </button>

          {source === 'proximite' && (
            <p style={styles.proximite}>Vous êtes dans la zone de ce poste.</p>
          )}
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  reticule: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: '50%',
    background: 'rgb(226 232 240 / 0.55)',
    boxShadow: '0 0 0 1px rgb(11 18 32 / 0.6)',
    pointerEvents: 'none',
    transition: 'width 140ms, height 140ms, margin 140ms, background 140ms',
    zIndex: 11,
  },
  reticuleActif: {
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    background: 'rgb(56 189 248 / 0.85)',
  },
  etiquette: {
    position: 'fixed',
    left: '50%',
    top: 'calc(50% + 26px)',
    transform: 'translateX(-50%)',
    minWidth: 220,
    maxWidth: 'min(340px, calc(100vw - 32px))',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    textAlign: 'center',
    zIndex: 11,
  },
  titre: { margin: 0, fontSize: 14, fontWeight: 600 },
  meta: { margin: '2px 0 8px', fontSize: 11, color: 'var(--texte-doux)' },
  action: {
    width: '100%',
    padding: '7px 12px',
    borderRadius: 7,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  proximite: { margin: '7px 0 0', fontSize: 10.5, color: 'var(--texte-doux)' },
}
