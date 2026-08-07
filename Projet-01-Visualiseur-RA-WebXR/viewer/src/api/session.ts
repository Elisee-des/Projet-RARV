/** Suivi de session — étape 4.8, s'appuyant sur les endpoints du Lot 2. */

export type TypeEvenement =
  | 'model_loaded'
  | 'model_placed'
  | 'ar_entered'
  | 'ar_exited'
  | 'annotation_opened'
  | 'annotation_closed'
  | 'completed'

export type Evenement = {
  type: TypeEvenement
  payload?: Record<string, unknown>
  occurredAt?: string
}

export type TypeAppareil = 'desktop' | 'android' | 'ios' | 'other'

/**
 * Récupère le jeton viewer.
 *
 * En production, le serveur du LMS l'a déjà placé dans l'URL de l'iframe
 * (`?t=…`). En développement, on retombe sur la route locale qui le fabrique.
 */
export async function obtenirJeton(slug: string, signal?: AbortSignal): Promise<string> {
  const depuisUrl = new URLSearchParams(window.location.search).get('t')
  if (depuisUrl) return depuisUrl

  const reponse = await fetch(
    `/api/dev/viewer-token?slug=${encodeURIComponent(slug)}`,
    { signal, headers: { Accept: 'application/json' } }
  )

  if (!reponse.ok) {
    throw new Error(
      "Aucun jeton dans l'URL et la route de développement est indisponible."
    )
  }

  const { token } = (await reponse.json()) as { token: string }

  return token
}

export async function ouvrirSession(
  jeton: string,
  infos: { deviceType: TypeAppareil; xrSupported: boolean },
  signal?: AbortSignal
): Promise<string> {
  const reponse = await fetch('/api/sessions', {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify(infos),
  })

  if (!reponse.ok) throw new Error(`Ouverture de session refusée (${reponse.status}).`)

  const { sessionId } = (await reponse.json()) as { sessionId: string }

  return sessionId
}

/**
 * Envoi groupé. `keepalive` permet à la requête d'aboutir même si l'onglet
 * se ferme dans la foulée — indispensable pour ne pas perdre les derniers
 * événements d'une session.
 */
export async function envoyerEvenements(
  jeton: string,
  sessionId: string,
  events: Evenement[],
  keepalive = false
): Promise<void> {
  if (events.length === 0) return

  await fetch(`/api/sessions/${sessionId}/events`, {
    method: 'POST',
    keepalive,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify({ events }),
  })
}

export async function cloturerSession(
  jeton: string,
  sessionId: string,
  keepalive = false
): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    keepalive,
    headers: { Accept: 'application/json', Authorization: `Bearer ${jeton}` },
  })
}

/** Sert à renseigner `device_type` côté serveur. */
export function detecterAppareil(): TypeAppareil {
  const ua = navigator.userAgent

  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/mobile/i.test(ua)) return 'other'

  return 'desktop'
}
