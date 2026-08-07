import { useEffect, useMemo, useRef, useState } from 'react'
import { assainir } from '../assainir'
import type { ActivitePanneau } from '../../api/types'

interface Props {
  activite: ActivitePanneau
  dejaTermine: boolean
  onTerminer: () => void
}

/**
 * Étapes 6.10 et 6.12 — Panneau d'information.
 *
 * ## Le HTML est assaini côté client (10.9)
 *
 * `dangerouslySetInnerHTML` sur du contenu venant d'une API est exactement le
 * genre de ligne qui devient une faille le jour où un back-office permettra
 * d'éditer ces panneaux (Lot 8 du module « viewer-ra »). Le contenu passe donc
 * par `assainir`, en liste blanche — seconde barrière derrière la purification
 * serveur.
 *
 * ## Marquage « consulté » (6.12)
 *
 * Deux conditions, et il faut **les deux** :
 *
 *   - un **temps minimum** passé sur le panneau
 *   - le **défilement jusqu'en bas**, quand le contenu dépasse l'écran
 *
 * Le temps seul se contourne en laissant la modale ouverte. Le défilement seul
 * se contourne en un coup de molette. Un contenu qui tient déjà à l'écran est
 * considéré comme entièrement vu — exiger un défilement impossible bloquerait
 * le poste.
 */
export default function PanneauInfo({ activite, dejaTermine, onTerminer }: Props) {
  const corps = useRef<HTMLDivElement>(null)
  const [luJusquAuBout, setLuJusquAuBout] = useState(false)
  const [tempsEcoule, setTempsEcoule] = useState(false)
  const [termine, setTermine] = useState(dejaTermine)

  const minimum = activite.minDurationS ?? 8
  const html = useMemo(() => assainir(activite.bodyHtml), [activite.bodyHtml])

  useEffect(() => {
    const minuteur = setTimeout(() => setTempsEcoule(true), minimum * 1000)

    return () => clearTimeout(minuteur)
  }, [minimum])

  useEffect(() => {
    const element = corps.current
    if (!element) return

    const verifier = () => {
      // Contenu plus court que la zone visible : rien à faire défiler.
      if (element.scrollHeight <= element.clientHeight + 4) {
        setLuJusquAuBout(true)
        return
      }

      // Marge de 24 px : atteindre le pixel exact du bas est étonnamment
      // difficile avec un pavé tactile ou une molette à inertie.
      const restant = element.scrollHeight - element.scrollTop - element.clientHeight
      if (restant < 24) setLuJusquAuBout(true)
    }

    verifier()
    element.addEventListener('scroll', verifier, { passive: true })

    // Les images du panneau modifient la hauteur en arrivant : sans cette
    // observation, un contenu jugé « trop court pour défiler » à l'ouverture
    // le resterait pour toujours.
    const observateur = new ResizeObserver(verifier)
    observateur.observe(element)

    return () => {
      element.removeEventListener('scroll', verifier)
      observateur.disconnect()
    }
  }, [html])

  useEffect(() => {
    if (termine || !tempsEcoule || !luJusquAuBout) return

    setTermine(true)
    onTerminer()
  }, [luJusquAuBout, onTerminer, tempsEcoule, termine])

  return (
    <div style={styles.contenu}>
      <h2 style={styles.titre}>{activite.title}</h2>

      {activite.relatedObjectSlug && (
        <p style={styles.lien}>
          🔗 Cet équipement est aussi consultable en réalité augmentée dans le module
          « viewer&nbsp;RA » — objet <code>{activite.relatedObjectSlug}</code>.
        </p>
      )}

      {/*
        `data-corps` : point d'accroche stable pour les tests de bout en bout
        (étape 10.8). Cibler ce conteneur par son style de débordement était
        fragile — un changement de mise en page cassait le test sans que rien
        ne soit réellement cassé.
      */}
      <div ref={corps} data-corps="panneau" style={styles.corps}>
        <div style={styles.riche} dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <p style={styles.etat}>
        {termine
          ? '✓ Panneau consulté — poste terminé'
          : !tempsEcoule
            ? `Lecture en cours… (${minimum} s minimum)`
            : !luJusquAuBout
              ? 'Faites défiler jusqu’en bas pour valider ce poste.'
              : 'Validation…'}
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  contenu: { display: 'grid', gap: 10, minHeight: 0 },
  titre: { margin: 0, fontSize: 16, fontWeight: 700 },
  lien: {
    margin: 0,
    padding: '7px 10px',
    borderRadius: 8,
    background: 'rgb(56 189 248 / 0.12)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  corps: { maxHeight: '48vh', overflowY: 'auto', paddingRight: 6 },
  riche: { fontSize: 13.5, lineHeight: 1.65 },
  etat: { margin: 0, fontSize: 11.5, color: 'var(--texte-doux)' },
}
