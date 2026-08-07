import { appelApi } from './client'

/**
 * Étapes 6.1 à 6.5 — Client du quiz noté.
 *
 * 🔒 **Ce module ne sait pas ce qu'est une bonne réponse, et c'est voulu.**
 * `Question` n'a aucun champ de correction : le type l'inscrit dans le code.
 * Les réponses attendues n'apparaissent que dans `Resultat`, c'est-à-dire
 * APRÈS soumission, quand la tentative est déjà verrouillée côté serveur.
 * C'est la décision D5, rendue visible à la lecture.
 */

export type TypeQuestion = 'single' | 'multiple' | 'truefalse'

export interface Choix {
  id: number
  label: string
}

export interface Question {
  id: number
  order: number
  type: TypeQuestion
  statement: string
  points: number
  multiple: boolean
  choices: Choix[]
}

export interface Quiz {
  id: number
  title: string
  passScore: number
  maxAttempts: number
  timeLimitS: number | null
  shuffleQuestions: boolean
  maxScore: number
  questionCount: number
  questions: Question[]
}

export interface Tentative {
  attemptId: string
  attemptNumber: number
  attemptsRemaining: number
  startedAt: string
  timeLimitS: number | null
  /** Calculé par le SERVEUR : un rechargement ne rend pas de temps. */
  timeRemainingS: number | null
  resumed: boolean
}

export interface Resultat {
  questionId: number
  statement: string
  points: number
  pointsEarned: number
  correct: boolean
  chosenChoiceIds: number[]
  expectedChoiceIds: number[]
  explanation: string | null
  sourcePointCode: string | null
  objectiveCode: string | null
}

export interface Correction {
  attemptId: string
  submittedAt: string
  score: number
  maxScore: number
  percentage: number
  passScore: number
  passed: boolean
  timedOut: boolean
  attemptNumber: number
  attemptsRemaining: number
  results: Resultat[]
}

const entetes = (jeton: string) => ({ Authorization: `Bearer ${jeton}` })

export async function chargerQuiz(jeton: string, id: number): Promise<Quiz> {
  const { data } = await appelApi<{ data: Quiz }>(`/quizzes/${id}`, { headers: entetes(jeton) })

  return data
}

export function ouvrirTentative(jeton: string, quizId: number, sessionId?: string | null): Promise<Tentative> {
  return appelApi<Tentative>('/attempts', {
    method: 'POST',
    headers: entetes(jeton),
    body: JSON.stringify({ quizId, sessionId: sessionId ?? undefined }),
  })
}

export function soumettreTentative(
  jeton: string,
  attemptId: string,
  reponses: Record<number, number[]>
): Promise<Correction> {
  return appelApi<Correction>(`/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: entetes(jeton),
    body: JSON.stringify({
      answers: Object.entries(reponses).map(([questionId, choiceIds]) => ({
        questionId: Number(questionId),
        choiceIds,
      })),
    }),
  })
}

/**
 * Mélange de Fisher-Yates.
 *
 * Le serveur expose `shuffleQuestions` mais ne mélange pas lui-même : l'ordre
 * est une affaire de présentation, et le mélanger côté serveur obligerait à
 * mémoriser une permutation par tentative pour survivre à un rechargement.
 * Les réponses étant indexées par identifiant de question, l'ordre d'affichage
 * n'a aucune incidence sur la correction.
 */
export function melanger<T>(elements: T[]): T[] {
  const copie = [...elements]

  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }

  return copie
}
