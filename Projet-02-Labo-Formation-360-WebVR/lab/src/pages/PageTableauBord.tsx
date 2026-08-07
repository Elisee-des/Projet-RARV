import { useEffect, useState } from 'react'
import { LuDownload, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'
import Page from '../ui/Page'
import { BarresHorizontales, Cartouche, RangeeStats, TuileStat, type Barre } from '../ui/viz/Graphiques'
import { STATUT } from '../ui/viz/palette'
import {
  chargerTableauEnvironnement,
  chargerTableauQuiz,
  urlExportCsv,
  type TableauEnvironnement,
  type TableauQuiz,
} from '../api/tableauBord'

/**
 * Étapes 9.6 et 9.7 — Tableau de bord formateur.
 *
 * > « C'est un tableau de bord qui répond à une question de formateur, pas une
 * > jauge décorative. »
 *
 * Deux questions, deux graphiques :
 *
 * 1. **Quelle question est la plus ratée, et de quel poste vient-elle ?** Le
 *    lien vers le poste est ce qui rend l'écran actionnable : il ne dit pas
 *    seulement que ça rate, il dit *où retravailler*.
 * 2. **Quels postes personne ne visite ?** Les deux postes facultatifs ont été
 *    placés à l'écart du parcours et portent chacun une question du quiz — leur
 *    faible fréquentation devrait donc se lire dans les scores.
 */
export default function PageTableauBord() {
  const [environnement, setEnvironnement] = useState<TableauEnvironnement | null>(null)
  const [quiz, setQuiz] = useState<TableauQuiz | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  const charger = async () => {
    setChargement(true)
    setErreur(null)

    try {
      const donnees = await chargerTableauEnvironnement()
      setEnvironnement(donnees)

      if (donnees.quiz) setQuiz(await chargerTableauQuiz(donnees.quiz.quizId))
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
      <Page etape="Étape 9.6" titre="Tableau de bord formateur">
        <div style={styles.alerte}>
          <LuTriangleAlert size={20} style={{ flexShrink: 0, color: STATUT.critique }} aria-hidden="true" />
          <div>
            <p style={styles.alerteTitre}>Le tableau de bord n’a pas répondu</p>
            <p style={styles.alerteTexte}>
              {erreur.includes('401')
                ? 'L’accès est protégé par un secret partagé. En mode démonstration (RARV_DEMO_PUBLIC), il s’ouvre sans authentification.'
                : 'Vérifiez que l’API Laravel est démarrée sur le port 8000.'}
            </p>
            <code style={styles.code}>{erreur}</code>
          </div>
        </div>
      </Page>
    )
  }

  if (chargement || !environnement) {
    return (
      <Page etape="Étape 9.6" titre="Tableau de bord formateur">
        <p style={styles.attente}>Chargement des agrégats…</p>
      </Page>
    )
  }

  const { cohorte, postes } = environnement
  const minutes = Math.round(cohorte.tempsMoyenMs / 60_000)

  // Postes triés du moins visité au plus visité : le début de liste est ce que
  // le formateur doit regarder.
  const barresPostes: Barre[] = [...postes]
    .sort((a, b) => a.visitRate - b.visitRate)
    .map((poste) => ({
      cle: poste.code,
      libelle: poste.label,
      valeur: poste.visitRate,
      contexte: `${poste.code} · ${poste.required ? 'obligatoire' : 'facultatif'} · ${poste.visits} visite${poste.visits > 1 ? 's' : ''}`,
      detail: `${poste.completions} apprenant${poste.completions > 1 ? 's ont' : ' a'} terminé ce poste sur ${cohorte.apprenants}`,
    }))

  const barresQuestions: Barre[] =
    quiz?.questions.map((question) => ({
      cle: String(question.questionId),
      libelle: `Q${question.order} — ${question.statement}`,
      valeur: question.failureRate,
      contexte: question.sourcePointCode
        ? `À retravailler au poste ${question.sourcePointCode}${question.objectiveCode ? ` · objectif ${question.objectiveCode}` : ''}`
        : undefined,
      detail: `${question.answered - question.correct} erreur${question.answered - question.correct > 1 ? 's' : ''} sur ${question.answered} réponse${question.answered > 1 ? 's' : ''}`,
    })) ?? []

  const pire = quiz?.questions[0]

  return (
    <Page
      etape="Étape 9.6"
      titre="Tableau de bord formateur"
      chapeau={environnement.environment.title}
      actions={
        <>
          <button type="button" style={styles.bouton} onClick={() => void charger()}>
            <LuRefreshCw size={14} aria-hidden="true" /> Actualiser
          </button>
          <a href={urlExportCsv()} download style={styles.boutonPrincipal}>
            <LuDownload size={14} aria-hidden="true" /> Export CSV
          </a>
        </>
      }
    >
      <RangeeStats>
        <TuileStat
          libelle="Apprenants"
          valeur={String(cohorte.apprenants)}
          appoint={`${cohorte.termines} ont terminé`}
        />
        <TuileStat
          libelle="Taux de complétion"
          valeur={`${cohorte.tauxCompletion} %`}
          appoint={`progression moyenne ${cohorte.progressionMoyennePct} %`}
          accent
        />
        <TuileStat
          libelle="Score moyen"
          valeur={quiz ? `${quiz.tentatives.scoreMoyen} / 20` : '—'}
          appoint={quiz ? `${quiz.tentatives.tauxReussite} % de réussite` : 'aucune tentative'}
        />
        <TuileStat
          libelle="Temps moyen"
          valeur={`${minutes} min`}
          appoint={quiz ? `${quiz.tentatives.tentatives} tentative${quiz.tentatives.tentatives > 1 ? 's' : ''}` : undefined}
        />
      </RangeeStats>

      {/* ⭐ L'écran de démonstration : la phrase que le plan veut pouvoir dire. */}
      {pire && pire.answered > 0 && (
        <p style={styles.constat}>
          <strong>{pire.failureRate} %</strong> des apprenants ratent la question{' '}
          <strong>« {pire.statement} »</strong>
          {pire.sourcePointCode && (
            <>
              {' '}
              — elle est enseignée au poste <strong>{pire.sourcePointCode}</strong>.
            </>
          )}
        </p>
      )}

      <Cartouche
        titre="Questions les plus ratées"
        legende="Taux d’erreur par question, du plus élevé au plus faible. Chaque question renvoie au poste qui l’enseigne : c’est ce lien qui rend l’écran actionnable."
      >
        <BarresHorizontales
          barres={barresQuestions}
          unite=" %"
          maximum={100}
          vide="Aucune tentative soumise pour l’instant. Passez le quiz depuis l’atelier, puis revenez ici."
        />
      </Cartouche>

      <Cartouche
        titre="Postes les moins visités"
        legende="Part des apprenants ayant approché chaque poste. Les deux postes facultatifs sont volontairement placés à l’écart du parcours, et portent chacun une question du quiz."
      >
        <BarresHorizontales
          barres={barresPostes}
          unite=" %"
          maximum={100}
          vide="Aucun apprenant n’a encore parcouru l’atelier."
        />
      </Cartouche>

      {quiz && quiz.tentatives.horsDelai > 0 && (
        <p style={styles.note}>
          {quiz.tentatives.horsDelai} tentative{quiz.tentatives.horsDelai > 1 ? 's ont' : ' a'} été
          annulée{quiz.tentatives.horsDelai > 1 ? 's' : ''} par le serveur pour dépassement du temps
          imparti.
        </p>
      )}

      <p style={styles.mentions}>
        Les identifiants d’apprenants sont pseudonymisés : cet écran est ouvert sans
        authentification pour la démonstration. En déploiement réel, il est protégé par un secret
        partagé et affiche les identités transmises par le LMS.
      </p>
    </Page>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  boutonPrincipal: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 12.5,
    fontWeight: 600,
    textDecoration: 'none',
  },
  constat: {
    margin: 0,
    padding: '13px 16px',
    borderRadius: 10,
    border: '1px solid rgb(56 189 248 / 0.3)',
    background: 'rgb(56 189 248 / 0.1)',
    fontSize: 13.5,
    lineHeight: 1.65,
  },
  attente: { margin: 0, fontSize: 13, color: 'var(--texte-doux)' },
  alerte: {
    display: 'flex',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
  },
  alerteTitre: { margin: 0, fontSize: 14, fontWeight: 600 },
  alerteTexte: { margin: '5px 0 8px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--texte-doux)' },
  code: { fontSize: 11, color: 'var(--texte-doux)' },
  note: { margin: 0, fontSize: 12, color: 'var(--texte-doux)' },
  mentions: { margin: 0, fontSize: 11, lineHeight: 1.6, color: 'var(--texte-doux)', maxWidth: '70ch' },
}
