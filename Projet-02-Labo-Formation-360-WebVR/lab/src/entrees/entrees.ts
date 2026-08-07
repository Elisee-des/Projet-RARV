/**
 * État des entrées, partagé entre le DOM et la boucle de rendu.
 *
 * ⚠️ **Volontairement mutable et hors de React.** Le clavier et le joystick
 * changent d'état à chaque image ; les passer par `useState` déclencherait un
 * rendu React à 60 Hz, ce qui coûte plus cher que toute la simulation physique.
 * Ce module est lu par `useFrame` et écrit par les gestionnaires d'événements.
 *
 * `regard` est un accumulateur : le contrôleur le consomme et le remet à zéro à
 * chaque image. Sans cela, un mouvement de souris rapide entre deux images
 * serait perdu, et la caméra semblerait décrocher.
 */
export const entrees = {
  /** −1 (recule) à 1 (avance). */
  avant: 0,

  /** −1 (gauche) à 1 (droite). */
  droite: 0,

  courir: false,

  /** Delta de regard accumulé depuis la dernière image, en pixels. */
  regard: { dx: 0, dy: 0 },

  /** Le pointeur est-il verrouillé ? (bureau uniquement) */
  verrouille: false,
}

export function consommerRegard(): { dx: number; dy: number } {
  const { dx, dy } = entrees.regard
  entrees.regard.dx = 0
  entrees.regard.dy = 0
  return { dx, dy }
}

export function reinitialiserDeplacement(): void {
  entrees.avant = 0
  entrees.droite = 0
  entrees.courir = false
}

/**
 * Étape 4.4 — Clavier.
 *
 * ZQSD **et** WASD sont acceptés simultanément : on écoute `event.code`, qui
 * désigne la TOUCHE PHYSIQUE indépendamment de la disposition. `KeyW` est la
 * touche en haut à gauche du groupe — étiquetée Z en AZERTY, W en QWERTY. Un
 * apprenant sur clavier QWERTY et un autre sur AZERTY appuient au même endroit
 * et avancent tous les deux, sans réglage.
 */
const AVANCER = ['KeyW', 'ArrowUp']
const RECULER = ['KeyS', 'ArrowDown']
const GAUCHE = ['KeyA', 'ArrowLeft']
const DROITE = ['KeyD', 'ArrowRight']

export function brancherClavier(): () => void {
  const enfoncees = new Set<string>()

  const recalculer = () => {
    const avant = AVANCER.some((t) => enfoncees.has(t)) ? 1 : 0
    const arriere = RECULER.some((t) => enfoncees.has(t)) ? 1 : 0
    const gauche = GAUCHE.some((t) => enfoncees.has(t)) ? 1 : 0
    const droite = DROITE.some((t) => enfoncees.has(t)) ? 1 : 0

    entrees.avant = avant - arriere
    entrees.droite = droite - gauche
    entrees.courir = enfoncees.has('ShiftLeft') || enfoncees.has('ShiftRight')
  }

  const surEnfoncee = (evenement: KeyboardEvent) => {
    // Ne jamais capturer les touches quand l'apprenant écrit dans un champ ou
    // navigue au clavier dans une modale de quiz (Lot 6).
    if (evenement.target instanceof HTMLElement && evenement.target.closest('input, textarea, [contenteditable]')) {
      return
    }

    enfoncees.add(evenement.code)
    recalculer()

    // Les flèches font défiler la page, l'espace aussi : on les neutralise
    // uniquement quand elles servent au déplacement.
    if ([...AVANCER, ...RECULER, ...GAUCHE, ...DROITE].includes(evenement.code)) {
      evenement.preventDefault()
    }
  }

  const surRelachee = (evenement: KeyboardEvent) => {
    enfoncees.delete(evenement.code)
    recalculer()
  }

  // ⚠️ Une fenêtre qui perd le focus ne reçoit JAMAIS le `keyup`. Sans ce
  // gestionnaire, un Alt+Tab en pleine course laisse l'apprenant avancer
  // indéfiniment contre un mur au retour — un bug qui semble inexplicable.
  const surPerteFocus = () => {
    enfoncees.clear()
    reinitialiserDeplacement()
  }

  window.addEventListener('keydown', surEnfoncee)
  window.addEventListener('keyup', surRelachee)
  window.addEventListener('blur', surPerteFocus)

  return () => {
    window.removeEventListener('keydown', surEnfoncee)
    window.removeEventListener('keyup', surRelachee)
    window.removeEventListener('blur', surPerteFocus)
    surPerteFocus()
  }
}
