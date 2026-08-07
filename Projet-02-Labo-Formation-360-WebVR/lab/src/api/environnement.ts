import { appelApi, versMemeOrigine } from './client'
import type { Activite, Environnement } from './types'

const SLUG = 'atelier-maintenance-01'

interface ReponseJeton {
  token: string
  userRef?: string
  module: string
  expiresIn: number
}

/** Identité d'invité conservée entre les visites (étape 11.5). */
const CLE_INVITE = 'rarv.lab.invite'

/**
 * Récupère un jeton de consultation.
 *
 * Trois chemins, dans cet ordre de priorité :
 *
 * 1. **`?t=` dans l'URL** — le chemin réel en production : le SERVEUR du LMS
 *    émet le jeton et l'injecte dans l'URL de l'iframe.
 * 2. **`/api/guest-token`** — mode démonstration. Le serveur tire une identité
 *    d'invité, qu'on **mémorise** : sans cela, chaque rechargement créerait un
 *    nouvel apprenant et le visiteur perdrait sa progression à chaque F5.
 * 3. **`/api/dev/viewer-token`** — repli local, avec une identité fixe.
 */
export async function obtenirJeton(): Promise<string> {
  const parametres = new URLSearchParams(window.location.search)
  const fourni = parametres.get('t')

  if (fourni) return fourni

  // `userRef` peut être imposé par la page hôte (attribut `user-ref` du
  // Web Component) : c'est ce qui permet à une leçon LMS de rattacher le
  // parcours à son propre apprenant.
  const impose = parametres.get('userRef')
  const memorise = impose ?? lireInvite()

  const requete = memorise
    ? `/guest-token?slug=${SLUG}&userRef=${encodeURIComponent(memorise)}`
    : `/guest-token?slug=${SLUG}`

  try {
    const reponse = await appelApi<ReponseJeton>(requete)

    if (reponse.userRef && !impose) memoriserInvite(reponse.userRef)

    return reponse.token
  } catch {
    // Mode démonstration désactivé : on retombe sur la route locale.
    const reponse = await appelApi<ReponseJeton>(
      `/dev/viewer-token?slug=${SLUG}&userRef=apprenant-demo`
    )

    return reponse.token
  }
}

function lireInvite(): string | null {
  try {
    return localStorage.getItem(CLE_INVITE)
  } catch {
    return null
  }
}

function memoriserInvite(userRef: string): void {
  try {
    localStorage.setItem(CLE_INVITE, userRef)
  } catch {
    /* stockage indisponible : l'identité changera au prochain chargement */
  }
}

/** Étape 2.3 — fiche de l'environnement, publique. */
export async function chargerEnvironnement(slug = SLUG): Promise<Environnement> {
  const { data } = await appelApi<{ data: Environnement }>(`/environments/${slug}`)

  return normaliserUrls(data)
}

/**
 * Ramène toutes les URL d'assets à la même origine que la page.
 *
 * Fait ici, en un seul endroit, plutôt qu'au point d'usage : une URL absolue
 * oubliée dans un coin ne se voit qu'au moment du test sur téléphone, et
 * ressemble alors à une panne de réseau. Voir `versMemeOrigine`.
 */
function normaliserUrls(environnement: Environnement): Environnement {
  return {
    ...environnement,

    assets: {
      scene: versMemeOrigine(environnement.assets.scene),
      collision: versMemeOrigine(environnement.assets.collision),
      lightmaps: environnement.assets.lightmaps.map((url) => versMemeOrigine(url)),
    },

    points: environnement.points.map((poste) => ({
      ...poste,
      activity: normaliserActivite(poste.activity),
    })),
  }
}

/**
 * Le `switch` sur le type discriminant plutôt qu'une boucle sur des noms de
 * champs : chaque activité déclare explicitement ses URL, et ajouter un type
 * d'activité sans traiter ses assets devient une erreur de compilation.
 */
function normaliserActivite(activite: Activite): Activite {
  switch (activite.type) {
    case 'video':
      return {
        ...activite,
        src: versMemeOrigine(activite.src),
        poster: activite.poster ? versMemeOrigine(activite.poster) : undefined,
        captions: activite.captions ? versMemeOrigine(activite.captions) : undefined,
      }

    case 'document':
      return { ...activite, file: versMemeOrigine(activite.file) }

    case 'panel':
    case 'quiz':
      return activite
  }
}
