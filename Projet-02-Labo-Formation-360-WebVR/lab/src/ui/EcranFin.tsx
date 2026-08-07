import { useState } from 'react'
import type { Progression } from '../api/types'
import type { PointResolu } from '../scene/reperes'

interface Props {
  progression: Progression
  points: PointResolu[]
  titre: string
  jeton: string
  onFermer: () => void
  onRecommencer: () => void
}

/**
 * Étape 7.5 — Écran de fin, et 7.6 — attestation.
 *
 * ## Il s'affiche même si le parcours n'est pas validé
 *
 * C'est le point important. Un écran de fin réservé aux reçus laisse ceux qui
 * échouent devant une salle 3D sans savoir ce qui leur manque — c'est-à-dire
 * exactement les personnes qui ont besoin d'être guidées. Il liste donc ce qui
 * reste à faire, avec des noms de postes, pas des codes.
 *
 * ## L'attestation ne se télécharge pas comme un fichier
 *
 * ⚠️ Un simple `<a href download>` ne peut pas porter d'en-tête
 * `Authorization`. On récupère donc le PDF par `fetch`, on en fait un blob et
 * on déclenche le téléchargement. C'est aussi ce qui permet d'afficher un vrai
 * message quand le serveur refuse — plutôt qu'un onglet blanc affichant du
 * JSON d'erreur.
 */
export default function EcranFin({
  progression,
  points,
  titre,
  jeton,
  onFermer,
  onRecommencer,
}: Props) {
  const [telechargement, setTelechargement] = useState<'repos' | 'encours' | 'erreur'>('repos')

  const valide = progression.completed
  const meilleur = progression.quiz.best
  const minutes = Math.floor(progression.totalTimeMs / 60_000)

  const nomDe = (code: string) => points.find((p) => p.code === code)?.label ?? code
  const manquants = progression.missingRequired.map(nomDe)

  const nonFaits = points.filter(
    (poste) => !poste.required && !progression.completedPoints.includes(poste.code)
  )

  const telecharger = async () => {
    setTelechargement('encours')

    try {
      const reponse = await fetch('/api/attestation', {
        headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/pdf' },
      })

      if (!reponse.ok) throw new Error(String(reponse.status))

      const blob = await reponse.blob()
      const url = URL.createObjectURL(blob)

      const lien = document.createElement('a')
      lien.href = url
      lien.download = `attestation-${progression.environment}.pdf`
      lien.click()

      // Sans révocation, le blob reste en mémoire jusqu'au déchargement de la
      // page — quelques centaines de kilo-octets par clic.
      URL.revokeObjectURL(url)

      setTelechargement('repos')
    } catch {
      setTelechargement('erreur')
    }
  }

  return (
    <div style={styles.fond} role="dialog" aria-modal="true" aria-label="Récapitulatif de la formation">
      <div style={styles.boite}>
        <p style={styles.surTitre}>{valide ? 'Formation validée' : 'Récapitulatif'}</p>
        <h1 style={styles.titre}>{titre}</h1>

        <div style={{ ...styles.bandeau, borderColor: valide ? 'var(--ok)' : 'var(--bordure)' }}>
          <Chiffre valeur={`${progression.completionPct} %`} libelle="progression" />
          <Chiffre
            valeur={meilleur ? `${meilleur.score} / ${meilleur.maxScore}` : '—'}
            libelle="score au quiz"
            accent={progression.quiz.passed}
          />
          <Chiffre valeur={`${minutes} min`} libelle="temps passé" />
        </div>

        {valide ? (
          <>
            <p style={styles.texte}>
              Vous avez consulté tous les postes obligatoires et validé l'évaluation. Les trois
              réflexes à emporter&nbsp;:
            </p>

            <ol style={styles.reflexes}>
              <li>
                <strong>S·C·I·V</strong> — aucune intervention ne commence avant la vérification
                d'absence de tension.
              </li>
              <li>
                <strong>Un symptôme n'est pas une cause.</strong> Une garniture qui fuit et un
                roulement qui chauffe sont, le plus souvent, les conséquences d'un défaut
                d'alignement ou d'un problème à l'aspiration.
              </li>
              <li>
                <strong>Un couple se respecte, et se répartit.</strong> En croix, en trois passes.
              </li>
            </ol>

            <button
              type="button"
              style={styles.principal}
              onClick={() => void telecharger()}
              disabled={telechargement === 'encours'}
            >
              {telechargement === 'encours' ? 'Génération…' : '📄 Télécharger mon attestation (PDF)'}
            </button>

            {telechargement === 'erreur' && (
              <p style={styles.erreur}>
                L'attestation n'a pas pu être générée. Vérifiez votre connexion et réessayez.
              </p>
            )}
          </>
        ) : (
          <>
            <p style={styles.texte}>Il vous reste à&nbsp;:</p>

            <ul style={styles.reste}>
              {manquants.map((nom) => (
                <li key={nom}>
                  Consulter le poste <strong>{nom}</strong>
                </li>
              ))}

              {!progression.quiz.passed && (
                <li>
                  {meilleur
                    ? `Repasser l'évaluation — ${meilleur.percentage} % obtenus, ${progression.quiz.best ? '70' : '70'} % requis`
                    : "Passer l'évaluation au poste 8"}
                </li>
              )}
            </ul>
          </>
        )}

        {nonFaits.length > 0 && (
          <p style={styles.facultatifs}>
            Postes facultatifs non consultés&nbsp;: {nonFaits.map((p) => p.label).join(', ')}.
            {!valide && ' Deux questions du quiz portent dessus.'}
          </p>
        )}

        <div style={styles.actions}>
          <button type="button" style={styles.secondaire} onClick={onFermer}>
            Retour à l'atelier
          </button>
          <button type="button" style={styles.secondaire} onClick={onRecommencer}>
            Recommencer
          </button>
        </div>

        <p style={styles.note}>
          Recommencer efface votre progression dans la salle, mais pas vos tentatives de quiz
          déjà utilisées.
        </p>
      </div>
    </div>
  )
}

