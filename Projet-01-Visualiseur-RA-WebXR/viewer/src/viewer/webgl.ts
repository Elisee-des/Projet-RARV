/**
 * Étape 3.8 — WebGL est-il utilisable ?
 *
 * À vérifier AVANT de monter le Canvas : sinon Three.js lève une exception
 * au premier rendu et l'utilisateur n'a aucune explication. Cas réels :
 * accélération matérielle désactivée, pilote sur liste noire, machine
 * virtuelle sans GPU.
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
