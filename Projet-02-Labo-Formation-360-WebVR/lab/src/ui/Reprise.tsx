import type { Progression } from '../api/types'

interface Props {
  progression: Progression
  titre: string
  onReprendre: () => void
  onRecommencer: () => void
}

/**
 * Étape 7.3 — Reprise de session.
 *
 * > « Réouverture → "Reprendre où vous en étiez ?" avec restauration de la
 * > position. »
 *
 * ⚠️ **On demande, on n'impose pas.** Réapparaître silencieusement au milieu de
 * la salle, devant un poste déjà fait, est profondément désorientant : on ne
 * reconnaît pas les lieux et on ne sait pas ce qui s'est passé. L'écran rappelle
 * donc *où l'on en était* avant de rendre la main.
 *
 * Il n'apparaît que s'il y a réellement quelque chose à reprendre — une
 * position enregistrée ou au moins un poste terminé. Un apprenant qui a
 * simplement rechargé la page dans les premières secondes ne doit pas se voir
 * poser une question sans objet.
 */
export default function Reprise({ progression, titre, onReprendre, onRecommencer }: Props) {
  const minutes = Math.floor(progression.totalTimeMs / 60_000)
  const meilleur = progression.quiz.best

  return (
    <div style={styles.fond} role="dialog" aria-modal="true" aria-label="Reprendre la formation">
      <div style={styles.boite}>
        <p style={styles.surTitre}>Session précédente retrouvée</p>
        <h1 style={styles.titre}>{titre}</h1>

        <p style={styles.question}>Reprendre où vous en étiez&nbsp;?</p>

        <dl style={styles.recap}>
          <Ligne
            cle="Postes terminés"
            valeur={`${progression.completedPoints.length} / ${progression.pointCount}`}
          />
          <Ligne cle="Progression" valeur={`${progression.completionPct} %`} />
          <Ligne cle="Temps déjà passé" valeur={`${minutes} min`} />
          {meilleur && (
            <Ligne
              cle="Meilleur score au quiz"
              valeur={`${meilleur.score} / ${meilleur.maxScore} (${meilleur.percentage} %)`}
            />
          )}
          {progression.missingRequired.length > 0 && (
            <Ligne cle="Postes requis restants" valeur={progression.missingRequired.join(', ')} />
          )}
        </dl>

        <div style={styles.actions}>
          <button type="button" style={styles.principal} onClick={onReprendre}>
            Reprendre — retour à ma position
          </button>
          <button type="button" style={styles.secondaire} onClick={onRecommencer}>
            Repartir du début
          </button>
        </div>

        {/* Cette précision évite le pire malentendu de l'écran : croire que
            « repartir du début » rend les tentatives de quiz consommées. */}
        <p style={styles.note}>
          Repartir du début efface votre progression dans la salle, mais pas vos tentatives de
          quiz déjà utilisées.
        </p>
      </div>
    </div>
  )
}

function Ligne({ cle, valeur }: { cle: string; valeur: string }) {
  return (
    <div style={styles.ligne}>
      <dt style={styles.cle}>{cle}</dt>
      <dd style={styles.valeur}>{valeur}</dd>
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
    background: 'rgb(2 6 16 / 0.86)',
    zIndex: 28,
  },
  boite: {
    width: 'min(420px, 100%)',
    padding: '22px 24px',
    borderRadius: 14,
    border: '1px solid var(--bordure)',
    background: '#0f172a',
  },
  surTitre: {
    margin: 0,
    fontSize: 10.5,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  titre: { margin: '4px 0 16px', fontSize: 16, fontWeight: 600, lineHeight: 1.4 },
  question: { margin: '0 0 12px', fontSize: 15, fontWeight: 700 },
  recap: { margin: '0 0 18px', display: 'grid', gap: 5, fontSize: 12.5 },
  ligne: { display: 'flex', justifyContent: 'space-between', gap: 14 },
  cle: { margin: 0, color: 'var(--texte-doux)' },
  valeur: { margin: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  actions: { display: 'grid', gap: 8 },
  principal: {
    padding: '10px 16px',
    borderRadius: 9,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaire: {
    padding: '10px 16px',
    borderRadius: 9,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 13,
    cursor: 'pointer',
  },
  note: { margin: '14px 0 0', fontSize: 10.5, lineHeight: 1.5, color: 'var(--texte-doux)' },
}
