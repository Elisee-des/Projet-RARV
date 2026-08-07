/**
 * Palette des graphiques.
 *
 * ## Elle a été VALIDÉE, pas choisie à l'œil
 *
 * Les cinq paliers ci-dessous ont été passés au validateur de palette contre la
 * surface réelle de l'application (`#0f172a`, mode sombre, rampe ordinale) :
 *
 * ```
 * [PASS] Lightness monotone   steps read light→dark
 * [PASS] Adjacent ΔL          all gaps >= 0.06
 * [PASS] Light-end contrast   #184f95 at 2.20:1 vs surface
 * [PASS] Single hue           hue spread 3°
 * ```
 *
 * Une première tentative avec des paliers voisins (450/500/550…) a ÉCHOUÉ :
 * ΔL de 0,048 entre paliers, sous le seuil de 0,06 — les barres se seraient
 * distinguées sur un écran calibré et pas ailleurs. D'où des paliers élargis.
 *
 * ## Une seule teinte, et c'est voulu
 *
 * Les deux graphiques du tableau de bord comparent des **magnitudes** — un taux
 * d'échec, un taux de visite. Le travail du lecteur est de classer, pas
 * d'identifier : c'est donc une échelle séquentielle à une teinte, plus foncée
 * quand la valeur monte. Colorer chaque barre d'une teinte différente
 * transformerait un classement en un jeu de devinettes.
 */

/** Rampe séquentielle bleue, du plus faible au plus fort. */
export const RAMPE = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6'] as const

/**
 * Couleurs de statut, réservées — jamais réutilisées pour une série.
 *
 * ⚠️ Le couple vert/rouge est indissociable en vision deutan : le validateur
 * mesure ΔE 4,1, très en dessous du seuil de 8. C'est le cas connu, et la parade
 * imposée est **icône + libellé** : ces deux couleurs n'apparaissent jamais
 * seules pour porter un sens. Partout où elles servent, un « ✓ / ✕ » et un mot
 * les accompagnent.
 */
export const STATUT = {
  bon: '#0ca30c',
  critique: '#d03b3b',
} as const

/**
 * Palier de la rampe correspondant à une valeur, sur une échelle 0–100.
 *
 * Plus la valeur est forte, plus la barre est foncée — la convention
 * séquentielle. Les seuils sont réguliers : une rampe irrégulière ferait mentir
 * la lecture visuelle par rapport au chiffre.
 */
export function paliers(valeur: number, maximum: number): string {
  if (maximum <= 0) return RAMPE[4]

  const rapport = Math.min(1, Math.max(0, valeur / maximum))
  const index = Math.min(RAMPE.length - 1, Math.floor((1 - rapport) * RAMPE.length))

  return RAMPE[index]
}
