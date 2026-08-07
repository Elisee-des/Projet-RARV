/**
 * Formes renvoyées par l'API du module « labo-formation ».
 *
 * Écrites à la main plutôt que générées : elles servent de contrat lisible
 * entre le front et le backend, et documentent ce que le serveur accepte de
 * divulguer. En particulier, `Question` n'a **pas** de champ indiquant la
 * bonne réponse — c'est la décision D5, et le type l'inscrit dans le code.
 */

export type TypeActivite = 'quiz' | 'video' | 'panel' | 'document'

export type TypeDeclenchement = 'click' | 'proximity'

export interface ActivitePanneau {
  type: 'panel'
  title: string
  bodyHtml: string
  minDurationS?: number
  relatedObjectSlug?: string
}

export interface ActiviteVideo {
  type: 'video'
  title: string
  src: string
  poster?: string
  captions?: string
  durationS?: number
  completionRatio?: number
  summaryHtml?: string
}

export interface ActiviteDocument {
  type: 'document'
  title: string
  file: string
  mime?: string
  completeOn?: 'download' | 'scroll'
  summaryHtml?: string
}

export interface ActiviteQuiz {
  type: 'quiz'
  quizId: number
}

export type Activite = ActivitePanneau | ActiviteVideo | ActiviteDocument | ActiviteQuiz

export interface PointInteraction {
  code: string
  order: number
  label: string
  icon: string | null
  required: boolean
  trigger: { type: TypeDeclenchement; radius: number | null }

  /**
   * `null` dans le cas normal : la position fait autorité dans le `.glb`
   * (Empty nommé `code`), pas en base. Voir étape 1.10.
   */
  position: [number, number, number] | null
  lookAt: [number, number, number] | null

  activity: Activite
}

export interface Environnement {
  slug: string
  title: string
  description: string | null

  assets: {
    scene: string | null
    collision: string | null
    lightmaps: string[]
  }

  spawn: {
    /** Repli. L'Empty `SPAWN` du `.glb` prime. */
    position: [number, number, number] | null
    /** Lacet en degrés autour de +Y. 0 = regarde vers −Z (convention Three.js). */
    rotation: number
  }

  bounds: { largeur: number; hauteur: number; profondeur: number } | null

  perf: {
    triangles: number | null
    fileSizeKb: number | null
    dansLeBudget: boolean
  }

  completion: {
    requiredPoints: string[]
    passScore: number | null
  }

  points: PointInteraction[]
}

export interface Progression {
  environment: string
  userRef: string
  visitedPoints: string[]
  completedPoints: string[]
  lastPosition: { position: [number, number, number]; rotation?: number } | null
  totalTimeMs: number
  pointCount: number
  requiredPoints: string[]
  missingRequired: string[]
  quiz: {
    best: { score: number; maxScore: number; percentage: number } | null
    passed: boolean
  }
  completionPct: number
  completed: boolean
  completedAt: string | null
}

/** Types d'événements du module « labo-formation » (étape 2.9). */
export type TypeEvenement =
  | 'scene_loaded'
  | 'point_entered'
  | 'point_left'
  | 'activity_started'
  | 'activity_completed'
  | 'quiz_submitted'
  | 'vr_entered'
  | 'vr_exited'
