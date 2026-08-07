/**
 * Gabarit des pages « documentaires » — tout sauf l'atelier 3D, qui occupe
 * l'écran entier.
 *
 * Une colonne large mais bornée : au-delà d'environ 70 caractères, l'œil perd
 * la ligne suivante en revenant à gauche. Les tableaux et les graphiques
 * peuvent dépasser cette colonne, jamais le texte courant.
 */
export default function Page({
  titre,
  chapeau,
  etape,
  actions,
  children,
}: {
  titre: string
  chapeau?: string
  etape?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={styles.page}>
      <div style={styles.contenu}>
        <header style={styles.entete}>
          <div style={styles.enteteTexte}>
            {etape && <p style={styles.etape}>{etape}</p>}
            <h1 style={styles.titre}>{titre}</h1>
            {chapeau && <p style={styles.chapeau}>{chapeau}</p>}
          </div>
          {actions && <div style={styles.actions}>{actions}</div>}
        </header>

        {children}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { height: '100%', overflowY: 'auto', background: 'var(--fond)' },
  contenu: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '28px 20px 72px',
    display: 'grid',
    gap: 24,
  },
  entete: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 20,
    flexWrap: 'wrap',
  },
  enteteTexte: { display: 'grid', gap: 5, maxWidth: '62ch' },
  etape: {
    margin: 0,
    fontSize: 10.5,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  titre: { margin: 0, fontSize: 25, fontWeight: 700, lineHeight: 1.25 },
  chapeau: { margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--texte-doux)' },
  actions: { display: 'flex', gap: 9, flexWrap: 'wrap' },
}
