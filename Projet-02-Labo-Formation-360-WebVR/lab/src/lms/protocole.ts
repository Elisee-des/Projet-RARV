/**
 * Étape 9.2 — Protocole `postMessage` entre l'iframe et la page hôte.
 *
 * Le contrat est **volontairement minuscule** : quatre messages sortants,
 * aucun entrant. Un LMS n'a pas à piloter la formation, seulement à savoir ce
 * qui s'y passe pour mettre à jour sa propre progression.
 *
 * ⚠️ Chaque message porte `source: 'rarv-lab'`. Une page de leçon héberge
 * souvent plusieurs iframes — vidéo, sondage, chat — et `window.message`
 * reçoit tout ce qui passe. Sans marqueur, l'hôte traiterait le message d'un
 * autre widget comme une progression de formation.
 */

export const SOURCE = 'rarv-lab' as const

export interface MessageReady {
  source: typeof SOURCE
  type: 'ready'
  environment: string
  title: string
  pointCount: number
}

export interface MessageProgress {
  source: typeof SOURCE
  type: 'progress'
  environment: string
  completionPct: number
  completedPoints: number
  requiredRemaining: number
}

export interface MessageScore {
  source: typeof SOURCE
  type: 'score'
  environment: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean
}

export interface MessageCompleted {
  source: typeof SOURCE
  type: 'completed'
  environment: string
  completionPct: number
  score: number | null
  maxScore: number | null
  completedAt: string | null
}

export type MessageRarv = MessageReady | MessageProgress | MessageScore | MessageCompleted

/** Sommes-nous chargés dans une iframe de LMS ? */
export function estEmbarque(): boolean {
  try {
    return window.self !== window.top
  } catch {
    // Un accès inter-origines lève : c'est donc bien qu'on est embarqué.
    return true
  }
}

/**
 * Émet un message vers la page hôte.
 *
 * ⚠️ `targetOrigin` vaut `'*'` **parce que le contenu est public**. Un vrai
 * déploiement LMS le restreindrait à l'origine de la page hôte, transmise à
 * l'iframe au lancement — sans quoi n'importe quelle page pourrait embarquer
 * la formation et lire la progression d'un apprenant. Ici, aucun de ces
 * messages ne contient de donnée personnelle : ni identité, ni jeton.
 */
export function emettre(message: MessageRarv): void {
  if (!estEmbarque()) return

  window.parent.postMessage(message, '*')
}

/** Écoute côté page hôte. Renvoie la fonction de désinscription. */
export function ecouter(surMessage: (message: MessageRarv) => void): () => void {
  const gestionnaire = (evenement: MessageEvent) => {
    const donnees = evenement.data

    // Le marqueur de source est ce qui rend l'écoute sûre sur une page qui
    // héberge plusieurs widgets.
    if (!donnees || typeof donnees !== 'object' || donnees.source !== SOURCE) return

    surMessage(donnees as MessageRarv)
  }

  window.addEventListener('message', gestionnaire)

  return () => window.removeEventListener('message', gestionnaire)
}
