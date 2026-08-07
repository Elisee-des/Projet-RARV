/**
 * Étape 5.5 — Postes hors du champ de vision.
 *
 * Écrit par `Viseur` à 20 Hz, lu par les indicateurs DOM à leur propre rythme.
 * Un tableau mutable partagé plutôt qu'un état React : le contenu change à
 * chaque mouvement de tête, et le faire transiter par un rendu React coûterait
 * plus cher que l'information ne vaut.
 *
 * > « Dans une salle fermée, l'utilisateur ne sait pas où aller. Les
 * > indicateurs hors champ sont ce qui fait la différence entre "je me perds"
 * > et "je comprends le parcours". »
 */
export interface CibleHorsChamp {
  code: string
  /** Angle écran depuis le centre, en radians. 0 = à droite. */
  angle: number
  /** Distance au joueur, en mètres. */
  distance: number
}

export const horsChamp: CibleHorsChamp[] = []
