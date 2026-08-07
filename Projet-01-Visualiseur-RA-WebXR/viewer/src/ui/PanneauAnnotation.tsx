import { useEffect, useMemo, useRef } from 'react'
import type { Annotation } from '../api/types'
import { assainirHtml } from './assainir'
import { Icone } from './Icone'

type Props = {
  annotation: Annotation
  total: number
  onFermer: () => void
  onPrecedente: () => void
  onSuivante: () => void
}

/**
 * Étape 4.4 — Fiche d'annotation.
 *
 * Panneau latéral sur grand écran, feuille remontant du bas sur mobile —
 * une seule structure, deux mises en page (voir App.css).
 */
export function PanneauAnnotation({
  annotation,
  total,
  onFermer,
  onPrecedente,
  onSuivante,
}: Props) {
  const conteneur = useRef<HTMLElement>(null)

  const corps = useMemo(() => assainirHtml(annotation.bodyHtml), [annotation.bodyHtml])

  // Le focus part sur le panneau à l'ouverture : un lecteur d'écran annonce
  // la fiche, et Échap ou Tab agissent immédiatement au bon endroit.
  useEffect(() => {
    conteneur.current?.focus()
  }, [annotation.id])

  return (
    <aside
      ref={conteneur}
      className="fiche"
      role="dialog"
      aria-modal="false"
      aria-labelledby="fiche-titre"
      tabIndex={-1}
    >
      <header className="fiche__entete">
        <p className="fiche__rang">
          Annotation {annotation.order} sur {total}
        </p>
        <button
          type="button"
          className="fiche__fermer"
          onClick={onFermer}
          aria-label="Fermer la fiche (Échap)"
        >
          <Icone nom="fermer" />
        </button>
      </header>

      <h2 className="fiche__titre" id="fiche-titre">
        {annotation.title}
      </h2>

      {annotation.mediaUrl && (
        <img className="fiche__media" src={annotation.mediaUrl} alt="" />
      )}

      {/* Contenu assaini côté client ; purification de référence en 9.8. */}
      <div className="fiche__corps" dangerouslySetInnerHTML={{ __html: corps }} />

      {annotation.docUrl && (
        <a className="fiche__doc" href={annotation.docUrl} target="_blank" rel="noopener noreferrer">
          <Icone nom="document" /> Fiche technique
        </a>
      )}

      <nav className="fiche__navigation" aria-label="Navigation entre annotations">
        <button type="button" className="outils__bouton" onClick={onPrecedente}>
          <Icone nom="precedent" /> Précédente
        </button>
        <button type="button" className="outils__bouton" onClick={onSuivante}>
          Suivante <Icone nom="suivant" />
        </button>
      </nav>
    </aside>
  )
}
