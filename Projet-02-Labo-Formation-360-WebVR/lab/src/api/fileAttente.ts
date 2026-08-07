/**
 * Étape 7.7 — File d'attente hors-ligne.
 *
 * > « Bufferiser les événements en cas de coupure et rejouer à la reconnexion. »
 *
 * Le tampon en mémoire du Lot 5 survit à une coupure passagère, mais pas à un
 * rechargement ni à un onglet fermé : un apprenant qui perd le réseau dans un
 * atelier — un lieu où le Wi-Fi est rarement bon — perdrait tout son journal.
 *
 * D'où une persistance dans `localStorage`, et un rejeu déclenché par
 * l'événement `online`.
 *
 * ## Ce qui n'est PAS mis en file
 *
 * La **progression** n'y passe pas. Elle est idempotente et cumulative : le
 * dernier état complet suffit, rejouer d'anciens instantanés ne ferait que
 * réécrire du plus ancien par-dessus du plus récent. Sa propre sauvegarde
 * débouncée conserve déjà l'instantané en attente jusqu'au succès.
 *
 * Les **événements**, eux, sont un journal : chacun compte, et l'ordre compte.
 */

const CLE = 'rarv.lab.file-attente'
const MAX = 200

export interface EntreeFile {
  /** Chemin relatif, sans le préfixe /api. */
  chemin: string
  methode: 'POST' | 'PUT'
  corps: unknown
  /** Horodatage d'émission, pour purger ce qui est trop vieux. */
  emisA: number
}

/** Au-delà, l'information n'a plus de valeur d'analyse. */
const PEREMPTION_MS = 24 * 60 * 60 * 1000

function lire(): EntreeFile[] {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return []

    const entrees = JSON.parse(brut) as EntreeFile[]
    const limite = Date.now() - PEREMPTION_MS

    return Array.isArray(entrees) ? entrees.filter((e) => e.emisA > limite) : []
  } catch {
    // `localStorage` peut être indisponible : navigation privée sur certains
    // navigateurs, quota dépassé, stockage bloqué par une politique. La file
    // dégrade alors en « rien de persisté », ce qui reste préférable à une
    // application qui refuse de démarrer.
    return []
  }
}

function ecrire(entrees: EntreeFile[]): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(entrees.slice(-MAX)))
  } catch {
    /* stockage indisponible ou plein */
  }
}

export function creerFileAttente(jeton: string) {
  let rejeuEnCours = false

  const empiler = (entree: Omit<EntreeFile, 'emisA'>) => {
    ecrire([...lire(), { ...entree, emisA: Date.now() }])
  }

  /**
   * Rejoue la file, dans l'ordre, en s'arrêtant au premier échec.
   *
   * S'arrêter plutôt que continuer est délibéré : si le réseau est encore
   * coupé, insister sur les 200 entrées suivantes ne ferait qu'accumuler des
   * erreurs. Et l'ordre du journal doit être préservé.
   */
  const rejouer = async (): Promise<number> => {
    if (rejeuEnCours) return 0

    rejeuEnCours = true
    let rejouees = 0

    try {
      let restantes = lire()

      while (restantes.length > 0) {
        const entree = restantes[0]

        const reponse = await fetch(`/api${entree.chemin}`, {
          method: entree.methode,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify(entree.corps),
        })

        // 4xx : la requête est définitivement invalide — session expirée,
        // format refusé. La rejouer indéfiniment bloquerait toute la file
        // derrière elle. On l'abandonne, en la comptant comme traitée.
        if (!reponse.ok && reponse.status < 500) {
          restantes = restantes.slice(1)
          ecrire(restantes)
          continue
        }

        if (!reponse.ok) break // 5xx ou réseau : on retentera plus tard

        restantes = restantes.slice(1)
        ecrire(restantes)
        rejouees++
      }
    } catch {
      // Réseau toujours coupé : la file reste intacte pour le prochain essai.
    } finally {
      rejeuEnCours = false
    }

    return rejouees
  }

  const surReconnexion = () => void rejouer()

  window.addEventListener('online', surReconnexion)

  return {
    empiler,
    rejouer,
    enAttente: () => lire().length,
    arreter: () => window.removeEventListener('online', surReconnexion),
  }
}
