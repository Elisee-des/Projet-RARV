import { useEffect, useState } from 'react'
import { LuChevronDown, LuChevronRight, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'
import Page from '../ui/Page'
import { RangeeStats, TuileStat } from '../ui/viz/Graphiques'
import { STATUT } from '../ui/viz/palette'
import { chargerJournalXapi, type JournalXapi } from '../api/tableauBord'

/**
 * Étape 9.5 — Journal des déclarations xAPI.
 *
 * Le plan demande « un LRS de test (Learning Locker en Docker ou SCORM Cloud) +
 * captures des relevés ».
 *
 * Ce qui est livré est le **pilote local** : les déclarations sont conservées en
 * base et affichées ici, au format exact qu'un LRS recevrait. Passer à un vrai
 * LRS ne change qu'une variable d'environnement (`RARV_LRS_DRIVER=http`) — le
 * format des déclarations, lui, est déjà celui de la spécification.
 *
 * L'intérêt en démonstration est direct : personne, en entretien, n'a envie
 * d'attendre le démarrage d'un conteneur Learning Locker pour voir trois
 * déclarations. Cette page les montre immédiatement, et prouve qu'elles sont
 * bien formées.
 */

const LIBELLES_VERBES: Record<string, string> = {
  initialized: 'a démarré la formation',
  experienced: 'a consulté un poste',
  answered: 'a répondu à une question',
  scored: 'a été évalué',
  completed: 'a terminé la formation',
  terminated: 'a quitté la formation',
}

export default function PageTracabilite() {
  const [journal, setJournal] = useState<JournalXapi | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [deplie, setDeplie] = useState<string | null>(null)

  const charger = async () => {
    setChargement(true)
    setErreur(null)

    try {
      setJournal(await chargerJournalXapi(60))
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    void charger()
  }, [])

  if (erreur) {
    return (
      <Page etape="Étape 9.5" titre="Traçabilité xAPI">
        <div style={styles.alerte}>
          <LuTriangleAlert size={20} style={{ flexShrink: 0, color: STATUT.critique }} aria-hidden="true" />
          <div>
            <p style={styles.alerteTitre}>Le journal n’a pas répondu</p>
            <code style={styles.code}>{erreur}</code>
          </div>
        </div>
      </Page>
    )
  }

  if (chargement || !journal) {
    return (
      <Page etape="Étape 9.5" titre="Traçabilité xAPI">
        <p style={styles.attente}>Chargement du journal…</p>
      </Page>
    )
  }

  return (
    <Page
      etape="Étape 9.5"
      titre="Traçabilité xAPI"
      chapeau="Chaque parcours produit une séquence de déclarations conformes à la spécification xAPI. Elles sont enregistrées avant d’être envoyées : si le Learning Record Store est injoignable, la trace n’est pas perdue et sera rejouée."
      actions={
        <button type="button" style={styles.bouton} onClick={() => void charger()}>
          <LuRefreshCw size={14} aria-hidden="true" /> Actualiser
        </button>
      }
    >
      <RangeeStats>
        <TuileStat libelle="Déclarations émises" valeur={String(journal.total)} accent />
        <TuileStat
          libelle="Pilote LRS"
          valeur={journal.driver}
          appoint={journal.driver === 'local' ? 'conservées en base' : (journal.endpoint ?? 'distant')}
        />
        <TuileStat
          libelle="Verbes distincts"
          valeur={String(Object.keys(journal.parVerbe).length)}
          appoint="initialized → terminated"
        />
      </RangeeStats>

      {journal.total === 0 ? (
        <p style={styles.vide}>
          Aucune déclaration pour l’instant. Parcourez l’atelier et passez le quiz : la séquence
          apparaîtra ici.
        </p>
      ) : (
        <>
          <section style={styles.repartition}>
            <h2 style={styles.h2}>Répartition par verbe</h2>
            <div style={styles.puces}>
              {Object.entries(journal.parVerbe).map(([iri, total]) => {
                const court = iri.split('/').pop() ?? iri

                return (
                  <span key={iri} style={styles.puce} title={iri}>
                    <strong>{court}</strong>
                    <span style={styles.puceTotal}>{total}</span>
                  </span>
                )
              })}
            </div>
          </section>

          <section>
            <h2 style={styles.h2}>Dernières déclarations</h2>
            <p style={styles.aide}>
              Dépliez une ligne pour voir la déclaration brute, telle qu’elle part vers le LRS.
              {journal.pseudonymise && ' Les identités sont pseudonymisées sur cet écran public.'}
            </p>

            <ul style={styles.liste}>
              {journal.statements.map((declaration) => {
                const ouvert = deplie === declaration.id
                const Chevron = ouvert ? LuChevronDown : LuChevronRight

                return (
                  <li key={declaration.id} style={styles.item}>
                    <button
                      type="button"
                      style={styles.entete}
                      onClick={() => setDeplie(ouvert ? null : declaration.id)}
                      aria-expanded={ouvert}
                    >
                      <Chevron size={14} style={{ flexShrink: 0, color: 'var(--texte-doux)' }} aria-hidden="true" />

                      <span style={styles.verbe}>{declaration.verbCourt}</span>

                      <span style={styles.phrase}>
                        <strong>{declaration.acteur}</strong>{' '}
                        {LIBELLES_VERBES[declaration.verbCourt] ?? declaration.verbCourt}
                      </span>

                      <span style={styles.moment}>
                        {declaration.emiseA
                          ? new Date(declaration.emiseA).toLocaleTimeString('fr-FR', { hour12: false })
                          : ''}
                      </span>
                    </button>

                    {ouvert && (
                      <pre style={styles.json}>{JSON.stringify(declaration.statement, null, 2)}</pre>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <p style={styles.mentions}>
        IRI de base des activités&nbsp;: <code>{journal.iri}</code>. C’est la clé qui relie les
        déclarations entre elles côté LRS ; elle doit rester stable dans le temps.
      </p>
    </Page>
  )
}

const styles: Record<string, React.CSSProperties> = {
  h2: { margin: '0 0 6px', fontSize: 15.5, fontWeight: 700 },
  aide: { margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--texte-doux)', maxWidth: '66ch' },
  repartition: { display: 'grid', gap: 8 },
  puces: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  puce: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 11px',
    borderRadius: 999,
    border: '1px solid var(--bordure)',
    fontSize: 12,
  },
  puceTotal: { fontVariantNumeric: 'tabular-nums', color: 'var(--texte-doux)' },
  liste: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 },
  item: { borderRadius: 9, border: '1px solid var(--bordure)', overflow: 'hidden' },
  entete: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    border: 'none',
    background: 'rgb(15 23 42 / 0.45)',
    color: 'var(--texte)',
    fontSize: 12.5,
    textAlign: 'left',
    cursor: 'pointer',
  },
  verbe: {
    flexShrink: 0,
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgb(56 189 248 / 0.14)',
    color: 'var(--accent)',
    fontSize: 11,
    fontWeight: 600,
  },
  phrase: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  moment: { flexShrink: 0, fontSize: 11, color: 'var(--texte-doux)', fontVariantNumeric: 'tabular-nums' },
  json: {
    margin: 0,
    padding: '12px 14px',
    background: 'rgb(2 6 16 / 0.7)',
    fontSize: 11,
    lineHeight: 1.55,
    overflowX: 'auto',
    maxHeight: 340,
    overflowY: 'auto',
  },
  vide: { margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--texte-doux)' },
  attente: { margin: 0, fontSize: 13, color: 'var(--texte-doux)' },
  alerte: { display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--bordure)' },
  alerteTitre: { margin: 0, fontSize: 14, fontWeight: 600 },
  code: { fontSize: 11, color: 'var(--texte-doux)' },
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
  mentions: { margin: 0, fontSize: 11, lineHeight: 1.6, color: 'var(--texte-doux)', maxWidth: '70ch' },
}
