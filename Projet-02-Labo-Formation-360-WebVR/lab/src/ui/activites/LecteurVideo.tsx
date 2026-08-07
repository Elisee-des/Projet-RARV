import { useEffect, useMemo, useRef, useState } from 'react'
import { assainir } from '../assainir'
import type { ActiviteVideo } from '../../api/types'

interface Props {
  activite: ActiviteVideo
  dejaTermine: boolean
  onTerminer: () => void
}

/**
 * Étapes 6.6 à 6.9 — Lecteur vidéo.
 *
 * ## Modale plein écran, pas `VideoTexture` (6.6)
 *
 * Le plan laisse le choix. On retient la modale HTML : les sous-titres, les
 * commandes natives, le plein écran, la lecture en arrière-plan sur iOS et
 * l'accessibilité au lecteur d'écran sont fournis gratuitement par l'élément
 * `<video>`. Une `VideoTexture` demanderait de tout réimplémenter en 3D, pour
 * un gain d'immersion qui ne compense pas. Le seul contexte qui l'imposera est
 * la VR du Lot 8, où les modales HTML sont invisibles.
 *
 * ## ⚠️ Le piège des politiques d'autoplay (6.7)
 *
 * Le plan le désigne comme « le piège classique du mode vidéo : une
 * `VideoTexture` qui ne démarre jamais sur iPhone parce que la lecture n'a pas
 * été déclenchée par un geste utilisateur, sans aucune erreur ».
 *
 * Trois précautions, toutes obligatoires :
 *
 * 1. **`playsInline`** — sans lui, iOS bascule en lecteur plein écran natif et
 *    reprend la main sur toute l'interface.
 * 2. **Lecture sur geste utilisateur uniquement.** Aucun `play()` automatique
 *    au montage : il serait rejeté silencieusement.
 * 3. **Son coupé au départ, réactivable.** Une vidéo muette est autorisée à
 *    démarrer partout ; une vidéo sonore ne l'est nulle part sans geste. On
 *    démarre donc muet et on propose d'activer le son.
 *
 * ## Complétion (6.8)
 *
 * Marquée à **90 %** de la durée, pas à la fin : le générique et les dernières
 * secondes sont rarement regardés, et exiger 100 % empêcherait de valider un
 * poste pour trois secondes de noir.
 */
