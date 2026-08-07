import { cheminApplicatif } from './chemin'

/** Lot 6 — Bascule desktop → mobile. */

export type Bascule = {
  token: string
  url: string
  expiresIn: number
}

export type Reprise = {
  slug: string
  sessionId: string
  jeton: string
}

export type EtatSession = {
  sessionId: string
  enteredAr: boolean
  deviceType: string | null
  annotationsConsultees: number[]
  eventCount: number
  cloturee: boolean
  basculeUtilisee: boolean
}

/** Extrait le jeton d'une URL de reprise `/ar/{token}`, base de déploiement comprise. */
export function jetonBasculeDepuisUrl(): string | null {
  const trouve = /^\/ar\/([A-Za-z0-9]{16,})\/?$/.exec(cheminApplicatif())

  return trouve ? trouve[1] : null
}

/** Étape 6.1 — le desktop demande un lien de reprise. */
export async function creerBascule(jeton: string, sessionId: string): Promise<Bascule> {
  const reponse = await fetch('/api/handoff', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify({ sessionId }),
  })

  if (!reponse.ok) throw new Error(`Création du lien impossible (${reponse.status}).`)

  return reponse.json() as Promise<Bascule>
}

/**
 * Étape 6.3 — le mobile consomme le lien après scan.
 *
 * Usage unique : un second appel échoue en 410. C'est voulu — ce jeton
 * délivre un accès à la session, il ne doit pas rester valable.
 */
export async function consommerBascule(token: string): Promise<Reprise> {
  const reponse = await fetch(`/api/handoff/${encodeURIComponent(token)}/consume`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })

  if (reponse.status === 410) {
    throw new Error('Ce lien a déjà été utilisé ou a expiré. Régénérez un QR code depuis votre ordinateur.')
  }

  if (!reponse.ok) throw new Error('Lien de reprise invalide.')

  return reponse.json() as Promise<Reprise>
}

/** Étape 6.5 — le desktop suit l'avancement du mobile. */
export async function lireEtatSession(
  jeton: string,
  sessionId: string,
  signal?: AbortSignal
): Promise<EtatSession> {
  const reponse = await fetch(`/api/sessions/${sessionId}`, {
    signal,
    headers: { Accept: 'application/json', Authorization: `Bearer ${jeton}` },
  })

  if (!reponse.ok) throw new Error(`État de session indisponible (${reponse.status}).`)

  return reponse.json() as Promise<EtatSession>
}
