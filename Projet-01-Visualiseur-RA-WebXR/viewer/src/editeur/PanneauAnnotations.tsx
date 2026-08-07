import { useEffect, useRef, useState } from 'react'
import type { BrouillonAnnotation, ObjetEditable } from '../api/editeur'
import type { Annotation } from '../api/types'
import { Icone } from '../ui/Icone'
import type { Brouillon } from './Editeur'

type Props = {
  objet: ObjetEditable
  brouillon: Brouillon | null
  edition: Annotation | null
  occupe: boolean
  message: string | null
  erreur: string | null
  onAnnuler: () => void
  onEnregistrer: (champs: BrouillonAnnotation) => void
  onEditer: (annotation: Annotation) => void
  onSupprimer: (annotation: Annotation) => void
  onReordonner: (ids: number[]) => void
}

/**
 * Étapes 8.4 et 8.5 — Liste et formulaire des annotations.
 *
 * Le réordonnancement propose le glisser-déposer ET des boutons ↑ ↓. Le
 * glisser-déposer seul serait inutilisable au clavier et pénible au doigt :
 * les deux mécanismes coexistent, ils écrivent le même ordre.
 */
export function PanneauAnnotations({
  objet,
  brouillon,
  edition,
  occupe,
  message,
  erreur,
  onAnnuler,
  onEnregistrer,
  onEditer,
  onSupprimer,
  onReordonner,
}: Props) {
  const enSaisie = brouillon !== null || edition !== null

  return (
    <aside className="editeur__panneau">
      {message && (
        <p className="editeur__succes">
          <Icone nom="valide" /> {message}
        </p>
      )}
      {erreur && (
        <p className="editeur__erreur">
          <Icone nom="alerte" /> {erreur}
        </p>
      )}

      {enSaisie ? (
        <Formulaire
          brouillon={brouillon}
          edition={edition}
          occupe={occupe}
          onAnnuler={onAnnuler}
          onEnregistrer={onEnregistrer}
        />
      ) : (
        <Liste
          annotations={objet.annotations}
          onEditer={onEditer}
          onSupprimer={onSupprimer}
          onReordonner={onReordonner}
        />
      )}
    </aside>
  )
}

function Formulaire({
  brouillon,
  edition,
  occupe,
  onAnnuler,
  onEnregistrer,
}: {
  brouillon: Brouillon | null
  edition: Annotation | null
  occupe: boolean
  onAnnuler: () => void
  onEnregistrer: (champs: BrouillonAnnotation) => void
}) {
  const [label, setLabel] = useState('')
  const [titre, setTitre] = useState('')
  const [corps, setCorps] = useState('')
  const premierChamp = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLabel(brouillon?.label ?? edition?.label ?? '')
    setTitre(brouillon?.title ?? edition?.title ?? '')
    setCorps(brouillon?.bodyHtml ?? edition?.bodyHtml ?? '<p></p>')
    premierChamp.current?.focus()
  }, [brouillon, edition])

  const position = brouillon?.position ?? edition?.position ?? [0, 0, 0]
  const normale = brouillon?.normal ?? edition?.normal ?? null

  return (
    <form
      className="editeur__form"
      onSubmit={(e) => {
        e.preventDefault()
        onEnregistrer({ label, title: titre, bodyHtml: corps, position, normal: normale })
      }}
    >
      <h2>{edition ? `Annotation ${edition.order}` : 'Nouvelle annotation'}</h2>

      <p className="editeur__coord">
        Position locale [{position.map((v) => v.toFixed(3)).join(', ')}]
        {brouillon && <> · pièce « {brouillon.piece} »</>}
      </p>

      <label>
        <span>Étiquette courte</span>
        <input ref={premierChamp} value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={120} />
      </label>

      <label>
        <span>Titre de la fiche</span>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={255} />
      </label>

      <label>
        <span>Contenu (HTML)</span>
        <textarea value={corps} onChange={(e) => setCorps(e.target.value)} required rows={12} />
      </label>

      <p className="editeur__aide">
        Balises acceptées : <code>p</code>, <code>strong</code>, <code>ul</code>, <code>li</code>,
        <code>h4</code>. Classes utiles : <code>securite</code> (encadré rouge),
        <code>cle</code> (encadré bleu).
      </p>

      <div className="editeur__actions">
        <button type="submit" className="editeur__bouton" disabled={occupe}>
          {occupe ? 'Enregistrement…' : edition ? 'Modifier' : 'Ajouter'}
        </button>
        <button type="button" className="editeur__bouton editeur__bouton--fantome" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  )
}

function Liste({
  annotations,
  onEditer,
  onSupprimer,
  onReordonner,
}: {
  annotations: Annotation[]
  onEditer: (a: Annotation) => void
  onSupprimer: (a: Annotation) => void
  onReordonner: (ids: number[]) => void
}) {
  const glisse = useRef<number | null>(null)

  const deplacer = (depuis: number, vers: number) => {
    if (vers < 0 || vers >= annotations.length || depuis === vers) return

    const ids = annotations.map((a) => a.id)
    const [retire] = ids.splice(depuis, 1)
    ids.splice(vers, 0, retire)
    onReordonner(ids)
  }

  if (annotations.length === 0) {
    return (
      <div className="editeur__vide">
        <p>Aucune annotation.</p>
        <p className="editeur__aide">
          Cliquez sur une pièce du modèle, à gauche, pour poser la première.
        </p>
      </div>
    )
  }

  return (
    <>
      <h2>Annotations ({annotations.length})</h2>
      <p className="editeur__aide">
        Glissez pour réordonner, ou utilisez les flèches — l'ordre détermine le parcours de l'apprenant.
      </p>

      <ol className="editeur__liste">
        {annotations.map((annotation, index) => (
          <li
            key={annotation.id}
            draggable
            onDragStart={() => (glisse.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (glisse.current !== null) deplacer(glisse.current, index)
              glisse.current = null
            }}
          >
            <span className="editeur__rang">{annotation.order}</span>

            <button type="button" className="editeur__titre" onClick={() => onEditer(annotation)}>
              <strong>{annotation.label}</strong>
              <span>{annotation.title}</span>
            </button>

            <span className="editeur__fleches">
              <button type="button" onClick={() => deplacer(index, index - 1)} disabled={index === 0} aria-label="Monter">
                <Icone nom="monter" taille={14} />
              </button>
              <button type="button" onClick={() => deplacer(index, index + 1)} disabled={index === annotations.length - 1} aria-label="Descendre">
                <Icone nom="descendre" taille={14} />
              </button>
              <button type="button" onClick={() => onSupprimer(annotation)} aria-label="Supprimer" className="editeur__supprimer">
                <Icone nom="supprimer" taille={13} />
              </button>
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}
