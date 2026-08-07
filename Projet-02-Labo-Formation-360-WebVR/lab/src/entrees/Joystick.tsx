import { useCallback, useRef, useState } from 'react'
import { entrees } from './entrees'

const RAYON_BASE = 56
const RAYON_POIGNEE = 26
const ZONE_MORTE = 0.12

/**
 * Étape 4.5 — Joystick virtuel tactile.
 *
 * Trois décisions qui font la différence entre un joystick utilisable et un
 * joystick agaçant :
 *
 * 1. **La base se replace sous le doigt.** Elle apparaît là où l'apprenant
 *    pose le pouce, dans toute la zone basse gauche, au lieu d'occuper une
 *    position fixe qu'il faut viser. Sur un téléphone tenu à une main, viser
 *    un disque fixe est une source d'échec permanente.
 *
 * 2. **Zone morte de 12 %.** Un pouce posé n'est jamais parfaitement immobile ;
 *    sans zone morte, l'apprenant dérive lentement en croyant être à l'arrêt.
 *
 * 3. **`stopPropagation`.** Les gestes du joystick ne doivent pas atteindre le
 *    canvas, sinon déplacer et regarder deviendraient le même geste. C'est ce
 *    qui permet d'avancer et de tourner la tête en même temps, à deux doigts.
 */
export default function Joystick() {
  const [actif, setActif] = useState(false)
  const [base, setBase] = useState({ x: 0, y: 0 })
  const [poignee, setPoignee] = useState({ x: 0, y: 0 })
  const pointeur = useRef<number | null>(null)

  const appliquer = useCallback((dx: number, dy: number) => {
    const distance = Math.hypot(dx, dy)
    const amplitude = Math.min(1, distance / RAYON_BASE)

    if (amplitude < ZONE_MORTE) {
      entrees.avant = 0
      entrees.droite = 0
      setPoignee({ x: 0, y: 0 })
      return
    }

    // Réajustement après zone morte : la vitesse repart de 0 au bord de la
    // zone morte au lieu de sauter à 12 %.
    const force = (amplitude - ZONE_MORTE) / (1 - ZONE_MORTE)
    const normalise = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }

    entrees.droite = normalise.x * force
    entrees.avant = -normalise.y * force // écran : y vers le bas
    entrees.courir = force > 0.85

    setPoignee({
      x: normalise.x * amplitude * (RAYON_BASE - RAYON_POIGNEE / 2),
      y: normalise.y * amplitude * (RAYON_BASE - RAYON_POIGNEE / 2),
    })
  }, [])

  const surBas = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if (pointeur.current !== null) return

    evenement.stopPropagation()
    pointeur.current = evenement.pointerId
    evenement.currentTarget.setPointerCapture(evenement.pointerId)

    setBase({ x: evenement.clientX, y: evenement.clientY })
    setPoignee({ x: 0, y: 0 })
    setActif(true)
  }

  const surBouge = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if (evenement.pointerId !== pointeur.current) return

    evenement.stopPropagation()
    appliquer(evenement.clientX - base.x, evenement.clientY - base.y)
  }

  const surHaut = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if (evenement.pointerId !== pointeur.current) return

    evenement.stopPropagation()
    pointeur.current = null

    entrees.avant = 0
    entrees.droite = 0
    entrees.courir = false

    setActif(false)
    setPoignee({ x: 0, y: 0 })
  }

  return (
    <div
      style={styles.zone}
      onPointerDown={surBas}
      onPointerMove={surBouge}
      onPointerUp={surHaut}
      onPointerCancel={surHaut}
      aria-hidden="true"
    >
      {actif && (
        <>
          <div style={{ ...styles.base, left: base.x - RAYON_BASE, top: base.y - RAYON_BASE }} />
          <div
            style={{
              ...styles.poignee,
              left: base.x + poignee.x - RAYON_POIGNEE,
              top: base.y + poignee.y - RAYON_POIGNEE,
            }}
          />
        </>
      )}

      {!actif && <p style={styles.aide}>Posez le pouce ici pour vous déplacer</p>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    position: 'fixed',
    left: 0,
    bottom: 0,
    width: 'min(52vw, 320px)',
    height: 'min(42vh, 300px)',
    touchAction: 'none',
    zIndex: 12,
  },
  base: {
    position: 'fixed',
    width: RAYON_BASE * 2,
    height: RAYON_BASE * 2,
    borderRadius: '50%',
    border: '2px solid rgb(56 189 248 / 0.45)',
    background: 'rgb(15 23 42 / 0.35)',
    pointerEvents: 'none',
  },
  poignee: {
    position: 'fixed',
    width: RAYON_POIGNEE * 2,
    height: RAYON_POIGNEE * 2,
    borderRadius: '50%',
    background: 'rgb(56 189 248 / 0.75)',
    pointerEvents: 'none',
  },
  aide: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    margin: 0,
    fontSize: 11,
    color: 'var(--texte-doux)',
    pointerEvents: 'none',
  },
}
