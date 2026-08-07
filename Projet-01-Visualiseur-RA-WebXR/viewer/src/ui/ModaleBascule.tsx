import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { creerBascule, lireEtatSession, type EtatSession } from '../api/handoff'
import { Icone } from './Icone'

type Props = {
  jeton: string
  sessionId: string
  onFermer: () => void
}

const PERIODE_SONDAGE_MS = 3000

/**
 * Étapes 6.2 et 6.5 — Modale de bascule vers le mobile.
 *
 * Résout un vrai problème produit : le LMS se consulte sur ordinateur, la
 * réalité augmentée se vit sur téléphone. Plutôt que de laisser l'apprenant
 * devant un bouton inerte, on lui donne un QR code — et l'ordinateur suit
 * ce qu'il fait sur son téléphone, dans la même session.
 */
export function ModaleBascule({ jeton, sessionId, onFermer }: Props) {
  const [qr, setQr] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [restant, setRestant] = useState<number | null>(null)
  const [etatMobile, setEtatMobile] = useState<EtatSession | null>(null)
  const [copie, setCopie] = useState(false)
  const dialogue = useRef<HTMLDivElement>(null)

  // Création du lien puis rendu du QR code
  useEffect(() => {
    let annule = false

    async function preparer() {
      try {
        const bascule = await creerBascule(jeton, sessionId)
        if (annule) return

        setUrl(bascule.url)
        setRestant(bascule.expiresIn)
        setQr(
          await QRCode.toDataURL(bascule.url, {
            width: 260,
            margin: 1,
            color: { dark: '#0b1017', light: '#ffffff' },
          })
        )
      } catch (cause) {
        if (!annule) setErreur(cause instanceof Error ? cause.message : 'Erreur inattendue.')
      }
    }

    void preparer()

    return () => {
      annule = true
    }
  }, [jeton, sessionId])

  // Décompte d'expiration
  useEffect(() => {
    if (restant === null) return
    const minuterie = window.setInterval(() => setRestant((r) => (r === null ? null : Math.max(0, r - 1))), 1000)
    return () => window.clearInterval(minuterie)
  }, [restant !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // Étape 6.5 — sondage de la session pendant que le mobile travaille
  useEffect(() => {
    const controleur = new AbortController()

    const sonder = async () => {
      try {
        const etat = await lireEtatSession(jeton, sessionId, controleur.signal)
        setEtatMobile(etat)
      } catch {
        /* le sondage est accessoire : on réessaiera au tick suivant */
      }
    }

    void sonder()
    const minuterie = window.setInterval(() => void sonder(), PERIODE_SONDAGE_MS)

    return () => {
      controleur.abort()
      window.clearInterval(minuterie)
    }
  }, [jeton, sessionId])

  // Piégeage minimal du focus et fermeture au clavier
  useEffect(() => {
    dialogue.current?.focus()

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }

    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onFermer])

  const surMobile = Boolean(etatMobile?.basculeUtilisee)
  const enRa = Boolean(etatMobile?.enteredAr)
  const vues = etatMobile?.annotationsConsultees.length ?? 0

  return (
    <div className="modale" role="presentation" onClick={onFermer}>
      <div
        className="modale__boite"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bascule-titre"
        tabIndex={-1}
        ref={dialogue}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modale__entete">
          <h2 id="bascule-titre">Continuer sur votre téléphone</h2>
          <button type="button" className="fiche__fermer" onClick={onFermer} aria-label="Fermer">
            <Icone nom="fermer" />
          </button>
        </header>

        <p className="modale__texte">
          Cet ordinateur ne gère pas la réalité augmentée. Scannez ce code avec votre téléphone :
          la pompe s'y posera dans votre pièce, et <strong>votre progression restera la même</strong>.
        </p>

        {erreur && <p className="modale__erreur">{erreur}</p>}

        {!erreur && (
          <div className="modale__qr">
            {qr ? <img src={qr} alt="QR code de reprise sur mobile" width={260} height={260} /> : <p>Génération…</p>}
          </div>
        )}

        {url && (
          <div className="modale__lien">
            <code>{url}</code>
            <button
              type="button"
              className="outils__bouton"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopie(true)
                  window.setTimeout(() => setCopie(false), 2000)
                } catch {
                  /* presse-papiers refusé */
                }
              }}
            >
              {copie ? (
                <>
                  <Icone nom="valide" /> Copié
                </>
              ) : (
                'Copier'
              )}
            </button>
          </div>
        )}

        {restant !== null && restant > 0 && (
          <p className="modale__expiration">
            Lien valable encore {Math.floor(restant / 60)} min {String(restant % 60).padStart(2, '0')} s ·
            utilisable une seule fois
          </p>
        )}
        {restant === 0 && <p className="modale__erreur">Lien expiré — fermez et rouvrez cette fenêtre.</p>}

        <div className={`modale__etat ${surMobile ? 'modale__etat--actif' : ''}`} role="status" aria-live="polite">
          {!surMobile && (
            <span>
              <Icone nom="chargement" className="icone--tourne" /> En attente du scan…
            </span>
          )}
          {surMobile && !enRa && (
            <span>
              <Icone nom="telephone" /> Ouvert sur le téléphone
            </span>
          )}
          {enRa && (
            <span>
              <Icone nom="termine" /> Consulté en réalité augmentée sur mobile
              {vues > 0 && ` — ${vues} annotation${vues > 1 ? 's' : ''} vue${vues > 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
