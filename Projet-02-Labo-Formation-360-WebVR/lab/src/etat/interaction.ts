import { create } from 'zustand'

/**
 * Lot 5 — État du système d'interaction.
 *
 * Trois notions distinctes, et les confondre est la première source de bugs
 * dans ce genre de système :
 *
 *   - **visé** : le poste que le réticule pointe, ou dans le rayon duquel on
 *     se trouve. Change en permanence, n'engage à rien.
 *   - **ouvert** : l'activité affichée par-dessus la 3D. Un seul à la fois, et
 *     tant qu'il est ouvert le déplacement est verrouillé (étape 5.7).
 *   - **visité / terminé** : la progression. Visiter n'est pas terminer —
 *     s'approcher d'un poste le marque visité, seul le Lot 6 le marquera
 *     terminé.
 */

export type SourceVisee = 'visee' | 'proximite'

export interface EtatInteraction {
  vise: string | null
  source: SourceVisee | null

  ouvert: string | null

  visites: string[]
  termines: string[]

  viser: (code: string | null, source: SourceVisee | null) => void
  ouvrir: (code: string) => void
  fermer: () => void
  marquerTermine: (code: string) => void
  amorcer: (visites: string[], termines: string[]) => void
}

export const useInteraction = create<EtatInteraction>((set, get) => ({
  vise: null,
  source: null,
  ouvert: null,
  visites: [],
  termines: [],

  viser: (code, source) => {
    if (get().vise === code) return

    set((etat) => ({
      vise: code,
      source,
      // Étape 5.8 — approcher un poste le marque visité, une fois.
      visites: code && !etat.visites.includes(code) ? [...etat.visites, code] : etat.visites,
    }))
  },

  ouvrir: (code) => set({ ouvert: code }),
  fermer: () => set({ ouvert: null }),

  marquerTermine: (code) =>
    set((etat) => ({
      termines: etat.termines.includes(code) ? etat.termines : [...etat.termines, code],
    })),

  amorcer: (visites, termines) => set({ visites, termines }),
}))

/** État visuel d'un poste (étape 5.6). */
export type EtatPoste = 'neuf' | 'visite' | 'termine'

export function etatDuPoste(code: string, visites: string[], termines: string[]): EtatPoste {
  if (termines.includes(code)) return 'termine'
  if (visites.includes(code)) return 'visite'
  return 'neuf'
}
