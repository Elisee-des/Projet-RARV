/**
 * Destinations de navigation vers les pages servies par Laravel.
 *
 * En production, le viewer vit sous `/viewer/` du MÊME domaine que l'API :
 * les liens sont donc relatifs à la racine, sans hôte à deviner. Aucun CORS,
 * aucune configuration d'origine à maintenir.
 *
 * En développement, les deux applications sont sur des ports distincts —
 * Vite en HTTPS sur 5173, Laravel en HTTP sur 8000 — d'où l'hôte explicite.
 *
 * `VITE_LMS_URL` force l'adresse si un jour les deux vivent sur des domaines
 * séparés.
 */
const base = (): string => {
  const declaree = import.meta.env.VITE_LMS_URL as string | undefined

  if (declaree) return declaree.replace(/\/$/, '')

  // Même origine en production : liens relatifs.
  if (import.meta.env.PROD) return ''

  return `http://${window.location.hostname}:8000`
}

export const liens = {
  accueil: () => base() || '/',
  lecon: (slug: string) => `${base()}/lecon/${slug}`,
  backOffice: () => `${base()}/admin/objets`,
  tableauDeBord: () => `${base()}/dashboard`,
}

/**
 * Le viewer est-il embarqué dans une leçon ?
 *
 * Dans une iframe, proposer « retour à la leçon » n'a aucun sens : l'apprenant
 * y est déjà. Les liens de navigation ne s'affichent donc qu'en plein écran.
 */
export function estEmbarque(): boolean {
  return window.parent !== window
}