export default function LecteurVideo({ activite, dejaTermine, onTerminer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [progression, setProgression] = useState(0)
  const [muet, setMuet] = useState(true)
  const [enLecture, setEnLecture] = useState(false)
  const [indisponible, setIndisponible] = useState(false)
  const [termine, setTermine] = useState(dejaTermine)

  const seuil = activite.completionRatio ?? 0.9
  const resume = useMemo(
    () => (activite.summaryHtml ? assainir(activite.summaryHtml) : ''),
    [activite.summaryHtml]
  )

  useEffect(() => {
    const element = video.current
    if (!element) return

    const surTemps = () => {
      if (!element.duration || Number.isNaN(element.duration)) return

      const rapport = element.currentTime / element.duration
      setProgression(rapport)

      if (!termine && rapport >= seuil) {
        setTermine(true)
        onTerminer()
      }
    }

    // ⚠️ L'événement `error` d'un <video> ne remonte PAS par bouillonnement :
    // il faut l'écouter sur l'élément lui-même. C'est pourquoi une source
    // manquante donne si souvent un lecteur noir et muet, sans message.
    //
    // ⚠️ Et il ne suffit pas. Quand la source est déclarée par un `<source>`
    // enfant plutôt que par l'attribut `src`, l'échec de chargement déclenche
    // `error` sur le `<source>`, pas systématiquement sur le `<video>` — la
    // spécification ne le garantit qu'après épuisement de toutes les sources,
    // et les navigateurs divergent sur le moment. On écoute donc les deux,
    // sans quoi le repli n'apparaît jamais et l'apprenant reste devant un
    // rectangle noir.
    const surErreur = () => setIndisponible(true)
    const sources = Array.from(element.querySelectorAll('source'))

    for (const source of sources) {
      source.addEventListener('error', surErreur)
    }
    const surLecture = () => setEnLecture(true)
    const surPause = () => setEnLecture(false)

    element.addEventListener('timeupdate', surTemps)
    element.addEventListener('error', surErreur)
    element.addEventListener('play', surLecture)
    element.addEventListener('pause', surPause)

    return () => {
      element.removeEventListener('timeupdate', surTemps)
      element.removeEventListener('error', surErreur)
      element.removeEventListener('play', surLecture)
      element.removeEventListener('pause', surPause)

      for (const source of sources) {
        source.removeEventListener('error', surErreur)
      }
    }
  }, [onTerminer, seuil, termine])

  /** Le SEUL point d'entrée de la lecture : un geste utilisateur. */
  const demarrer = async () => {
    const element = video.current
    if (!element) return

    try {
      await element.play()
    } catch {
      // Rejet malgré le geste : source illisible, ou politique plus stricte.
      setIndisponible(true)
    }
  }

  const activerSon = () => {
    const element = video.current
    if (!element) return

    element.muted = false
    setMuet(false)
  }

  return (
    <div style={styles.contenu}>
      <h2 style={styles.titre}>{activite.title}</h2>

      {indisponible ? (
        <SourceAbsente resume={resume} termine={termine} onTerminer={() => { setTermine(true); onTerminer() }} />
      ) : (
        <>
          <div style={styles.cadre}>
            <video
              ref={video}
              style={styles.video}
              // (1) sans playsInline, iOS prend le plein écran natif
              playsInline
              // (3) muet au départ — seule condition pour être autorisé partout
              muted={muet}
              controls
              preload="metadata"
              poster={activite.poster}
              crossOrigin="anonymous"
            >
              <source src={activite.src} type="video/mp4" />

              {/* 6.9 — sous-titres. Exigence d'accessibilité, et argument
                  sérieux en formation professionnelle. */}
              {activite.captions && (
                <track
                  kind="subtitles"
                  src={activite.captions}
                  srcLang="fr"
                  label="Français"
                  default
                />
              )}
            </video>
          </div>

          <div style={styles.commandes}>
            {/* (2) aucun play() automatique : la lecture part d'ici */}
            {!enLecture && (
              <button type="button" style={styles.principal} onClick={() => void demarrer()}>
                ▶ Lancer la vidéo
              </button>
            )}

            {muet && (
              <button type="button" style={styles.secondaire} onClick={activerSon}>
                🔊 Activer le son
              </button>
            )}
          </div>

          <div style={styles.piste} aria-hidden="true">
            <div style={{ ...styles.jauge, width: `${Math.min(100, progression * 100)}%` }} />
            <div style={{ ...styles.seuil, left: `${seuil * 100}%` }} />
          </div>

          <p style={styles.legende}>
            {termine
              ? '✓ Vidéo vue — poste terminé'
              : `Lecture ${Math.round(progression * 100)} % — le poste est validé à ${Math.round(seuil * 100)} %`}
          </p>
        </>
      )}

      {resume && !indisponible && (
        <details style={styles.resume}>
          <summary style={styles.resumeTitre}>Résumé écrit</summary>
          <div style={styles.riche} dangerouslySetInnerHTML={{ __html: resume }} />
        </details>
      )}
    </div>
  )
}

/**
 * Repli quand le fichier vidéo n'existe pas encore (point B6 du suivi).
 *
 * Le contenu pédagogique, lui, **existe** : il a été rédigé à l'étape 0.2 et
 * vit en base. On l'affiche donc en toutes lettres, et le poste reste
 * validable. Un parcours bloqué parce qu'un asset manque serait une régression
 * bien plus grave que l'absence de la vidéo.
 */
function SourceAbsente({
  resume,
  termine,
  onTerminer,
}: {
  resume: string
  termine: boolean
  onTerminer: () => void
}) {
  return (
    <div style={styles.repli}>
      <p style={styles.avertissement}>
        📼 La vidéo de ce poste n'est pas encore produite. Le contenu pédagogique ci-dessous en
        reprend l'intégralité — vous pouvez valider le poste normalement.
      </p>

      {resume && <div style={styles.riche} dangerouslySetInnerHTML={{ __html: resume }} />}

      {!termine && (
        <button type="button" style={styles.principal} data-valider="video-repli" onClick={onTerminer}>
          J'ai lu ce contenu — marquer le poste terminé
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  contenu: { display: 'grid', gap: 12 },
  titre: { margin: 0, fontSize: 16, fontWeight: 700 },
  cadre: { position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' },
  video: { display: 'block', width: '100%', maxHeight: '46vh', background: '#000' },
  commandes: { display: 'flex', gap: 9, flexWrap: 'wrap' },
  principal: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaire: {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 13,
    cursor: 'pointer',
  },
  piste: {
    position: 'relative',
    height: 5,
    borderRadius: 3,
    background: 'rgb(148 163 184 / 0.2)',
    overflow: 'hidden',
  },
  jauge: { height: '100%', background: 'var(--accent)' },
  seuil: { position: 'absolute', top: 0, width: 2, height: '100%', background: 'var(--ok)' },
  legende: { margin: 0, fontSize: 11.5, color: 'var(--texte-doux)' },
  repli: {
    display: 'grid',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    border: '1px dashed var(--bordure)',
  },
  avertissement: { margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#fbbf24' },
  resume: { fontSize: 13 },
  resumeTitre: { cursor: 'pointer', color: 'var(--accent)', fontSize: 12.5 },
  riche: { fontSize: 13, lineHeight: 1.6 },
}
