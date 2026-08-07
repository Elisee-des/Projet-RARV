/**
 * Dimensions de l'atelier, en mètres.
 *
 * Repère monde identique au plan de l'étape 0.3 (`docs/plan-salle.svg`) :
 *   X de 0 à 10 (largeur) · Y vers le haut · Z de 0 à 8 (profondeur)
 *
 * ⚠️ Ces valeurs décrivent le VOLUME de la salle, pas la position des postes.
 * Les 8 points d'intérêt seront lus depuis les Empty nommés `POI_01`…`POI_08`
 * exportés dans le `.glb` (étape 1.10), jamais codés en dur ici. C'est la parade
 * au piège n°1 du projet : repositionner 8 points à la main à chaque itération
 * de la salle.
 */
export const SALLE = {
  largeur: 10,
  profondeur: 8,
  hauteur: 3.2,
} as const

/** Hauteur d'œil de référence, utilisée pour la caméra et la capsule du Lot 4. */
export const HAUTEUR_OEIL = 1.65

/**
 * Point d'apparition provisoire, repris du plan 0.3.
 * Remplacé au Lot 3.5 par l'Empty `SPAWN` lu dans le `.glb`.
 */
export const SPAWN_PROVISOIRE: [number, number, number] = [5, HAUTEUR_OEIL, 6.5]
