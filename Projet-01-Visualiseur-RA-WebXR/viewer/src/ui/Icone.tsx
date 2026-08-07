import type { ComponentType } from 'react'
import {
  LuArrowLeft,
  LuBookOpen,
  LuBox,
  LuChartColumn,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuCircleCheck,
  LuCrosshair,
  LuExternalLink,
  LuEye,
  LuFileText,
  LuHouse,
  LuInfo,
  LuKey,
  LuLayers,
  LuLightbulb,
  LuList,
  LuLoaderCircle,
  LuMaximize,
  LuMinimize,
  LuMinus,
  LuMonitor,
  LuPencilLine,
  LuPlus,
  LuQrCode,
  LuRotateCcw,
  LuRotateCw,
  LuScan,
  LuSettings,
  LuSmartphone,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu'

/**
 * Jeu d'icônes du viewer et de l'éditeur.
 *
 * Une couche de nommage SÉMANTIQUE au-dessus de `react-icons` : le code appelle
 * `<Icone nom="repositionner"/>`, pas `<LuCrosshair/>`. Changer de bibliothèque
 * ou d'icône se fait alors dans ce seul fichier, sans toucher aux composants.
 *
 * Les pages servies par Laravel utilisent le composant Blade `<x-icone>`, qui
 * reprend le même jeu Lucide en SVG inline — React n'y étant pas disponible.
 */
const ICONES = {
  // Navigation
  accueil: LuHouse,
  lecon: LuBookOpen,
  cube: LuBox,
  reglages: LuSettings,
  graphique: LuChartColumn,
  cle: LuKey,
  externe: LuExternalLink,
  retour: LuArrowLeft,

  // Actions du viewer
  reinitialiser: LuRotateCcw,
  pleinEcran: LuMaximize,
  quitterPleinEcran: LuMinimize,
  versionTexte: LuList,
  fermer: LuX,

  // Réalité augmentée
  telephone: LuSmartphone,
  ordinateur: LuMonitor,
  qr: LuQrCode,
  repositionner: LuCrosshair,
  detection: LuScan,
  agrandir: LuPlus,
  reduire: LuMinus,
  pivoterGauche: LuRotateCcw,
  pivoterDroite: LuRotateCw,

  // Éditeur
  crayon: LuPencilLine,
  supprimer: LuTrash2,
  monter: LuChevronUp,
  descendre: LuChevronDown,
  precedent: LuChevronLeft,
  suivant: LuChevronRight,
  annotation: LuLayers,
  apercu: LuEye,

  // États
  valide: LuCheck,
  termine: LuCircleCheck,
  alerte: LuTriangleAlert,
  info: LuInfo,
  idee: LuLightbulb,
  document: LuFileText,
  chargement: LuLoaderCircle,
} as const satisfies Record<string, ComponentType<{ size?: number; className?: string }>>

export type NomIcone = keyof typeof ICONES

type Props = {
  nom: NomIcone
  taille?: number
  className?: string
}

export function Icone({ nom, taille = 16, className }: Props) {
  const Composant = ICONES[nom]

  // aria-hidden : l'icône double toujours un libellé ou un aria-label.
  // L'annoncer une seconde fois au lecteur d'écran serait du bruit.
  return (
    <span className={`icone ${className ?? ''}`} aria-hidden="true">
      <Composant size={taille} />
    </span>
  )
}
