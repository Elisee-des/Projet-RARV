import { createXRStore } from '@react-three/xr'

/**
 * Étape 5.5 — Configuration de la session WebXR.
 *
 * ⚠️ `emulate` vaut « metaQuest3 » par défaut dès qu'on est sur localhost sans
 * WebXR. Un poste de développement se déclarerait alors compatible RA, et
 * toute la détection de capacités mentirait. On le désactive, sauf demande
 * explicite via VITE_XR_EMULATE=1.
 *
 * `offerSession` est également coupé : le navigateur proposerait de lui-même
 * d'entrer en RA, hors de tout contrôle de notre interface.
 */
export const xrStore = createXRStore({
  emulate: import.meta.env.VITE_XR_EMULATE === '1',
  offerSession: false,

  // hit-test : indispensable, c'est lui qui détecte le sol
  hitTest: 'required',

  // dom-overlay : affiche l'interface React par-dessus le flux caméra
  domOverlay: true,

  // Ancres : le placement reste stable quand l'utilisateur se déplace
  anchors: true,

  // Inutiles en RA sur téléphone, et refusés par certains appareils
  handTracking: false,
  bodyTracking: false,
  meshDetection: false,
  planeDetection: false,
  layers: false,
})

export type EtatPlacement = 'recherche' | 'place'

/** Bornes d'échelle imposées à l'utilisateur (étape 5.9). */
export const ECHELLE_MIN = 0.5
export const ECHELLE_MAX = 2
export const PAS_ECHELLE = 0.1
export const PAS_ROTATION = Math.PI / 12 // 15°
