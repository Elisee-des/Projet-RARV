import { entrees } from './entrees'

/**
 * Étapes 4.4 et 4.5 — Contrôle du regard, bureau **et** tactile.
 *
 * On n'utilise pas `PointerLockControls` de drei : il ne gère que la souris, et
 * il applique lui-même la rotation à la caméra. Or ici le tangage doit rester
 * borné, le lacet doit être lisible par le contrôleur de déplacement, et le
 * tactile doit fonctionner sans verrouillage de pointeur — que les navigateurs
 * mobiles n'implémentent pas.
 *
 * Le module se contente d'accumuler des deltas en pixels dans `entrees.regard`.
 * La conversion en angles, la sensibilité et le bornage appartiennent au
 * contrôleur : c'est lui qui connaît les réglages de confort de l'étape 4.7.
 */

export interface OptionsRegard {
  /** Élément qui capte les gestes — le canvas. */
  cible: HTMLElement
  /** Appelé quand le verrouillage de pointeur change (bureau). */
  surVerrouillage?: (verrouille: boolean) => void
}

export function brancherRegard({ cible, surVerrouillage }: OptionsRegard): () => void {
  /* ---------------------------------------------------------------- *
   * Bureau — verrouillage de pointeur
   * ---------------------------------------------------------------- */

  const surMouvementSouris = (evenement: MouseEvent) => {
    if (!entrees.verrouille) return

    entrees.regard.dx += evenement.movementX
    entrees.regard.dy += evenement.movementY
  }

  const surChangementVerrou = () => {
    entrees.verrouille = document.pointerLockElement === cible
    surVerrouillage?.(entrees.verrouille)
  }

  // ⚠️ `requestPointerLock` échoue si l'appel n'est pas issu d'un geste
  // utilisateur, ou s'il suit de trop près une sortie de verrouillage —
  // le navigateur impose alors un délai de quelques secondes. On avale le
  // rejet : insister produirait une erreur non capturée dans la console à
  // chaque clic.
  const surClic = () => {
    if (estTactile()) return
    if (document.pointerLockElement === cible) return

    const demande = cible.requestPointerLock() as unknown

    if (demande instanceof Promise) demande.catch(() => {})
  }

  /* ---------------------------------------------------------------- *
   * Tactile — glisser pour regarder
   * ---------------------------------------------------------------- */

  let pointeurRegard: number | null = null
  let dernier = { x: 0, y: 0 }

  const surPointeurBas = (evenement: PointerEvent) => {
    if (evenement.pointerType === 'mouse') return

    // Un seul doigt pilote le regard. Le joystick de l'étape 4.5 est un
    // élément DOM distinct qui arrête la propagation : ses gestes n'arrivent
    // jamais ici, et les deux peuvent donc être utilisés simultanément.
    if (pointeurRegard !== null) return

    pointeurRegard = evenement.pointerId
    dernier = { x: evenement.clientX, y: evenement.clientY }
    cible.setPointerCapture(evenement.pointerId)
  }

  const surPointeurBouge = (evenement: PointerEvent) => {
    if (evenement.pointerId !== pointeurRegard) return

    entrees.regard.dx += evenement.clientX - dernier.x
    entrees.regard.dy += evenement.clientY - dernier.y
    dernier = { x: evenement.clientX, y: evenement.clientY }
  }

  const surPointeurHaut = (evenement: PointerEvent) => {
    if (evenement.pointerId !== pointeurRegard) return

    pointeurRegard = null

    if (cible.hasPointerCapture(evenement.pointerId)) {
      cible.releasePointerCapture(evenement.pointerId)
    }
  }

  cible.addEventListener('click', surClic)
  document.addEventListener('pointerlockchange', surChangementVerrou)
  document.addEventListener('mousemove', surMouvementSouris)
  cible.addEventListener('pointerdown', surPointeurBas)
  cible.addEventListener('pointermove', surPointeurBouge)
  cible.addEventListener('pointerup', surPointeurHaut)
  cible.addEventListener('pointercancel', surPointeurHaut)

  return () => {
    cible.removeEventListener('click', surClic)
    document.removeEventListener('pointerlockchange', surChangementVerrou)
    document.removeEventListener('mousemove', surMouvementSouris)
    cible.removeEventListener('pointerdown', surPointeurBas)
    cible.removeEventListener('pointermove', surPointeurBouge)
    cible.removeEventListener('pointerup', surPointeurHaut)
    cible.removeEventListener('pointercancel', surPointeurHaut)

    if (document.pointerLockElement === cible) document.exitPointerLock()

    entrees.verrouille = false
  }
}

export function estTactile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}
