import { useEffect, useState } from 'react'
import { useInteraction } from '../etat/interaction'
import type { Progression } from '../api/types'
import type { PointResolu } from '../scene/reperes'

interface Props {
  points: PointResolu[]
  progression: Progression | null
  debutSeance: number
  tempsAnterieurMs: number
  horsLigne: number
  onOuvrirFin: () => void
}

/**
 * Étape 7.1 — HUD permanent de l'apprenant.
 *
 * > « 5 / 8 postes • Score 42 / 60 • 12 min »
 *
 * Trois informations, pas plus. Ce bandeau reste affiché tout le temps : chaque
 * élément supplémentaire y est un élément que l'apprenant lira mille fois. Le
 * détail du parcours vit sur la mini-carte, les réglages dans le panneau
 * Confort, les chiffres de performance dans le panneau de développement.
 *
 * Le compteur affiche les postes **requis**, pas le total : c'est ce qui
 * conditionne la validation. Les deux postes facultatifs apparaissent
 * séparément, sans quoi un apprenant à 6/8 se croirait en retard alors qu'il a
 * terminé.
 */
export default function HudApprenant({
  points,
  progression,
  debutSeance,
  tempsAnterieurMs,
  horsLigne,
  onOuvrirFin,
}: Props) {
  const termines = useInteraction((etat) => etat.termines)
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 5000)

    return () => clearInterval(minuteur)
  }, [])

  const requis = points.filter((p) => p.required)
  const requisFaits = requis.filter((p) => termines.includes(p.code)).length
  const facultatifsFaits = points.filter((p) => !p.required && termines.includes(p.code)).length
  const facultatifs = points.length - requis.length

  const minutes = Math.floor((tempsAnterieurMs + (maintenant - debutSeance)) / 60_000)
  const meilleur = progression?.quiz.best ?? null
  const complet = progression?.completed ?? false

  return (
    <div style={styles.bandeau} role="status" aria-live="polite">
      <Bloc
        libelle="Postes"
        valeur={`${requisFaits} / ${requis.length}`}
        appoint={facultatifsFaits > 0 ? `+${facultatifsFaits} facultatif${facultatifsFaits > 1 ? 's' : ''}` : `${facultatifs} facultatifs`}
        accent={requisFaits === requis.length}
      />

      <span style={styles.separateur} aria-hidden="true" />

      <Bloc
        libelle="Score"
        valeur={meilleur ? `${meilleur.score} / ${meilleur.maxScore}` : '—'}
        appoint={meilleur ? `${meilleur.percentage} %` : 'quiz non passé'}
        accent={progression?.quiz.passed ?? false}
      />

      <span style={styles.separateur} aria-hidden="true" />

      <Bloc libelle="Temps" valeur={`${minutes} min`} />

      {/* Étape 7.7 — l'apprenant doit savoir que ses données ne sont pas
          perdues, sans être alarmé par un message d'erreur. */}
      {horsLigne > 0 && (
        <>
          <span style={styles.separateur} aria-hidden="true" />
          <span style={styles.horsLigne} title="Vos données seront envoyées au retour du réseau">
            ⇅ {horsLigne} en attente
          </span>
        </>
      )}

      {complet && (
        <button type="button" style={styles.bouton} onClick={onOuvrirFin}>
          🎓 Formation validée
        </button>
      )}
    </div>
  )
}

function Bloc({
  libelle,
  valeur,
  appoint,
  accent = false,
}: {
  libelle: string
  valeur: string
  appoint?: string
  accent?: boolean
}) {
  return (
    <span style={styles.bloc}>
      <span style={styles.libelle}>{libelle}</span>
      <span style={{ ...styles.valeur, color: accent ? 'var(--ok)' : 'var(--texte)' }}>{valeur}</span>
      {appoint && <span style={styles.appoint}>{appoint}</span>}
    </span>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bandeau: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '8px 16px',
    borderRadius: 999,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    zIndex: 14,
    maxWidth: 'calc(100vw - 32px)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bloc: { display: 'flex', alignItems: 'baseline', gap: 6 },
  libelle: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--texte-doux)' },
  valeur: { fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  appoint: { fontSize: 10.5, color: 'var(--texte-doux)' },
  separateur: { width: 1, height: 18, background: 'var(--bordure)' },
  horsLigne: { fontSize: 11, color: '#fbbf24' },
  bouton: {
    padding: '5px 12px',
    borderRadius: 999,
    border: 'none',
    background: 'var(--ok)',
    color: '#06210f',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
