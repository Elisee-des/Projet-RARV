import { useMemo, useState } from 'react'
import { assainir } from '../assainir'
import type { ActiviteDocument } from '../../api/types'

interface Props {
  activite: ActiviteDocument
  dejaTermine: boolean
  onTerminer: () => void
}

/**
 * Étapes 6.11 et 6.12 — Document téléchargeable.
 *
 * ## URL signée (6.11)
 *
 * Le lien pointe sur une URL signée fabriquée par l'API : le front ne connaît
 * jamais l'arborescence de stockage du serveur, et un chemin forgé à la main
 * est rejeté. La liste blanche de `EnvironmentAssetController` fait le reste —
 * seuls les fichiers déclarés par l'environnement ou l'un de ses postes
 * sortent.
 *
 * ## Marquage (6.12)
 *
 * `completeOn: 'download'` — le poste est validé au téléchargement. On ne peut
 * pas savoir si le PDF a été lu, et prétendre le contraire serait mentir dans
 * les statistiques du formateur. Le résumé affiché ici, lui, porte l'essentiel
 * du contenu pour qui ne veut pas ouvrir le fichier.
 *
 * L'aperçu utilise un `<iframe>` plutôt qu'un `<embed>` : sur mobile, aucun
 * des deux n'affiche de PDF, mais l'iframe se replie proprement sur le lien de
 * téléchargement au lieu de laisser un rectangle vide.
 */
export default function DocumentActivite({ activite, dejaTermine, onTerminer }: Props) {
  const [termine, setTermine] = useState(dejaTermine)
  const [apercu, setApercu] = useState(false)

  const resume = useMemo(
    () => (activite.summaryHtml ? assainir(activite.summaryHtml) : ''),
    [activite.summaryHtml]
  )

  const valider = () => {
    if (termine) return

    setTermine(true)
    onTerminer()
  }

  return (
    <div style={styles.contenu}>
      <h2 style={styles.titre}>{activite.title}</h2>

      {resume && <div style={styles.riche} dangerouslySetInnerHTML={{ __html: resume }} />}

      <div style={styles.actions}>
        <a
          href={activite.file}
          download
          target="_blank"
          rel="noopener noreferrer"
          style={styles.principal}
          onClick={valider}
        >
          ⬇ Télécharger la fiche {activite.mime === 'application/pdf' ? '(PDF)' : ''}
        </a>

        <button
          type="button"
          style={styles.secondaire}
          data-valider="document"
          onClick={() => {
            setApercu((ouvert) => !ouvert)
            valider()
          }}
        >
          {apercu ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}
        </button>
      </div>

      {apercu && (
        <iframe
          src={activite.file}
          title={activite.title}
          style={styles.apercu}
        />
      )}

      <p style={styles.etat}>
        {termine
          ? '✓ Document consulté — poste terminé'
          : 'Téléchargez ou affichez la fiche pour valider ce poste.'}
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  contenu: { display: 'grid', gap: 12 },
  titre: { margin: 0, fontSize: 16, fontWeight: 700 },
  riche: { fontSize: 13.5, lineHeight: 1.65 },
  actions: { display: 'flex', gap: 9, flexWrap: 'wrap' },
  principal: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  secondaire: {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 13,
    cursor: 'pointer',
  },
  apercu: {
    width: '100%',
    height: '42vh',
    border: '1px solid var(--bordure)',
    borderRadius: 8,
    background: '#fff',
  },
  etat: { margin: 0, fontSize: 11.5, color: 'var(--texte-doux)' },
}
