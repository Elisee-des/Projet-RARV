/**
 * Étape 3.6 — Ambiance sonore d'atelier, synthétisée.
 *
 * Le plan qualifie l'audio spatialisé de « meilleur rapport immersion/effort du
 * projet ». Encore faut-il un fichier — et les assets audio sont un point
 * bloquant (B6). On synthétise donc le bourdonnement au démarrage : quelques
 * dizaines de lignes, zéro octet à télécharger, et l'effet est là.
 *
 * ⚠️ Ce n'est pas un livrable définitif. Un vrai enregistrement d'atelier sera
 * plus riche. Mais un placeholder qui tourne vaut mieux qu'une étape reportée,
 * et il valide toute la plomberie : contexte audio, geste utilisateur,
 * atténuation par la distance.
 *
 * Composition du bourdonnement :
 *   • 50 Hz et ses harmoniques — le ronflement d'un moteur asynchrone
 *   • bruit brun filtré — la ventilation
 *   • un léger battement — évite la sensation de boucle figée
 */

const DUREE_S = 6

/**
 * Construit une boucle audio sans raccord audible.
 *
 * La continuité vient du choix des fréquences : chacune complète un nombre
 * ENTIER de cycles sur la durée du tampon. Un fondu enchaîné aux extrémités
 * masquerait un raccord ; ici il n'y en a pas.
 */
export function bourdonnementAtelier(contexte: AudioContext): AudioBuffer {
  const frequence = contexte.sampleRate
  const echantillons = Math.floor(frequence * DUREE_S)
  const tampon = contexte.createBuffer(1, echantillons, frequence)
  const donnees = tampon.getChannelData(0)

  // Fréquences forcées sur un nombre entier de cycles dans la boucle
  const cycles = (hz: number) => Math.round(hz * DUREE_S) / DUREE_S

  const moteur = [
    { hz: cycles(50), gain: 0.16 },
    { hz: cycles(100), gain: 0.07 },
    { hz: cycles(150), gain: 0.035 },
    { hz: cycles(233), gain: 0.018 },
  ]

  // Battement lent : deux fréquences très proches produisent une pulsation
  // naturelle, celle d'un atelier où plusieurs machines tournent ensemble.
  const battement = { hz: cycles(0.35), profondeur: 0.25 }

  // Bruit brun : bruit blanc intégré. Plus grave et plus doux que le blanc,
  // c'est la couleur d'une ventilation.
  let brun = 0

  for (let i = 0; i < echantillons; i++) {
    const t = i / frequence

    let valeur = 0

    for (const { hz, gain } of moteur) {
      valeur += Math.sin(2 * Math.PI * hz * t) * gain
    }

    const blanc = Math.random() * 2 - 1
    brun = (brun + 0.018 * blanc) / 1.018
    valeur += brun * 2.4

    const modulation = 1 - battement.profondeur + battement.profondeur * (0.5 + 0.5 * Math.sin(2 * Math.PI * battement.hz * t))

    donnees[i] = valeur * modulation * 0.5
  }

  return tampon
}
