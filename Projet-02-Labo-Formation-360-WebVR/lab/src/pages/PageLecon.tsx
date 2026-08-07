import { useEffect, useRef, useState } from 'react'
import { LuCircleCheck, LuCircleDashed, LuCode, LuExternalLink } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Page from '../ui/Page'
import { ecouter, type MessageRarv } from '../lms/protocole'

/**
 * Étape 9.3 — Page de démonstration « fausse leçon LMS ».
 *
 * Elle imite ce qu'un intégrateur verrait dans Moodle, 360Learning ou un LXP :
 * du texte de cours, le composant embarqué, et une progression qui se met à
 * jour **toute seule** au fil de la formation.
 *
 * C'est cette page qui prouve l'intégration. Une démonstration qui montrerait
 * seulement la 3D en plein écran ne dirait rien du travail réel — lequel
 * consiste à faire dialoguer une application 3D avec une plateforme qu'on ne
 * maîtrise pas.
 */

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'rarv-lab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        environment?: string
        height?: string
        'user-ref'?: string
      }
    }
  }
}

interface EtatLecon {
  pret: boolean
  titre: string | null
  completionPct: number
  postesTermines: number
  requisRestants: number
  score: { score: number; maxScore: number; percentage: number; passed: boolean } | null
  termine: boolean
}

const INITIAL: EtatLecon = {
  pret: false,
  titre: null,
  completionPct: 0,
  postesTermines: 0,
  requisRestants: 0,
  score: null,
  termine: false,
}

