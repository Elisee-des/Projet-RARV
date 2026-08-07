import { useMemo } from 'react'
import type { Annotation, ObjetPedagogique } from '../api/types'
import { assainirHtml } from './assainir'
import { Icone } from './Icone'

type Props = {
  objet: ObjetPedagogique
  visitees: ReadonlySet<number>
  onOuvrir: (annotation: Annotation) => void
  /** Affiché seul quand la 3D est impossible, en complément sinon. */
  autonome?: boolean
  onFermer?: () => void
}

/**
 * Étape 9.4 — Parcours alternatif accessible.
 *
 * Le contenu pédagogique est intégralement consultable SANS 3D : au clavier
 * seul, au lecteur d'écran, ou sur une machine sans WebGL. Ce n'est pas un
 * pis-aller — c'est la même information, dans un autre média.
 *
 * Point important : ce parcours **journalise comme le parcours 3D**. Un
 * apprenant qui consulte tout ici obtient sa complétion et ses déclarations
 * xAPI, exactement comme celui qui a manipulé le modèle.
 *
 * `<details>` plutôt qu'un accordéon maison : le clavier, le lecteur d'écran
 * et la recherche dans la page fonctionnent nativement.
 */
export function ParcoursTexte({ objet, visitees, onOuvrir, autonome = false, onFermer }: Props) {
  return (
    <section
      className={`parcours ${autonome ? 'parcours--autonome' : ''}`}
      aria-labelledby="parcours-titre"
    >
      <header className="parcours__entete">
        <div>
          <h2 id="parcours-titre">Version texte — {objet.title}</h2>
          <p className="parcours__sous-titre">
            {visitees.size} / {objet.annotations.length} consultées · même suivi que le parcours 3D
          </p>
        </div>

        {onFermer && (
          <button type="button" className="outils__bouton" onClick={onFermer}>
            <Icone nom="fermer" /> Fermer
          </button>
        )}
      </header>

      {objet.description && <p className="parcours__intro">{objet.description}</p>}

      <ol className="parcours__liste">
        {objet.annotations.map((annotation) => (
          <Fiche
            key={annotation.id}
            annotation={annotation}
            visitee={visitees.has(annotation.id)}
            onOuvrir={onOuvrir}
          />
        ))}
      </ol>
    </section>
  )
}

function Fiche({
  annotation,
  visitee,
  onOuvrir,
}: {
  annotation: Annotation
  visitee: boolean
  onOuvrir: (annotation: Annotation) => void
}) {
  const corps = useMemo(() => assainirHtml(annotation.bodyHtml), [annotation.bodyHtml])

  return (
    <li className="parcours__element">
      <details
        onToggle={(evenement) => {
          if ((evenement.currentTarget as HTMLDetailsElement).open) onOuvrir(annotation)
        }}
      >
        <summary>
          <span className="parcours__rang" aria-hidden="true">
            {annotation.order}
          </span>
          <span className="parcours__label">{annotation.title}</span>
          {visitee && (
            <span className="parcours__vu" role="img" aria-label="déjà consultée">
              <Icone nom="termine" taille={17} />
            </span>
          )}
        </summary>

        {/* Contenu déjà purifié côté serveur à l'écriture (étape 9.8) ;
            ce filtre est la seconde barrière. */}
        <div className="parcours__corps" dangerouslySetInnerHTML={{ __html: corps }} />

        {annotation.docUrl && (
          <a href={annotation.docUrl} target="_blank" rel="noopener noreferrer">
            <Icone nom="document" /> Fiche technique
          </a>
        )}
      </details>
    </li>
  )
}
