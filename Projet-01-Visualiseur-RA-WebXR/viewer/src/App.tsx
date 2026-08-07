import { lazy, Suspense, useEffect, useState } from 'react'
import { ErreurApi, recupererObjet } from './api/client'
import { jetonEditeurDepuisUrl } from './api/editeur'
import { consommerBascule, jetonBasculeDepuisUrl, type Reprise } from './api/handoff'
import { estEmbarque, liens } from './api/liens'
import type { ObjetPedagogique } from './api/types'
import { Icone } from './ui/Icone'
import './App.css'

/**
 * Étape 9.3 — Three.js, drei et WebXR pèsent l'essentiel du poids. Chargés à
 * la demande, ils sortent du bundle initial : la fiche de l'objet s'affiche
 * pendant que le moteur 3D descend encore.
 */
const Viewer = lazy(() => import('./viewer/Viewer').then((m) => ({ default: m.Viewer })))
const Editeur = lazy(() => import('./editeur/Editeur').then((m) => ({ default: m.Editeur })))

type Etat =
  | { statut: 'chargement'; message: string }
  | { statut: 'ok'; objet: ObjetPedagogique; reprise: Reprise | null }
  | { statut: 'erreur'; message: string }

const SLUG_PAR_DEFAUT = 'pompe-centrifuge-01'

export default function App() {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement', message: 'Chargement de la fiche…' })

  // Lot 8 — mode éditeur, ouvert depuis le back-office avec un jeton `edit`.
  const editeur = jetonEditeurDepuisUrl()

  useEffect(() => {
    if (editeur) return
    const controleur = new AbortController()
    let annule = false

    async function demarrer() {
      let reprise: Reprise | null = null
      let slug = new URLSearchParams(window.location.search).get('objet') ?? SLUG_PAR_DEFAUT

      // Lot 6 — arrivée par scan du QR code affiché sur l'ordinateur.
      const jetonBascule = jetonBasculeDepuisUrl()

      if (jetonBascule) {
        setEtat({ statut: 'chargement', message: 'Reprise de votre session…' })

        try {
          reprise = await consommerBascule(jetonBascule)
          slug = reprise.slug
        } catch (cause) {
          if (annule) return
          setEtat({
            statut: 'erreur',
            message: cause instanceof Error ? cause.message : 'Lien de reprise invalide.',
          })
          return
        }
      }

      try {
        const objet = await recupererObjet(slug, controleur.signal)
        if (!annule) setEtat({ statut: 'ok', objet, reprise })
      } catch (erreur: unknown) {
        if (annule || (erreur instanceof DOMException && erreur.name === 'AbortError')) return

        setEtat({
          statut: 'erreur',
          message: erreur instanceof ErreurApi ? erreur.message : 'Erreur inattendue.',
        })
      }
    }

    void demarrer()

    return () => {
      annule = true
      controleur.abort()
    }
  }, [editeur])

  if (editeur) {
    return (
      <Suspense fallback={<Attente message="Chargement de l'éditeur…" />}>
        <Editeur slug={editeur.slug} jeton={editeur.jeton} />
      </Suspense>
    )
  }

  if (etat.statut === 'chargement') {
    return <Attente message={etat.message} />
  }

  if (etat.statut === 'erreur') {
    return (
      <div className="page page--centre">
        <div className="erreur__carte" role="alert">
          <p className="erreur__titre">
            <Icone nom="alerte" /> Contenu indisponible
          </p>
          <p className="erreur__message">{etat.message}</p>
          <nav className="erreur__liens" aria-label="Où aller ensuite">
            <a href="/">Visualiseur</a>
            <a href={liens.accueil()}>Accueil</a>
            <a href={liens.lecon(SLUG_PAR_DEFAUT)}>Leçon</a>
          </nav>
        </div>
      </div>
    )
  }

  const { objet, reprise } = etat

  return (
    <div className="page">
      {!estEmbarque() && (
        <nav className="ruban" aria-label="Navigation principale">
          <a href={liens.accueil()}>
            <Icone nom="accueil" /> Accueil
          </a>
          <a href={liens.lecon(objet.slug)}>
            <Icone nom="lecon" /> Leçon
          </a>
          <a href={liens.tableauDeBord()}>
            <Icone nom="graphique" /> Tableau de bord
          </a>
          <a href={liens.backOffice()}>
            <Icone nom="reglages" /> Back-office
          </a>
        </nav>
      )}

      <header className="entete">
        <div>
          <h1 className="entete__titre">{objet.title}</h1>
          {objet.category && <p className="entete__categorie">{objet.category}</p>}
        </div>

        <dl className="entete__mesures">
          <div>
            <dt>Annotations</dt>
            <dd>{objet.annotations.length}</dd>
          </div>
          <div>
            <dt>Triangles</dt>
            <dd>{objet.perf.triangles?.toLocaleString('fr-FR') ?? '—'}</dd>
          </div>
          <div>
            <dt>Poids</dt>
            <dd>{objet.perf.fileSizeKb ? `${objet.perf.fileSizeKb} Ko` : '—'}</dd>
          </div>
          <div>
            <dt>Placement</dt>
            <dd>{objet.placement.recommended}</dd>
          </div>
        </dl>
      </header>

      <Suspense fallback={<Attente message="Chargement du moteur 3D…" />}>
        <Viewer objet={objet} reprise={reprise} />
      </Suspense>
    </div>
  )
}

function Attente({ message }: { message: string }) {
  return (
    <div className="page page--centre">
      <p className="page__attente" role="status">
        {message}
      </p>
    </div>
  )
}
