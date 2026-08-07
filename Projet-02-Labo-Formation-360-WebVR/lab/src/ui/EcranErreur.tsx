interface Props {
  titre: string
  message: string
  detail?: string
  /** Étape 10.4 — le parcours 2D reste accessible même sans 3D. */
  parcoursAlternatif?: boolean
  onReessayer?: () => void
}

/**
 * Étape 3.8 — Écran d'erreur.
 *
 * Un principe : **jamais d'impasse**. WebGL absent, `.glb` illisible, contexte
 * perdu — dans tous les cas la formation reste suivable par le parcours
 * alternatif 2D de l'étape 10.4. C'est ce qui transforme une panne technique
 * en simple changement de modalité.
 */
export default function EcranErreur({
  titre,
  message,
  detail,
  parcoursAlternatif = true,
  onReessayer,
}: Props) {
  return (
    <div style={styles.fond} role="alert">
      <div style={styles.contenu}>
        <p style={styles.pastille}>⚠︎</p>
        <h1 style={styles.titre}>{titre}</h1>
        <p style={styles.message}>{message}</p>

        {detail && <pre style={styles.detail}>{detail}</pre>}

        <div style={styles.actions}>
          {onReessayer && (
            <button type="button" style={styles.boutonPrincipal} onClick={onReessayer}>
              Réessayer
            </button>
          )}
          {parcoursAlternatif && (
            <a href="?mode=2d" style={styles.boutonSecondaire}>
              Suivre la formation sans 3D
            </a>
          )}
        </div>
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
    padding: 24,
    background: 'var(--fond)',
    zIndex: 30,
  },
  contenu: { width: 'min(520px, 100%)', textAlign: 'center' },
  pastille: { margin: 0, fontSize: 34, color: 'var(--erreur)' },
  titre: { margin: '10px 0 8px', fontSize: 20, fontWeight: 700 },
  message: { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--texte-doux)' },
  detail: {
    margin: '16px 0 0',
    padding: 12,
    borderRadius: 8,
    background: 'rgb(148 163 184 / 0.12)',
    fontSize: 11,
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: 'var(--texte-doux)',
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 },
  boutonPrincipal: {
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  boutonSecondaire: {
    padding: '9px 18px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 13,
    textDecoration: 'none',
  },
}
