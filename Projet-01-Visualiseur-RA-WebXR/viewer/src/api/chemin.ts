/**
 * Chemin de l'application, base de déploiement retirée.
 *
 * En développement le viewer est servi à la racine (`/`), en production sous
 * un sous-chemin (`/viewer/`). Les routes internes — `/ar/{token}` pour la
 * bascule QR, `/editeur/{slug}` pour l'éditeur — doivent être reconnues dans
 * les deux cas.
 *
 * Sans cette normalisation, la panne ne se verrait QU'EN PRODUCTION : en
 * local tout fonctionne, et une fois déployé le viewer ne reconnaît plus ses
 * propres URL, sans la moindre erreur affichée.
 */
export function cheminApplicatif(): string {
  const base = import.meta.env.BASE_URL || '/'
  const chemin = window.location.pathname

  if (base === '/') return chemin

  // Racine exacte de l'application, avec ou sans barre oblique finale.
  if (chemin === base || `${chemin}/` === base) return '/'

  // Un chemin hors de la base n'appartient pas à cette application : on le
  // renvoie tel quel, il ne correspondra à aucune route interne.
  if (!chemin.startsWith(base)) return chemin

  return `/${chemin.slice(base.length).replace(/^\/+/, '')}`
}
