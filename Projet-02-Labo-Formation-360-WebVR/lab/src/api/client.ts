/**
 * Client HTTP du backend Laravel MUTUALISÉ avec le Projet 01 (ADR-001).
 *
 * En développement, `/api` est proxifié par Vite vers http://127.0.0.1:8000 :
 * même origine, donc pas de CORS. En production, la base d'URL sera fournie par
 * une variable d'environnement (Lot 11).
 */

export class ErreurApi extends Error {
  // Champ déclaré explicitement : `erasableSyntaxOnly` interdit les propriétés
  // de paramètre de constructeur (`constructor(readonly statut: number)`).
  readonly statut: number

  constructor(message: string, statut: number) {
    super(message)
    this.name = 'ErreurApi'
    this.statut = statut
  }
}

export async function appelApi<T>(chemin: string, options?: RequestInit): Promise<T> {
  const reponse = await fetch(`/api${chemin}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!reponse.ok) {
    throw new ErreurApi(`${options?.method ?? 'GET'} /api${chemin} → ${reponse.status}`, reponse.status)
  }

  return (await reponse.json()) as T
}

/**
 * Vérifie que le backend répond. Sert de contrôle de bout en bout de la chaîne
 * navigateur → proxy Vite → Laravel (critère de sortie de l'étape 0.5).
 */
export function ping(): Promise<unknown> {
  return appelApi('/ping')
}

/**
 * Ramène une URL signée de l'API à la même origine que la page.
 *
 * ⚠️ **Le piège qui casse le test sur téléphone.**
 *
 * Laravel signe ses URL d'assets en absolu, à partir de `APP_URL` — soit
 * `http://127.0.0.1:8000` en développement. Sur l'ordinateur, le navigateur les
 * charge sans broncher : la boucle locale est considérée comme une origine de
 * confiance, elle échappe au blocage du contenu mixte. **Depuis le téléphone,
 * `127.0.0.1` désigne le téléphone lui-même** : la scène ne se charge jamais,
 * et l'erreur ne ressemble pas du tout à un problème d'URL.
 *
 * On ne garde donc que le chemin et la requête, pour passer par le proxy Vite.
 * La signature reste valide : `changeOrigin` réécrit l'en-tête `Host` en
 * `127.0.0.1:8000`, donc Laravel recalcule exactement l'URL qu'il a signée.
 *
 * En production, les assets sont derrière un CDN avec de vraies URL absolues
 * en HTTPS (étape 11.3) : on n'y touche pas.
 */
export function versMemeOrigine(url: string): string
export function versMemeOrigine(url: null): null
export function versMemeOrigine(url: string | null): string | null
export function versMemeOrigine(url: string | null): string | null {
  if (url === null || !import.meta.env.DEV) return url

  try {
    const analysee = new URL(url, window.location.origin)

    if (!analysee.pathname.startsWith('/api/')) return url

    return `${analysee.pathname}${analysee.search}`
  } catch {
    return url
  }
}
