import { Vector3 } from 'three'

/**
 * Position et cinématique du joueur, hors de React.
 *
 * Ces valeurs changent à chaque image. Les stocker dans un état React
 * déclencherait 60 rendus par seconde de toute l'interface — plus coûteux que
 * la simulation elle-même. Les consommateurs (mini-carte, vignette, HUD) les
 * échantillonnent à leur propre rythme, autour de 15 Hz, ce qui est largement
 * suffisant pour l'œil.
 */
export const etatJoueur = {
  /** Position des PIEDS, en coordonnées monde. */
  pieds: new Vector3(),

  /** Lacet de la caméra en degrés, 0 = vers −Z. */
  lacet: 0,

  /** Vitesse horizontale instantanée, en m/s. */
  vitesse: 0,

  auSol: true,

  /** Code du poste le plus proche, à portée d'interaction. */
  posteProche: null as string | null,
}

/** Instantané sérialisable, pour la sauvegarde de l'étape 4.10. */
export function instantanePosition(): { position: [number, number, number]; rotation: number } {
  return {
    position: [
      Number(etatJoueur.pieds.x.toFixed(3)),
      Number(etatJoueur.pieds.y.toFixed(3)),
      Number(etatJoueur.pieds.z.toFixed(3)),
    ],
    rotation: Number(etatJoueur.lacet.toFixed(1)),
  }
}
