import { useProgress } from '@react-three/drei'

type Props = {
  poster: string | null
  titre: string
}

/**
 * Étape 3.3 — Écran de chargement.
 *
 * La progression est RÉELLE (octets reçus via le gestionnaire de chargement
 * de Three.js), pas une animation décorative : sur un modèle de plusieurs
 * mégaoctets en 4G, une fausse barre est pire que pas de barre.
 */
export function EcranChargement({ poster, titre }: Props) {
  const { progress, item, loaded, total } = useProgress()
  const pourcent = Math.min(100, Math.round(progress))

  return (
    <div className="chargement" role="status" aria-live="polite">
      {poster && <img className="chargement__poster" src={poster} alt="" aria-hidden="true" />}

      <div className="chargement__contenu">
        <p className="chargement__titre">{titre}</p>

        <div
          className="chargement__piste"
          role="progressbar"
          aria-valuenow={pourcent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Chargement du modèle 3D"
        >
          <div className="chargement__barre" style={{ width: `${pourcent}%` }} />
        </div>

        <p className="chargement__detail">
          {pourcent}&nbsp;% {total > 0 && <span>· {loaded} / {total} fichiers</span>}
        </p>

        {item && <p className="chargement__fichier">{item.split('/').pop()}</p>}
      </div>
    </div>
  )
}
