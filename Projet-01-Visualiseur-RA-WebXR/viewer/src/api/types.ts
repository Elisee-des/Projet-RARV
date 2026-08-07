/** Reflète les ressources JSON de l'API (Lot 2). */

export type Triplet = [number, number, number]

export type Annotation = {
  id: number
  order: number
  label: string
  title: string
  bodyHtml: string
  /** Espace LOCAL du modèle — directement utilisable comme position Three.js. */
  position: Triplet
  normal: Triplet | null
  mediaUrl: string | null
  docUrl: string | null
}

export type Placement = 'floor' | 'table' | 'wall'

export type ObjetPedagogique = {
  slug: string
  title: string
  description: string | null
  category: string | null
  assets: {
    glb: string
    usdz: string | null
    poster: string | null
  }
  placement: {
    scale: number
    upAxis: string
    recommended: Placement
  }
  perf: {
    triangles: number | null
    fileSizeKb: number | null
  }
  annotations: Annotation[]
}
