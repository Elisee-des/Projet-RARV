import { cheminApplicatif } from './chemin'
import type { Annotation, Triplet } from './types'

/** Lot 8 — API de l'éditeur visuel d'annotations. */

export type ObjetEditable = {
  slug: string
  title: string
  status: 'draft' | 'published'
  placement: { scale: number; upAxis: string; recommended: string }
  perf: { triangles: number | null; fileSizeKb: number | null }
  assets: { glb: string; usdz: string | null; poster: string | null }
  annotations: Annotation[]
}

export type BrouillonAnnotation = {
  label: string
  title: string
  bodyHtml: string
  position: Triplet
  normal: Triplet | null
}

export function jetonEditeurDepuisUrl(): { slug: string; jeton: string } | null {
  const chemin = /^\/editeur\/([a-z0-9-]+)\/?$/.exec(cheminApplicatif())
  const jeton = new URLSearchParams(window.location.search).get('t')

  return chemin && jeton ? { slug: chemin[1], jeton } : null
}

async function appeler<T>(
  url: string,
  jeton: string,
  options: RequestInit = {}
): Promise<T> {
  const reponse = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
      ...options.headers,
    },
  })

  if (reponse.status === 401 || reponse.status === 403) {
    throw new Error("Jeton d'édition expiré ou invalide. Rouvrez l'éditeur depuis le back-office.")
  }

  if (!reponse.ok) {
    const corps = (await reponse.json().catch(() => null)) as { message?: string } | null
    throw new Error(corps?.message ?? `Erreur ${reponse.status}.`)
  }

  return reponse.status === 204 ? (null as T) : ((await reponse.json()) as T)
}

const base = (slug: string) => `/api/admin/objects/${encodeURIComponent(slug)}`

export function chargerObjet(slug: string, jeton: string): Promise<ObjetEditable> {
  return appeler<ObjetEditable>(`${base(slug)}?t=${encodeURIComponent(jeton)}`, jeton)
}

export async function creerAnnotation(
  slug: string,
  jeton: string,
  brouillon: BrouillonAnnotation
): Promise<Annotation> {
  const { annotation } = await appeler<{ annotation: Annotation }>(`${base(slug)}/annotations`, jeton, {
    method: 'POST',
    body: JSON.stringify(brouillon),
  })

  return annotation
}

export async function modifierAnnotation(
  slug: string,
  jeton: string,
  id: number,
  champs: Partial<BrouillonAnnotation>
): Promise<Annotation> {
  const { annotation } = await appeler<{ annotation: Annotation }>(
    `${base(slug)}/annotations/${id}`,
    jeton,
    { method: 'PUT', body: JSON.stringify(champs) }
  )

  return annotation
}

export function supprimerAnnotation(slug: string, jeton: string, id: number): Promise<null> {
  return appeler<null>(`${base(slug)}/annotations/${id}`, jeton, { method: 'DELETE' })
}

export async function reordonnerAnnotations(
  slug: string,
  jeton: string,
  ids: number[]
): Promise<Annotation[]> {
  const { annotations } = await appeler<{ annotations: Annotation[] }>(
    `${base(slug)}/annotations/order`,
    jeton,
    { method: 'PUT', body: JSON.stringify({ ids }) }
  )

  return annotations
}
