import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'

export type EtatPastille = 'neutre' | 'visitee' | 'active'

const COULEURS: Record<EtatPastille, { fond: string; bord: string; texte: string }> = {
  neutre: { fond: 'rgba(17,21,26,0.92)', bord: '#ffffff', texte: '#ffffff' },
  visitee: { fond: 'rgba(22,48,34,0.94)', bord: '#4ade80', texte: '#d7f5e2' },
  active: { fond: '#60a5fa', bord: '#ffffff', texte: '#0b1017' },
}

const cache = new Map<string, Texture>()

/**
 * Fabrique la texture d'une pastille numérotée.
 *
 * Dessinée sur un canvas plutôt que rendue avec `<Text>` de drei : troika
 * télécharge une police distante, ce qui casserait l'affichage hors ligne et
 * serait bloqué par la politique de sécurité de contenu (étape 10.2).
 */
export function pastilleTexture(numero: number, etat: EtatPastille): Texture {
  const cle = `${numero}-${etat}`
  const enCache = cache.get(cle)
  if (enCache) return enCache

  const taille = 128
  const canvas = document.createElement('canvas')
  canvas.width = taille
  canvas.height = taille

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Contexte 2D indisponible')

  const { fond, bord, texte } = COULEURS[etat]
  const centre = taille / 2
  const rayon = taille * 0.42

  ctx.beginPath()
  ctx.arc(centre, centre, rayon, 0, Math.PI * 2)
  ctx.fillStyle = fond
  ctx.fill()
  ctx.lineWidth = taille * 0.07
  ctx.strokeStyle = bord
  ctx.stroke()

  ctx.fillStyle = texte
  ctx.font = `600 ${taille * 0.46}px system-ui, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(numero), centre, centre + taille * 0.02)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  cache.set(cle, texture)

  return texture
}
