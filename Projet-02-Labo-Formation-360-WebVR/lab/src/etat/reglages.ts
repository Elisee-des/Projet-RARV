import { create } from 'zustand'

/**
 * Étape 4.7 — Réglages de confort visuel.
 *
 * ⚠️ Le plan est explicite : « le mal des transports en 3D première personne
 * est un vrai motif d'abandon. Head bob désactivé, mouvements linéaires, option
 * de téléportation — ce sont des choix de conception, pas du confort
 * optionnel. »
 *
 * D'où l'absence, ici, de tout réglage de head bob : il n'existe pas dans le
 * code. Un balancement de caméra à chaque pas est la première cause de nausée
 * en vue subjective, et le rendre optionnel supposerait qu'on l'a écrit.
 */

export interface EtatReglages {
  /** Multiplicateur de sensibilité du regard, 0,4 à 2,5. */
  sensibilite: number

  /** Champ de vision vertical, en degrés. Un FOV étroit accentue la nausée. */
  fov: number

  /** Assombrissement périphérique pendant le déplacement. */
  vignette: boolean

  /**
   * Reflète `prefers-reduced-motion`, et reste modifiable à la main.
   *
   * Quand il est actif, le déplacement guidé de l'étape 4.9 **téléporte** au
   * lieu de faire glisser la caméra : un mouvement automatique que l'apprenant
   * ne contrôle pas est précisément ce qui déclenche le mal des transports.
   */
  mouvementReduit: boolean

  regler: (partiel: Partial<Omit<EtatReglages, 'regler'>>) => void
}

const prefereMouvementReduit = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useReglages = create<EtatReglages>((set) => ({
  sensibilite: 1,
  fov: 62,
  vignette: true,
  mouvementReduit: prefereMouvementReduit(),

  regler: (partiel) => set(partiel),
}))

/** Suit les changements de préférence système en cours de session. */
export function suivrePreferenceMouvement(): () => void {
  const requete = window.matchMedia('(prefers-reduced-motion: reduce)')

  const surChangement = (evenement: MediaQueryListEvent) => {
    useReglages.getState().regler({ mouvementReduit: evenement.matches })
  }

  requete.addEventListener('change', surChangement)

  return () => requete.removeEventListener('change', surChangement)
}
