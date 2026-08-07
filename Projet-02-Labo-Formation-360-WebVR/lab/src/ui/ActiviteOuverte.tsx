import { useEffect, useRef } from 'react'
import ModaleQuiz from './activites/ModaleQuiz'
import LecteurVideo from './activites/LecteurVideo'
import PanneauInfo from './activites/PanneauInfo'
import DocumentActivite from './activites/DocumentActivite'
import type { Activite } from '../api/types'

/**
 * Ce qu'une activité a besoin de savoir de son poste — et rien de plus.
 *
 * ⚠️ **Volontairement sans type 3D.** Le parcours accessible de l'étape 10.4
 * réutilise ces composants tels quels ; s'ils exigeaient un `PointResolu`, dont
 * la position est un `Vector3`, tout Three.js entrerait dans le morceau de
 * bundle de la page sans WebGL. `PointResolu` reste structurellement
 * compatible, donc la version 3D passe le sien sans conversion.
 */
export interface PosteActivite {
  code: string
  label: string
  required: boolean
  activity: Activite
}

interface Props {
  poste: PosteActivite
  jeton: string
  sessionId: string | null
  dejaTermine: boolean
  onFermer: () => void
  onTerminer: (code: string) => void
}

const LIBELLES: Record<string, string> = {
  panel: 'Panneau d’information',
  video: 'Vidéo',
  document: 'Document',
  quiz: 'Quiz noté',
}

/**
 * Lot 6 — Aiguilleur d'activité.
 *
 * Ce composant ne connaît aucun contenu : il porte ce qui entoure les quatre
 * types d'activité et qu'on oublie systématiquement de faire.
 *
 * - **Verrouillage des contrôles** (5.7) — assuré par le parent, qui gèle le
 *   contrôleur ; ici on libère le pointeur, sans quoi rien n'est cliquable.
 * - **`Échap` et focus** — navigation clavier complète (10.5).
 * - **Fermeture au clic sur le fond**, hors de la modale.
 *
 * ⚠️ **Une exception : le quiz ne se ferme pas sur `Échap` ni au clic à côté.**
 * Une tentative est comptée dès son ouverture ; sortir d'un geste maladroit la
 * consommerait. Le quiz impose donc le bouton de fermeture explicite.
 */
export default function ActiviteOuverte({
  poste,
  jeton,
  sessionId,
  dejaTermine,
  onFermer,
  onTerminer,
}: Props) {
  const boite = useRef<HTMLDivElement>(null)
  const activite = poste.activity
  const estQuiz = activite.type === 'quiz'

  useEffect(() => {
    // Le pointeur doit être rendu à l'utilisateur : verrouillé, il ne peut
    // rien cliquer et l'activité semble figée.
    if (document.pointerLockElement) document.exitPointerLock()

    boite.current?.focus()

    if (estQuiz) return

    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key !== 'Escape') return

      evenement.preventDefault()
      onFermer()
    }

    window.addEventListener('keydown', surTouche)

    return () => window.removeEventListener('keydown', surTouche)
  }, [estQuiz, onFermer])

  const terminer = () => onTerminer(poste.code)

  return (
    <div
      style={styles.fond}
      role="dialog"
      aria-modal="true"
      aria-label={poste.label}
      onPointerDown={(evenement) => {
        if (!estQuiz && evenement.target === evenement.currentTarget) onFermer()
      }}
    >
      <div ref={boite} tabIndex={-1} style={styles.modale}>
        <header style={styles.entete}>
          <div>
            <p style={styles.type}>
              {LIBELLES[activite.type] ?? activite.type}
              {poste.required ? ' · obligatoire' : ' · facultatif'}
            </p>
            <p style={styles.poste}>{poste.label}</p>
          </div>
          <button type="button" style={styles.fermer} onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div style={styles.corps}>
          {activite.type === 'quiz' && (
            <ModaleQuiz
              jeton={jeton}
              quizId={activite.quizId}
              sessionId={sessionId}
              onTerminer={terminer}
              onFermer={onFermer}
            />
          )}

          {activite.type === 'video' && (
            <LecteurVideo activite={activite} dejaTermine={dejaTermine} onTerminer={terminer} />
          )}

          {activite.type === 'panel' && (
            <PanneauInfo activite={activite} dejaTermine={dejaTermine} onTerminer={terminer} />
          )}

          {activite.type === 'document' && (
            <DocumentActivite activite={activite} dejaTermine={dejaTermine} onTerminer={terminer} />
          )}
        </div>

        {!estQuiz && (
          <footer style={styles.pied}>
            <span style={styles.aide}>Échap pour revenir à l'atelier</span>
            <button type="button" style={styles.secondaire} onClick={onFermer}>
              Retour à l'atelier
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  fond: {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'rgb(2 6 16 / 0.74)',
    backdropFilter: 'blur(3px)',
    zIndex: 25,
  },
  modale: {
    width: 'min(600px, 100%)',
    maxHeight: 'min(86vh, 720px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 14,
    border: '1px solid var(--bordure)',
    background: '#0f172a',
    outline: 'none',
  },
  entete: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 18px 11px',
    borderBottom: '1px solid var(--bordure)',
  },
  type: {
    margin: 0,
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  poste: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--texte-doux)' },
  fermer: {
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    borderRadius: 7,
    width: 30,
    height: 30,
    cursor: 'pointer',
    flexShrink: 0,
  },
  corps: { padding: '16px 18px', overflowY: 'auto', minHeight: 0 },
  pied: {
    display: 'flex',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 18px 14px',
    borderTop: '1px solid var(--bordure)',
    flexWrap: 'wrap',
  },
  aide: { fontSize: 10.5, color: 'var(--texte-doux)' },
  secondaire: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 12.5,
    cursor: 'pointer',
  },
}
