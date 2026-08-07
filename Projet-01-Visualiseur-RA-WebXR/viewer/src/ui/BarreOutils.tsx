import { useCallback, useEffect, useState } from 'react'
import type { SupportRA } from '../hooks/useSupportRA'
import { Icone } from './Icone'

type Props = {
  support: SupportRA
  usdz: string | null
  onReinitialiser: () => void
  onEntrerRA: () => void
  onQuickLook?: () => void
  /** Lot 6 — disponible dès que la session est ouverte. */
  onBasculeMobile?: () => void
  /** Étape 9.4 — parcours texte accessible. */
  onParcoursTexte?: () => void
}

/** Pixel transparent : iOS exige un <img> enfant pour activer Quick Look. */
const PIXEL_TRANSPARENT =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function BarreOutils({
  support,
  usdz,
  onReinitialiser,
  onEntrerRA,
  onQuickLook,
  onBasculeMobile,
  onParcoursTexte,
}: Props) {
  const [pleinEcran, setPleinEcran] = useState(false)

  useEffect(() => {
    const suivre = () => setPleinEcran(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', suivre)
    return () => document.removeEventListener('fullscreenchange', suivre)
  }, [])

  const basculerPleinEcran = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* refusé ou non supporté : sans conséquence */
    }
  }, [])

  return (
    <div className="outils">
      <button type="button" className="outils__bouton" onClick={onReinitialiser}>
        <Icone nom="reinitialiser" /> Réinitialiser la vue
      </button>

      <button type="button" className="outils__bouton" onClick={basculerPleinEcran}>
        <Icone nom={pleinEcran ? 'quitterPleinEcran' : 'pleinEcran'} />
        {pleinEcran ? 'Quitter le plein écran' : 'Plein écran'}
      </button>

      {onParcoursTexte && (
        <button type="button" className="outils__bouton" onClick={onParcoursTexte}>
          <Icone nom="versionTexte" /> Version texte
        </button>
      )}

      <BoutonRA
        support={support}
        usdz={usdz}
        onEntrerRA={onEntrerRA}
        onQuickLook={onQuickLook}
        onBasculeMobile={onBasculeMobile}
      />
    </div>
  )
}

/**
 * Étapes 5.3, 5.4 et 5.14 → 5.17 — Machine à états du bouton RA.
 *
 * Règle absolue : jamais de bouton mort. Chaque cas a son libellé, son action
 * et, quand la RA n'est pas possible, son explication.
 */
function BoutonRA({
  support,
  usdz,
  onEntrerRA,
  onQuickLook,
  onBasculeMobile,
}: {
  support: SupportRA
  usdz: string | null
  onEntrerRA: () => void
  onQuickLook?: () => void
  onBasculeMobile?: () => void
}) {
  if (support === 'verification') {
    return (
      <button type="button" className="outils__bouton outils__bouton--ra" disabled>
        <Icone nom="chargement" className="icone--tourne" /> Détection RA…
      </button>
    )
  }

  // --- Android, Quest : WebXR ---
  if (support === 'webxr') {
    return (
      <button type="button" className="outils__bouton outils__bouton--ra" onClick={onEntrerRA}>
        <Icone nom="telephone" /> Voir en réalité augmentée
      </button>
    )
  }

  // --- iOS : AR Quick Look ---
  if (support === 'quicklook' && usdz) {
    // Étape 5.15 — allowsContentScaling=0 impose l'échelle réelle du modèle :
    // sur un objet technique, laisser l'utilisateur le redimensionner
    // librement détruirait la notion de taille réelle.
    const lien =
      `${usdz}#allowsContentScaling=0` +
      `&canonicalWebPageURL=${encodeURIComponent(window.location.href)}` +
      `&callToAction=${encodeURIComponent('Retour à la leçon')}`

    return (
      <span className="outils__ios">
        <a className="outils__bouton outils__bouton--ra" rel="ar" href={lien} onClick={onQuickLook}>
          {/* Enfant <img> OBLIGATOIRE : sans lui, iOS ouvre le fichier
              au lieu de lancer AR Quick Look. */}
          <img src={PIXEL_TRANSPARENT} alt="" width={1} height={1} />
          <Icone nom="telephone" /> Voir en réalité augmentée
        </a>
        {/* Étape 5.17 — la limite d'iOS est annoncée, pas subie. */}
        <span className="outils__note">
          Sur iPhone, consultez les annotations avant de passer en RA : Quick Look ne les affiche pas.
        </span>
      </span>
    )
  }

  if (support === 'quicklook' && !usdz) {
    return (
      <button type="button" className="outils__bouton outils__bouton--ra" disabled>
        <Icone nom="telephone" /> Modèle iOS indisponible
      </button>
    )
  }

  // --- Desktop et navigateurs sans RA : bascule par QR code (Lot 6) ---
  if (onBasculeMobile) {
    return (
      <button type="button" className="outils__bouton outils__bouton--ra" onClick={onBasculeMobile}>
        <Icone nom="qr" /> Continuer sur mon téléphone
      </button>
    )
  }

  // Session pas encore ouverte : la bascule n'a rien à rattacher.
  return (
    <button
      type="button"
      className="outils__bouton outils__bouton--ra"
      disabled
      title="La bascule sera disponible dès l'ouverture de la session"
    >
      <Icone nom="ordinateur" /> Pas de RA sur cet appareil
    </button>
  )
}
