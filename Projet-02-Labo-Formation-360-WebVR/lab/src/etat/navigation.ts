import { create } from 'zustand'

/**
 * Étape 4.9 — Déplacement guidé.
 *
 * ⚠️ Le plan est catégorique : « sans issue de secours, un utilisateur qui ne
 * sait pas jouer aux FPS reste bloqué contre un mur et abandonne. Le bouton de
 * déplacement guidé sauve la démo en entretien. »
 *
 * Le store ne contient qu'un code de poste : c'est un ordre, changé rarement,
 * donc un état React convient. Tout ce qui varie à chaque image — position,
 * vitesse — vit hors de React (`etatJoueur`).
 */

export interface EtatNavigation {
  /** Code du poste vers lequel se diriger, ou null. */
  cible: string | null

  /** Le déplacement guidé est-il en cours ? */
  enRoute: boolean

  allerVers: (code: string) => void
  arriver: () => void
  annuler: () => void
}

export const useNavigation = create<EtatNavigation>((set) => ({
  cible: null,
  enRoute: false,

  allerVers: (code) => set({ cible: code, enRoute: true }),
  arriver: () => set({ cible: null, enRoute: false }),

  // Toute entrée manuelle interrompt le guidage : l'apprenant reprend la main
  // dès qu'il touche une commande, sans avoir à chercher un bouton d'annulation.
  annuler: () => set({ cible: null, enRoute: false }),
}))