function Chiffre({ valeur, libelle, accent = false }: { valeur: string; libelle: string; accent?: boolean }) {
  return (
    <div style={styles.chiffre}>
      <strong style={{ ...styles.chiffreValeur, color: accent ? 'var(--ok)' : 'var(--texte)' }}>
        {valeur}
      </strong>
      <span style={styles.chiffreLibelle}>{libelle}</span>
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
    zIndex: 27,
  },
  boite: {
    width: 'min(520px, 100%)',
    maxHeight: '88vh',
    overflowY: 'auto',
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
  titre: { margin: '4px 0 16px', fontSize: 17, fontWeight: 600, lineHeight: 1.4 },
  bandeau: {
    display: 'flex',
    gap: 18,
    padding: '12px 16px',
    borderRadius: 10,
    border: '2px solid',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chiffre: { display: 'grid', gap: 1 },
  chiffreValeur: { fontSize: 19, fontVariantNumeric: 'tabular-nums' },
  chiffreLibelle: { fontSize: 10.5, color: 'var(--texte-doux)' },
  texte: { margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 },
  reflexes: { margin: '0 0 18px', paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, display: 'grid', gap: 7 },
  reste: { margin: '0 0 16px', paddingLeft: 20, fontSize: 13, lineHeight: 1.7 },
  facultatifs: {
    margin: '0 0 16px',
    padding: '8px 11px',
    borderRadius: 8,
    background: 'rgb(148 163 184 / 0.12)',
    fontSize: 11.5,
    lineHeight: 1.5,
    color: 'var(--texte-doux)',
  },
  principal: {
    width: '100%',
    padding: '11px 16px',
    borderRadius: 9,
    border: 'none',
    background: 'var(--ok)',
    color: '#06210f',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  erreur: { margin: '9px 0 0', fontSize: 12, color: 'var(--erreur)' },
  actions: { display: 'flex', gap: 9, marginTop: 16, flexWrap: 'wrap' },
  secondaire: {
    flex: 1,
    minWidth: 140,
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 12.5,
    cursor: 'pointer',
  },
  note: { margin: '12px 0 0', fontSize: 10.5, lineHeight: 1.5, color: 'var(--texte-doux)' },
}
