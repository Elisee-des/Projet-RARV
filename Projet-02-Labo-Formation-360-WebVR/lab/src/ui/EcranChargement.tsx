interface Props {
  /** 0 à 100. */
  progression: number
  titre: string
  etape: string
}

/**
 * Étape 3.3 — Écran de chargement à progression **réelle**.
 *
 * La barre suit `useProgress` de drei, qui reflète les octets effectivement
 * reçus par le gestionnaire de chargement de Three.js. Une barre animée sans
 * rapport avec le chargement réel est pire que pas de barre du tout : elle fait
 * croire à un blocage quand elle stagne, et à une erreur quand elle saute.
 */
export default function EcranChargement({ progression, titre, etape }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progression)))

  return (
    <div style={styles.fond} role="status" aria-live="polite">
      <div style={styles.contenu}>
        <p style={styles.surTitre}>Atelier de maintenance</p>
        <h1 style={styles.titre}>{titre}</h1>

        <div style={styles.piste} aria-hidden="true">
          <div style={{ ...styles.jauge, width: `${pct}%` }} />
        </div>

        <p style={styles.etape}>
          <span style={styles.pct}>{pct}%</span> — {etape}
        </p>
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
    zIndex: 20,
  },
  contenu: { width: 'min(460px, 100%)', textAlign: 'center' },
  surTitre: {
    margin: 0,
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  titre: { margin: '8px 0 28px', fontSize: 20, fontWeight: 600, lineHeight: 1.35 },
  piste: {
    height: 6,
    borderRadius: 3,
    background: 'rgb(148 163 184 / 0.2)',
    overflow: 'hidden',
  },
  jauge: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 3,
    transition: 'width 180ms linear',
  },
  etape: { margin: '14px 0 0', fontSize: 13, color: 'var(--texte-doux)' },
  pct: { fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--texte)' },
}
