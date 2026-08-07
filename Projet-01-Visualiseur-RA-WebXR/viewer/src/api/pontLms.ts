/**
 * Étape 7.2 — Pont avec la page hôte du LMS.
 *
 * Le viewer vit dans une iframe. Il informe la leçon de son état par
 * `postMessage`, sans jamais accéder au DOM du parent : c'est ce qui permet
 * de l'embarquer dans un LMS tiers sans y toucher.
 */

export type MessageLms =
  | { type: 'ready'; slug: string; annotations: number }
  | { type: 'progress'; consultees: number; total: number }
  | { type: 'completed'; slug: string }
  | { type: 'ar'; actif: boolean }
  | { type: 'error'; message: string }

/**
 * Origine autorisée du parent.
 *
 * Transmise par le composant hôte (`parentOrigin`), sinon déduite du
 * référent. On évite ainsi de diffuser en `*`, qui exposerait la progression
 * de l'apprenant à n'importe quelle page capable d'embarquer le viewer.
 */
function origineParent(): string | null {
  const declaree = new URLSearchParams(window.location.search).get('parentOrigin')
  if (declaree) return declaree

  try {
    if (document.referrer) return new URL(document.referrer).origin
  } catch {
    /* référent illisible */
  }

  return null
}

const ORIGINE = origineParent()

export function envoyerAuLms(message: MessageLms): void {
  // Hors iframe : rien à signaler.
  if (window.parent === window) return

  if (!ORIGINE) {
    console.warn("[lms] origine parent inconnue — message non envoyé", message.type)
    return
  }

  window.parent.postMessage({ source: 'rarv-viewer', ...message }, ORIGINE)
}
