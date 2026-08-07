import { useCallback, useEffect, useRef, useState } from 'react'
import {
  chargerQuiz,
  melanger,
  ouvrirTentative,
  soumettreTentative,
  type Correction,
  type Question,
  type Quiz,
  type Tentative,
} from '../../api/quiz'

interface Props {
  jeton: string
  quizId: number
  sessionId: string | null
  onTerminer: () => void
  onFermer: () => void
  onSoumis?: (correction: Correction) => void
}

type Phase =
  | { nom: 'chargement' }
  | { nom: 'erreur'; message: string }
  | { nom: 'epuise'; message: string }
  | { nom: 'questions' }
  | { nom: 'resultat'; correction: Correction }

/**
 * Étapes 6.1 à 6.5 — Quiz noté.
 *
 * ## En HTML, par-dessus le canvas (6.1)
 *
 * Et non en texte 3D. Un quiz en texte 3D n'est ni accessible au lecteur
 * d'écran, ni navigable au clavier, ni testable par Playwright, ni lisible sur
 * un téléphone. Le seul contexte qui l'exigerait est la VR du Lot 8 — et c'est
 * précisément pourquoi ce lot est le plus cher du projet.
 *
 * ## Une question à la fois
 *
 * Avec dix questions et un chronomètre, tout afficher d'un coup produit un mur
 * de texte sur mobile et empêche de savoir où l'on en est. La barre de
 * progression et la navigation libre entre les questions donnent le contrôle
 * sans le désordre.
 *
 * ## Le chronomètre vient du SERVEUR (6.3)
 *
 * `timeRemainingS` est calculé à l'ouverture par le backend. Un rechargement de
 * page ne rend donc aucune seconde, et la soumission hors délai est de toute
 * façon annulée côté serveur. Le compte à rebours affiché n'est qu'un confort.
 */
