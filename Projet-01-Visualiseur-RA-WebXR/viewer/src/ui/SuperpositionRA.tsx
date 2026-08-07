import type { Annotation } from '../api/types'
import { ECHELLE_MAX, ECHELLE_MIN, type EtatPlacement } from '../viewer/xrStore'
import { Icone } from './Icone'
import { PanneauAnnotation } from './PanneauAnnotation'

type Props = {
  phase: EtatPlacement
  surfaceDetectee: boolean
  facteur: number
  consultees: number
  total: number
  selection: Annotation | null

  onRepositionner: () => void
  onEchelle: (delta: number) => void
  onRotation: (delta: number) => void
  onQuitter: () => void
  onFermerFiche: () => void
  onAnnotationPrecedente: () => void
  onAnnotationSuivante: () => void
}

/**
 * Étapes 5.6 et 5.9 — Interface superposée au flux caméra.
 *
 * La racine est en `pointer-events: none` et seuls les contrôles récupèrent
 * les événements. C'est indispensable : en mode dom-overlay, un tap sur une
 * zone NON interactive de la superposition est converti par le navigateur en
 * entrée WebXR — c'est ce qui permet de poser l'objet et de toucher les
 * pastilles. Une racine interactive absorberait tous ces gestes.
 */
export function SuperpositionRA({
  phase,
  surfaceDetectee,
  facteur,
  consultees,
  total,
  selection,
  onRepositionner,
  onEchelle,
  onRotation,
  onQuitter,
  onFermerFiche,
  onAnnotationPrecedente,
  onAnnotationSuivante,
}: Props) {
  return (
    <div className="superposition">
      <div className="superposition__haut">
        <button type="button" className="superposition__quitter" onClick={onQuitter}>
          <Icone nom="fermer" /> Quitter la RA
        </button>

        {phase === 'place' && total > 0 && (
          <span className="superposition__compteur">
            {consultees} / {total}
          </span>
        )}
      </div>

      {phase === 'recherche' && (
        <div className="superposition__consigne" role="status" aria-live="polite">
          {surfaceDetectee ? (
            <>
              <strong>Surface détectée</strong>
              <span>Touchez l'écran pour poser la pompe</span>
            </>
          ) : (
            <>
              <strong>Recherche d'une surface…</strong>
              <span>Balayez lentement le sol devant vous, à environ un mètre</span>
            </>
          )}
        </div>
      )}

      {phase === 'place' && !selection && (
        <div className="superposition__bas">
          <div className="superposition__groupe" role="group" aria-label="Taille de l'objet">
            <button
              type="button"
              onClick={() => onEchelle(-1)}
              disabled={facteur <= ECHELLE_MIN + 0.001}
              aria-label="Réduire la taille"
            >
              <Icone nom="reduire" taille={20} />
            </button>
            <span className="superposition__valeur">{Math.round(facteur * 100)} %</span>
            <button
              type="button"
              onClick={() => onEchelle(1)}
              disabled={facteur >= ECHELLE_MAX - 0.001}
              aria-label="Agrandir"
            >
              <Icone nom="agrandir" taille={20} />
            </button>
          </div>

          <div className="superposition__groupe" role="group" aria-label="Orientation">
            <button type="button" onClick={() => onRotation(-1)} aria-label="Pivoter à gauche">
              <Icone nom="pivoterGauche" taille={19} />
            </button>
            <button type="button" onClick={() => onRotation(1)} aria-label="Pivoter à droite">
              <Icone nom="pivoterDroite" taille={19} />
            </button>
          </div>

          <button type="button" className="superposition__replacer" onClick={onRepositionner}>
            <Icone nom="repositionner" /> Repositionner
          </button>
        </div>
      )}

      {selection && (
        <div className="superposition__fiche">
          <PanneauAnnotation
            annotation={selection}
            total={total}
            onFermer={onFermerFiche}
            onPrecedente={onAnnotationPrecedente}
            onSuivante={onAnnotationSuivante}
          />
        </div>
      )}
    </div>
  )
}
