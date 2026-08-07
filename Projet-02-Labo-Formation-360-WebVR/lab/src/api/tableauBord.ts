import { appelApi } from './client'

/**
 * Étapes 9.5 à 9.7 — Client du tableau de bord formateur et du journal xAPI.
 *
 * Aucun en-tête d'authentification : en mode démonstration (`RARV_DEMO_PUBLIC`),
 * le serveur ouvre ces endpoints et pseudonymise les identifiants d'apprenants.
 * Hors démonstration, il exige `X-Dashboard-Secret` et ces appels échouent en
 * 401 — ce que les pages traitent comme un écran d'explication, pas comme une
 * panne.
 */

export interface PosteStat {
  code: string
  label: string
  activityType: string
  required: boolean
  visits: number
  completions: number
  visitRate: number
}

export interface StatsQuiz {
  quizId: number
  tentatives: number
  apprenants: number
  reussites: number
  tauxReussite: number
  scoreMoyen: number
  horsDelai: number
}

export interface TableauEnvironnement {
  environment: { slug: string; title: string }
  cohorte: {
    apprenants: number
    termines: number
    tauxCompletion: number
    progressionMoyennePct: number
    tempsMoyenMs: number
  }
  quiz: StatsQuiz | null
  postes: PosteStat[]
}

export interface QuestionStat {
  questionId: number
  order: number
  statement: string
  type: string
  sourcePointCode: string | null
  objectiveCode: string | null
  answered: number
  correct: number
  failureRate: number
}

export interface TableauQuiz {
  quiz: { id: number; title: string; passScore: number }
  tentatives: StatsQuiz
  questions: QuestionStat[]
}

export interface DeclarationXapi {
  id: string
  verb: string
  verbCourt: string
  objectIri: string
  acteur: string
  etat: string
  emiseA: string | null
  statement: Record<string, unknown> | null
}

export interface JournalXapi {
  driver: string
  endpoint: string | null
  iri: string
  pseudonymise: boolean
  total: number
  parVerbe: Record<string, number>
  statements: DeclarationXapi[]
}

export const ENVIRONNEMENT = 'atelier-maintenance-01'

export function chargerTableauEnvironnement(): Promise<TableauEnvironnement> {
  return appelApi<TableauEnvironnement>(`/dashboard/environments/${ENVIRONNEMENT}`)
}

export function chargerTableauQuiz(quizId: number): Promise<TableauQuiz> {
  return appelApi<TableauQuiz>(`/dashboard/quizzes/${quizId}`)
}

export function chargerJournalXapi(limite = 60): Promise<JournalXapi> {
  return appelApi<JournalXapi>(`/dashboard/xapi?limit=${limite}`)
}

/** URL d'export CSV — un lien direct suffit, la route est ouverte en démonstration. */
export function urlExportCsv(): string {
  return `/api/dashboard/environments/${ENVIRONNEMENT}/export.csv`
}