export default function PageLecon() {
  const [etat, setEtat] = useState<EtatLecon>(INITIAL)
  const [journal, setJournal] = useState<string[]>([])
  const [codeVisible, setCodeVisible] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Deux écoutes possibles : les événements DOM du Web Component, ou le
    // `postMessage` brut. On prend le second — la page de démonstration montre
    // ainsi le protocole lui-même, qui est ce qu'un intégrateur doit connaître.
    return ecouter((message: MessageRarv) => {
      setJournal((precedent) => [`${horodatage()} · ${message.type}`, ...precedent].slice(0, 8))

      setEtat((precedent) => {
        switch (message.type) {
          case 'ready':
            return { ...precedent, pret: true, titre: message.title }
          case 'progress':
            return {
              ...precedent,
              completionPct: message.completionPct,
              postesTermines: message.completedPoints,
              requisRestants: message.requiredRemaining,
            }
          case 'score':
            return {
              ...precedent,
              score: {
                score: message.score,
                maxScore: message.maxScore,
                percentage: message.percentage,
                passed: message.passed,
              },
            }
          case 'completed':
            return { ...precedent, termine: true, completionPct: message.completionPct }
        }
      })
    })
  }, [])

  return (
    <Page
      etape="Étape 9.3"
      titre="Module 2 — Maintenance de premier niveau"
      chapeau="Cette page imite une leçon de LMS. Le laboratoire est embarqué par un Web Component ; la plateforme n’en connaît que quatre messages, et met à jour sa progression toute seule."
      actions={
        <button type="button" style={styles.bouton} onClick={() => setCodeVisible((v) => !v)}>
          <LuCode size={14} aria-hidden="true" /> {codeVisible ? 'Masquer' : 'Voir'} l’intégration
        </button>
      }
    >
      {codeVisible && (
        <pre style={styles.code}>{`<script type="module" src="/rarv-lab.js"></script>

<rarv-lab environment="atelier-maintenance-01" height="620"></rarv-lab>

<script>
  document.querySelector('rarv-lab')
    .addEventListener('rarv:completed', (e) => {
      lms.marquerModuleTermine(e.detail.score, e.detail.maxScore)
    })
</script>`}</pre>
      )}

      <div style={styles.disposition}>
        <article style={styles.cours}>
          <h2 style={styles.h2}>Objectifs de la séquence</h2>
          <p style={styles.paragraphe}>
            À l’issue de ce module, vous saurez énoncer les quatre étapes de la consignation
            électrique dans l’ordre, nommer les cinq organes d’une pompe centrifuge et appliquer un
            couple de serrage conforme à la fiche technique.
          </p>

          <h2 style={styles.h2}>Activité — l’atelier virtuel</h2>
          <p style={styles.paragraphe}>
            Parcourez l’atelier ci-dessous et consultez les six postes obligatoires, puis passez
            l’évaluation au poste 8. Vous pouvez revenir à cette page à tout moment : votre
            progression est enregistrée.
          </p>

          <div ref={conteneur} style={styles.embarque}>
            <rarv-lab environment="atelier-maintenance-01" height="600" />
          </div>

          <p style={styles.mentions}>
            <Link to="/atelier" style={styles.lien}>
              Ouvrir l’atelier en plein écran <LuExternalLink size={12} aria-hidden="true" />
            </Link>
          </p>
        </article>

        <aside style={styles.panneau}>
          <h2 style={styles.panneauTitre}>Suivi de la plateforme</h2>
          <p style={styles.panneauAide}>
            Ce bloc est alimenté <strong>uniquement</strong> par les messages reçus de l’iframe. La
            page de leçon n’interroge aucune API.
          </p>

          <dl style={styles.suivi}>
            <Ligne
              cle="Composant"
              valeur={etat.pret ? 'chargé' : 'en attente'}
              coche={etat.pret}
            />
            <Ligne cle="Progression" valeur={`${etat.completionPct} %`} coche={etat.completionPct > 0} />
            <Ligne
              cle="Postes terminés"
              valeur={String(etat.postesTermines)}
              coche={etat.postesTermines > 0}
            />
            <Ligne
              cle="Postes requis restants"
              valeur={etat.requisRestants > 0 ? String(etat.requisRestants) : '—'}
              coche={etat.pret && etat.requisRestants === 0}
            />
            <Ligne
              cle="Évaluation"
              valeur={etat.score ? `${etat.score.score} / ${etat.score.maxScore}` : 'non passée'}
              coche={etat.score?.passed ?? false}
            />
            <Ligne cle="Module validé" valeur={etat.termine ? 'oui' : 'non'} coche={etat.termine} />
          </dl>

          <div style={styles.piste} aria-hidden="true">
            <div style={{ ...styles.jauge, width: `${etat.completionPct}%` }} />
          </div>

          <h3 style={styles.journalTitre}>Messages reçus</h3>
          {journal.length === 0 ? (
            <p style={styles.journalVide}>
              Aucun message pour l’instant. Entrez dans l’atelier et consultez un poste.
            </p>
          ) : (
            <ul style={styles.journal}>
              {journal.map((entree, index) => (
                <li key={`${entree}-${index}`} style={styles.journalLigne}>
                  {entree}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Page>
  )
}

function Ligne({ cle, valeur, coche }: { cle: string; valeur: string; coche: boolean }) {
  const Icone = coche ? LuCircleCheck : LuCircleDashed

  return (
    <div style={styles.ligne}>
      <dt style={styles.ligneCle}>
        {/* Icône + libellé : l'état ne repose jamais sur la couleur seule. */}
        <Icone
          size={14}
          style={{ color: coche ? 'var(--ok)' : 'var(--texte-doux)', flexShrink: 0 }}
          aria-hidden="true"
        />
        {cle}
      </dt>
      <dd style={styles.ligneValeur}>{valeur}</dd>
    </div>
  )
}

function horodatage(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour12: false })
}

const styles: Record<string, React.CSSProperties> = {
  disposition: {
    display: 'grid',
    gap: 20,
    gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 300px)',
    alignItems: 'start',
  },
  cours: { minWidth: 0 },
  h2: { margin: '0 0 7px', fontSize: 15.5, fontWeight: 700 },
  paragraphe: { margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.7, color: 'var(--texte-doux)', maxWidth: '64ch' },
  embarque: { margin: '0 0 12px' },
  mentions: { margin: 0, fontSize: 12 },
  lien: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: 'var(--accent)',
    textDecoration: 'none',
  },
  panneau: {
    position: 'sticky',
    top: 16,
    padding: '16px 17px 18px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.55)',
  },
  panneauTitre: { margin: 0, fontSize: 14, fontWeight: 700 },
  panneauAide: { margin: '5px 0 14px', fontSize: 11.5, lineHeight: 1.55, color: 'var(--texte-doux)' },
  suivi: { margin: 0, display: 'grid', gap: 7, fontSize: 12.5 },
  ligne: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  ligneCle: { margin: 0, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--texte-doux)' },
  ligneValeur: { margin: 0, fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  piste: {
    height: 5,
    margin: '14px 0 4px',
    borderRadius: 3,
    background: 'rgb(148 163 184 / 0.15)',
    overflow: 'hidden',
  },
  jauge: { height: '100%', background: 'var(--accent)', transition: 'width 400ms' },
  journalTitre: {
    margin: '16px 0 6px',
    fontSize: 10.5,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  journal: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 3 },
  journalLigne: { fontSize: 11, color: 'var(--texte-doux)', fontVariantNumeric: 'tabular-nums' },
  journalVide: { margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--texte-doux)' },
  bouton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 12.5,
    cursor: 'pointer',
  },
  code: {
    margin: 0,
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid var(--bordure)',
    background: 'rgb(2 6 16 / 0.6)',
    fontSize: 11.5,
    lineHeight: 1.65,
    overflowX: 'auto',
  },
}
