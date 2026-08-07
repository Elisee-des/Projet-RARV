import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'

/**
 * Pastilles numérotées dessinées sur un canvas.
 *
 * ⚠️ On n'utilise pas `<Text>` de drei : il télécharge une police depuis un
 * domaine externe. Hors ligne, derrière un proxy d'entreprise ou sous la
 * politique de sécurité de contenu de l'étape 11.2, les numéros disparaissent
 * — sans erreur. Piège déjà rencontré au Lot 5 du module « viewer-ra ».
 *
 * Un canvas de 128 px suffit : la pastille ne dépasse jamais quelques dizaines
 * de pixels à l'écran.
 */

const TAILLE = 128

const cache = new Map<string, Texture>()

export interface OptionsPastille {
  numero: number
  couleur: string
  termine: boolean
  requis: boolean
}

export function pastille({ numero, couleur, termine, requis }: OptionsPastille): Texture {
  const cle = `${numero}-${couleur}-${termine}-${requis}`
  const memorisee = cache.get(cle)

  if (memorisee) return memorisee

  const canvas = document.createElement('canvas')
  canvas.width = TAILLE
  canvas.height = TAILLE

  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Contexte 2D indisponible pour la pastille.')

  const centre = TAILLE / 2
  const rayon = TAILLE * 0.38

  // Halo doux : détache la pastille d'un fond clair comme d'un fond sombre.
  const halo = ctx.createRadialGradient(centre, centre, rayon * 0.7, centre, centre, TAILLE / 2)
  halo.addColorStop(0, 'rgba(0,0,0,0.35)')
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, TAILLE, TAILLE)

  ctx.beginPath()
  ctx.arc(centre, centre, rayon, 0, Math.PI * 2)
  ctx.fillStyle = termine ? couleur : 'rgba(11,18,32,0.92)'
  ctx.fill()

  ctx.lineWidth = requis ? 8 : 5
  ctx.strokeStyle = couleur
  // Contour pointillé pour les postes facultatifs : la différence se lit d'un
  // coup d'œil, sans légende.
  ctx.setLineDash(requis ? [] : [12, 9])
  ctx.stroke()
  ctx.setLineDash([])

  if (termine) {
    // Coche
    ctx.beginPath()
    ctx.moveTo(centre - rayon * 0.36, centre)
    ctx.lineTo(centre - rayon * 0.08, centre + rayon * 0.3)
    ctx.lineTo(centre + rayon * 0.4, centre - rayon * 0.32)
    ctx.lineWidth = 11
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1220'
    ctx.stroke()
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.font = `700 ${TAILLE * 0.42}px "Segoe UI", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(numero), centre, centre + 2)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  cache.set(cle, texture)

  return texture
}
