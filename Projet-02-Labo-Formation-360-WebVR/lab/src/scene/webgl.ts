/**
 * Étape 3.8 — WebGL est-il utilisable ?
 *
 * À vérifier AVANT de monter le Canvas : sinon Three.js lève une exception au
 * premier rendu et l'utilisateur n'a aucune explication. Cas réels : accélération
 * matérielle désactivée, pilote sur liste noire, machine virtuelle sans GPU.
 *
 * Dans ce module, l'absence de WebGL n'est pas une impasse : elle bascule sur
 * le parcours alternatif 2D de l'étape 10.4, qui permet de suivre toute la
 * formation sans 3D.
 */
export function webglDisponible(): boolean {
  try {
    const canvas = document.createElement('canvas')

    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

/**
 * Étape 3.7 — Estimation grossière de la classe de l'appareil, connue AVANT le
 * premier rendu.
 *
 * Sert à choisir les réglages de départ ; la mesure réelle du framerate
 * (`DetecteurPerf`) corrige ensuite sur 3 secondes d'observation. Deviner mal
 * au démarrage n'est donc pas grave — mais démarrer un téléphone d'entrée de
 * gamme en qualité maximale lui coûte 3 secondes de saccades.
 */
export function qualiteInitiale(): 'reduite' | 'normale' {
  const coeurs = navigator.hardwareConcurrency ?? 4
  const memoire = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  const tactile = window.matchMedia('(pointer: coarse)').matches

  if (coeurs <= 4 || memoire <= 4) return 'reduite'

  return tactile ? 'reduite' : 'normale'
}