export default function ModaleQuiz({
  jeton,
  quizId,
  sessionId,
  onTerminer,
  onFermer,
  onSoumis,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ nom: 'chargement' })
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [tentative, setTentative] = useState<Tentative | null>(null)
  const [ordre, setOrdre] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [reponses, setReponses] = useState<Record<number, number[]>>({})
  const [restant, setRestant] = useState<number | null>(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const soumettreRef = useRef<() => void>(() => {})

  /* -------------------------------------------------------------- *
   * Ouverture
   * -------------------------------------------------------------- */
  useEffect(() => {
    let annule = false

    const demarrer = async () => {
      try {
        const charge = await chargerQuiz(jeton, quizId)
        const ouverte = await ouvrirTentative(jeton, quizId, sessionId)

        if (annule) return

        setQuiz(charge)
        setTentative(ouverte)
        setOrdre(charge.shuffleQuestions ? melanger(charge.questions) : charge.questions)
        setRestant(ouverte.timeRemainingS)
        setPhase({ nom: 'questions' })
      } catch (erreur) {
        if (annule) return

        const message = (erreur as Error).message

        // 409 : `max_attempts` épuisé. Ce n'est pas une panne, c'est une règle
        // — et elle mérite un message qui l'explique, pas une erreur technique.
        setPhase(
          message.includes('409')
            ? { nom: 'epuise', message: 'Vous avez utilisé toutes vos tentatives pour ce quiz.' }
            : { nom: 'erreur', message }
        )
      }
    }

    void demarrer()

    return () => {
      annule = true
    }
  }, [jeton, quizId, sessionId])

  /* -------------------------------------------------------------- *
   * Soumission
   * -------------------------------------------------------------- */
  const soumettre = useCallback(async () => {
    if (!tentative || envoiEnCours) return

    setEnvoiEnCours(true)

    try {
      const correction = await soumettreTentative(jeton, tentative.attemptId, reponses)

      setPhase({ nom: 'resultat', correction })
      onSoumis?.(correction)

      // La complétion du poste ne dépend PAS de la réussite : avoir passé le
      // quiz suffit à marquer le poste terminé. Le seuil de 70 %, lui, est une
      // condition distincte, vérifiée par le serveur pour la complétion du
      // parcours (étape 7.4).
      onTerminer()
    } catch (erreur) {
      setPhase({ nom: 'erreur', message: (erreur as Error).message })
    } finally {
      setEnvoiEnCours(false)
    }
  }, [envoiEnCours, jeton, onSoumis, onTerminer, reponses, tentative])

  soumettreRef.current = () => void soumettre()

  /* -------------------------------------------------------------- *
   * Chronomètre (6.3)
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (phase.nom !== 'questions' || restant === null) return

    if (restant <= 0) {
      // Temps écoulé : on soumet ce qui existe. Le serveur annulera la
      // tentative, mais l'apprenant voit un écran de résultat plutôt qu'une
      // modale figée sans explication.
      soumettreRef.current()
      return
    }

    const minuteur = setTimeout(() => setRestant((s) => (s === null ? null : s - 1)), 1000)

    return () => clearTimeout(minuteur)
  }, [phase.nom, restant])

  /* -------------------------------------------------------------- *
   * Rendu
   * -------------------------------------------------------------- */

  if (phase.nom === 'chargement') {
    return <Enveloppe titre="Évaluation"><p style={styles.info}>Ouverture de la tentative…</p></Enveloppe>
  }

  if (phase.nom === 'erreur') {
    return (
      <Enveloppe titre="Évaluation">
        <p style={styles.erreur}>Le quiz n'a pas pu être chargé.</p>
        <pre style={styles.detail}>{phase.message}</pre>
        <button type="button" style={styles.secondaire} onClick={onFermer}>Fermer</button>
      </Enveloppe>
    )
  }

  if (phase.nom === 'epuise') {
    return (
      <Enveloppe titre="Évaluation">
        <p style={styles.info}>{phase.message}</p>
        <button type="button" style={styles.principal} onClick={onFermer}>Fermer</button>
      </Enveloppe>
    )
  }

  if (phase.nom === 'resultat') {
    return <EcranResultat correction={phase.correction} onFermer={onFermer} />
  }

  if (!quiz || !tentative) return null

  const question = ordre[index]
  const repondues = Object.values(reponses).filter((c) => c.length > 0).length
  const derniere = index === ordre.length - 1

  const basculer = (choixId: number) => {
    setReponses((actuelles) => {
      const cochees = actuelles[question.id] ?? []

      // Choix unique et vrai/faux : la nouvelle case remplace l'ancienne.
      // Cocher deux cases y est une réponse invalide, pas une réponse partielle
      // — autant l'empêcher plutôt que de laisser l'apprenant perdre 2 points.
      if (!question.multiple) return { ...actuelles, [question.id]: [choixId] }

      return {
        ...actuelles,
        [question.id]: cochees.includes(choixId)
          ? cochees.filter((id) => id !== choixId)
          : [...cochees, choixId],
      }
    })
  }

  return (
    <Enveloppe
      titre={quiz.title}
      entete={
        <div style={styles.barreEntete}>
          <span style={styles.compteur}>
            Question {index + 1} / {ordre.length}
          </span>
          {restant !== null && <Chronometre secondes={restant} />}
        </div>
      }
    >
      <div style={styles.piste} aria-hidden="true">
        <div style={{ ...styles.jauge, width: `${(repondues / ordre.length) * 100}%` }} />
      </div>

      <fieldset style={styles.groupe}>
        <legend style={styles.enonce}>{question.statement}</legend>

        <p style={styles.consigne}>
          {question.multiple
            ? 'Plusieurs réponses attendues — tout ou rien.'
            : 'Une seule réponse.'}{' '}
          {question.points} point{question.points > 1 ? 's' : ''}
        </p>

        <div style={styles.choix}>
          {question.choices.map((choix) => {
            const cochee = (reponses[question.id] ?? []).includes(choix.id)

            return (
              <label
                key={choix.id}
                style={{ ...styles.option, ...(cochee ? styles.optionCochee : null) }}
              >
                <input
                  type={question.multiple ? 'checkbox' : 'radio'}
                  name={`question-${question.id}`}
                  checked={cochee}
                  onChange={() => basculer(choix.id)}
                  style={styles.case}
                />
                <span>{choix.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <nav style={styles.navigation}>
        <button
          type="button"
          style={styles.secondaire}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          ← Précédente
        </button>

        {derniere ? (
          <button
            type="button"
            style={styles.principal}
            onClick={() => void soumettre()}
            disabled={envoiEnCours}
          >
            {envoiEnCours ? 'Correction en cours…' : `Terminer — ${repondues} / ${ordre.length} répondues`}
          </button>
        ) : (
          <button
            type="button"
            style={styles.principal}
            onClick={() => setIndex((i) => Math.min(ordre.length - 1, i + 1))}
          >
            Suivante →
          </button>
        )}
      </nav>

      <p style={styles.pied}>
        Tentative {tentative.attemptNumber} sur {quiz.maxAttempts} · seuil de réussite{' '}
        {quiz.passScore} % · {quiz.maxScore} points au total
      </p>
    </Enveloppe>
  )
}

/* ------------------------------------------------------------------ *
 * Écran de résultat (6.4 / 6.5)
 * ------------------------------------------------------------------ */

function EcranResultat({ correction, onFermer }: { correction: Correction; onFermer: () => void }) {
  const rates = correction.results.filter((r) => !r.correct)

  return (
    <Enveloppe titre={correction.passed ? 'Évaluation réussie' : 'Évaluation non validée'}>
      {correction.timedOut && (
        <p style={styles.erreur}>
          ⏱ Temps écoulé — la tentative a été annulée par le serveur et compte pour zéro.
        </p>
      )}

      <div style={{ ...styles.score, borderColor: correction.passed ? 'var(--ok)' : 'var(--erreur)' }}>
        <strong style={styles.scoreValeur}>
          {correction.score} / {correction.maxScore}
        </strong>
        <span style={styles.scorePct}>
          {correction.percentage} % — seuil {correction.passScore} %
        </span>
      </div>

      <p style={styles.info}>
        {correction.passed
          ? 'Vous avez validé cette évaluation.'
          : correction.attemptsRemaining > 0
            ? `Il vous reste ${correction.attemptsRemaining} tentative${correction.attemptsRemaining > 1 ? 's' : ''}. Rouvrez le poste d'évaluation pour recommencer.`
            : 'Vous avez utilisé toutes vos tentatives.'}
      </p>

      {/* 6.4 — les explications, question par question. C'est le retour
          pédagogique : le serveur ne les envoie qu'après soumission. */}
      <h3 style={styles.sousTitre}>
        {rates.length === 0 ? 'Toutes les réponses sont justes' : `${rates.length} question${rates.length > 1 ? 's' : ''} à revoir`}
      </h3>

      <ol style={styles.resultats}>
        {correction.results.map((resultat) => (
          <li
            key={resultat.questionId}
            style={{
              ...styles.resultat,
              borderLeftColor: resultat.correct ? 'var(--ok)' : 'var(--erreur)',
            }}
          >
            <p style={styles.resultatEnonce}>
              <span aria-hidden="true">{resultat.correct ? '✓' : '✕'}</span> {resultat.statement}
            </p>

            <p style={styles.resultatPoints}>
              {resultat.pointsEarned} / {resultat.points} point{resultat.points > 1 ? 's' : ''}
              {resultat.sourcePointCode && ` · à revoir au poste ${resultat.sourcePointCode}`}
            </p>

            {resultat.explanation && <p style={styles.explication}>{resultat.explanation}</p>}
          </li>
        ))}
      </ol>

      <button type="button" style={styles.principal} onClick={onFermer}>
        Retour à l'atelier
      </button>
    </Enveloppe>
  )
}

/* ------------------------------------------------------------------ *
 * Pièces communes
 * ------------------------------------------------------------------ */

function Chronometre({ secondes }: { secondes: number }) {
  const minutes = Math.floor(secondes / 60)
  const reste = secondes % 60
  const urgent = secondes <= 60

  return (
    <span
      style={{ ...styles.chrono, color: urgent ? 'var(--erreur)' : 'var(--texte)' }}
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
    >
      ⏱ {minutes}:{String(reste).padStart(2, '0')}
    </span>
  )
}

function Enveloppe({
  titre,
  entete,
  children,
}: {
  titre: string
  entete?: React.ReactNode
  children: React.ReactNode
}) {
  const boite = useRef<HTMLDivElement>(null)

  useEffect(() => {
    boite.current?.focus()
  }, [])

  return (
    <div ref={boite} tabIndex={-1} style={styles.contenu}>
      <h2 style={styles.titre}>{titre}</h2>
      {entete}
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  contenu: { display: 'grid', gap: 14, outline: 'none' },
  titre: { margin: 0, fontSize: 16, fontWeight: 700 },
  barreEntete: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  compteur: { fontSize: 12, color: 'var(--texte-doux)' },
  chrono: { fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },

  piste: { height: 4, borderRadius: 2, background: 'rgb(148 163 184 / 0.2)', overflow: 'hidden' },
  jauge: { height: '100%', background: 'var(--accent)', transition: 'width 200ms' },

  groupe: { border: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 },
  enonce: { padding: 0, fontSize: 14.5, lineHeight: 1.5, fontWeight: 600 },
  consigne: { margin: 0, fontSize: 11.5, color: 'var(--texte-doux)' },
  choix: { display: 'grid', gap: 7 },
  option: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 9,
    border: '1px solid var(--bordure)',
    fontSize: 13.5,
    lineHeight: 1.45,
    cursor: 'pointer',
  },
  optionCochee: { borderColor: 'var(--accent)', background: 'rgb(56 189 248 / 0.12)' },
  case: { marginTop: 3, accentColor: 'var(--accent)', flexShrink: 0 },

  navigation: { display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' },
  principal: {
    flex: 1,
    minWidth: 150,
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 13,
    fontWeight: 600,
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

  score: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 10,
    border: '2px solid',
  },
  scoreValeur: { fontSize: 24, fontVariantNumeric: 'tabular-nums' },
  scorePct: { fontSize: 13, color: 'var(--texte-doux)' },

  sousTitre: { margin: 0, fontSize: 13, fontWeight: 600 },
  resultats: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 },
  resultat: { padding: '9px 12px', borderLeft: '3px solid', borderRadius: '0 8px 8px 0', background: 'rgb(148 163 184 / 0.08)' },
  resultatEnonce: { margin: 0, fontSize: 13, lineHeight: 1.45, fontWeight: 600 },
  resultatPoints: { margin: '3px 0 0', fontSize: 11, color: 'var(--texte-doux)' },
  explication: { margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--texte-doux)' },

  info: { margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--texte-doux)' },
  erreur: { margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--erreur)' },
  detail: {
    margin: 0,
    padding: 10,
    borderRadius: 8,
    background: 'rgb(148 163 184 / 0.12)',
    fontSize: 11,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  pied: { margin: 0, fontSize: 11, color: 'var(--texte-doux)' },
}
