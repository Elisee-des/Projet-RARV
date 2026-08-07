import { useEffect, useState } from 'react'

/**
 * Détection des capacités de réalité augmentée.
 *
 * Version minimale de l'étape 5.1/5.2 — la machine à états complète arrive
 * au Lot 5. Règle absolue : jamais de bouton mort, chaque cas a son message.
 */
export type SupportRA = 'verification' | 'webxr' | 'quicklook' | 'indisponible'

export const LIBELLES_RA: Record<SupportRA, string> = {
  verification: 'Détection en cours…',
  webxr: 'WebXR immersive-ar disponible',
  quicklook: 'AR Quick Look (iOS) disponible',
  indisponible: 'Pas de RA sur cet appareil',
}

/**
 * Détection pure, extraite du hook pour être testable sans rendu React
 * (étape 9.5). L'ordre compte : WebXR d'abord, car un appareil qui gère la
 * vraie RA ne doit pas se retrouver sur le chemin dégradé d'iOS.
 */
export async function detecterSupportRA(): Promise<Exclude<SupportRA, 'verification'>> {
  // Android, Quest : session immersive-ar de WebXR
  if (navigator.xr) {
    try {
      if (await navigator.xr.isSessionSupported('immersive-ar')) return 'webxr'
    } catch {
      /* isSessionSupported rejette hors contexte sécurisé */
    }
  }

  // iOS : pas de WebXR, mais AR Quick Look via <a rel="ar">
  if (document.createElement('a').relList?.supports?.('ar')) return 'quicklook'

  return 'indisponible'
}

export function useSupportRA(): SupportRA {
  const [support, setSupport] = useState<SupportRA>('verification')

  useEffect(() => {
    let annule = false

    void detecterSupportRA().then((resultat) => {
      if (!annule) setSupport(resultat)
    })

    return () => {
      annule = true
    }
  }, [])

  return support
}
