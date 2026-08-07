import { useEffect, useState } from 'react'
import type { Diagnostic } from '../scene/Labo'
import type { GrapheScene } from '../scene/reperes'
import type { MesurePerf, Qualite } from '../scene/DetecteurPerf'
import { etatJoueur } from '../scene/etatJoueur'
import { useNavigation } from '../etat/navigation'
import { HAUTEUR_JOUEUR, RAYON_JOUEUR } from '../scene/collision'
import type { Environnement } from '../api/types'

interface Props {
  environnement: Environnement
  graphe: GrapheScene
  diagnostic: Diagnostic | null
  mesure: MesurePerf | null
  qualite: Qualite
  son: boolean
  onBasculerSon: () => void
  trianglesCollision: number
  posteProche: string | null
  repriseActive: boolean
  tactile: boolean
  visites: number
  termines: number
}

/**
 * Panneau de contrôle des Lots 3 et 4.
 *
 * Il tient lieu de panneau de profilage de l'étape 10.2 — framerate, draw
 * calls, triangles, qualité effective, taille du BVH. Ces chiffres doivent
 * rester visibles pendant le développement, sinon le budget du Lot 1 se dépasse
 * sans que personne ne s'en aperçoive avant le test sur téléphone.
 *
 * Le HUD de l'apprenant — « 5 / 8 postes • Score 42 / 60 • 12 min » — arrive au
 * Lot 7.1 et remplacera ce contenu.
 */
export default function Hud({
  environnement,
  graphe,
  diagnostic,
  mesure,
  qualite,
  son,
  onBasculerSon,
  trianglesCollision,
  posteProche,
  repriseActive,
  tactile,
  visites,
  termines,
}: Props) {
  const [cinematique, setCinematique] = useState({ x: 0, z: 0, vitesse: 0, auSol: true })
  const { allerVers, cible, enRoute, annuler } = useNavigation()

  useEffect(() => {
    const minuteur = setInterval(() => {
      setCinematique({
        x: etatJoueur.pieds.x,
        z: etatJoueur.pieds.z,
        vitesse: etatJoueur.vitesse,
        auSol: etatJoueur.auSol,
      })
    }, 100)

    return () => clearInterval(minuteur)
  }, [])

  const posteSuivant = graphe.points.find((poste) => poste.required && poste.code !== posteProche)
  const labelProche = graphe.points.find((poste) => poste.code === posteProche)?.label

  return (
    <div style={styles.panneau}>
      <h1 style={styles.titre}>Atelier de maintenance</h1>
      <p style={styles.sousTitre}>Lot 5 · système d'interaction</p>

      {/* Préfiguration du HUD apprenant de l'étape 7.1 */}
      <p style={styles.progression}>
        <strong>
          {termines} / {environnement.points.length}
        </strong>{' '}
        postes terminés · {visites} visités
      </p>

      {/* Étape 4.9 — l'issue de secours. Sans elle, un apprenant qui ne sait pas
          jouer aux FPS reste bloqué contre un mur et abandonne. */}
      <div style={styles.actions}>
        {enRoute ? (
          <button type="button" style={styles.boutonActif} onClick={annuler}>
            ⏹ En route… — annuler
          </button>
        ) : (
          posteSuivant && (
            <button type="button" style={styles.bouton} onClick={() => allerVers(posteSuivant.code)}>
              ➜ Aller au poste suivant
            </button>
          )
        )}
      </div>

      {posteProche && (
        <p style={styles.proche}>
          <strong>{labelProche}</strong> — à portée
        </p>
      )}

      <Section titre="Joueur">
        <Ligne cle="Position" valeur={`${cinematique.x.toFixed(1)} · ${cinematique.z.toFixed(1)} m`} />
        <Ligne cle="Vitesse" valeur={`${cinematique.vitesse.toFixed(1)} m/s`} />
        <Ligne cle="Au sol" valeur={cinematique.auSol ? 'oui' : 'non'} etat={cinematique.auSol ? 'ok' : 'alerte'} />
        <Ligne cle="Capsule" valeur={`r ${RAYON_JOUEUR} m · h ${HAUTEUR_JOUEUR} m`} />
        <Ligne cle="Reprise" valeur={repriseActive ? 'position restaurée' : 'départ au SPAWN'} />
      </Section>

      <Section titre="Scène">
        <Ligne
          cle="Postes depuis le .glb"
          valeur={`${diagnostic?.reperesGlb ?? 0} / ${environnement.points.length}`}
          etat={diagnostic && diagnostic.reperesGlb === environnement.points.length ? 'ok' : 'alerte'}
        />
        <Ligne cle="Apparition" valeur={`${graphe.spawn.source} · ${Math.round(graphe.spawn.lacet)}°`} />
        <Ligne cle="BVH collision" valeur={`${trianglesCollision} triangles`} etat="ok" />
        <Ligne
          cle="Lightmaps"
          valeur={
            environnement.assets.lightmaps.length === 0
              ? 'aucune (Lot 1.7)'
              : `${diagnostic?.lightmapsAppliquees ?? 0} matériaux`
          }
        />
      </Section>

      <Section titre="Performance">
        <Ligne
          cle="Framerate"
          valeur={mesure ? `${mesure.fps} fps` : 'mesure en cours…'}
          etat={mesure ? (mesure.fps >= 50 ? 'ok' : mesure.fps >= 28 ? 'alerte' : 'erreur') : 'neutre'}
        />
        <Ligne cle="Qualité" valeur={qualite} />
        <Ligne
          cle="Draw calls"
          valeur={mesure ? `${mesure.drawCalls} / 60` : '—'}
          etat={mesure && mesure.drawCalls <= 60 ? 'ok' : 'alerte'}
        />
        <Ligne cle="Triangles" valeur={mesure ? mesure.triangles.toLocaleString('fr-FR') : '—'} />
      </Section>

      {(diagnostic?.orphelins.length || diagnostic?.introuvables.length) ? (
        <Section titre="Incohérences">
          {diagnostic.introuvables.length > 0 && (
            <p style={styles.alerte}>Postes sans repère : {diagnostic.introuvables.join(', ')}</p>
          )}
          {diagnostic.orphelins.length > 0 && (
            <p style={styles.alerte}>Repères non réclamés : {diagnostic.orphelins.join(', ')}</p>
          )}
        </Section>
      ) : null}

      <button type="button" onClick={onBasculerSon} style={styles.bouton}>
        {son ? '🔊 Ambiance activée' : '🔇 Activer l’ambiance sonore'}
      </button>

      <p style={styles.pied}>
        {tactile
          ? 'Joystick en bas à gauche · glissez un doigt pour regarder · touchez un poste sur le plan.'
          : 'Cliquez pour capturer la souris · ZQSD ou WASD · Shift pour courir · Échap pour libérer.'}
      </p>

      {cible && <p style={styles.pied}>Cap sur {cible}.</p>}
    </div>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitre}>{titre}</h2>
      {children}
    </section>
  )
}

function Ligne({
  cle,
  valeur,
  etat = 'neutre',
}: {
  cle: string
  valeur: string
  etat?: 'neutre' | 'ok' | 'alerte' | 'erreur'
}) {
  const couleur =
    etat === 'ok'
      ? 'var(--ok)'
      : etat === 'alerte'
        ? '#fbbf24'
        : etat === 'erreur'
          ? 'var(--erreur)'
          : 'var(--texte)'

  return (
    <div style={styles.ligne}>
      <span style={styles.cle}>{cle}</span>
      <span style={{ ...styles.valeur, color: couleur }}>{valeur}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panneau: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 'min(300px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    zIndex: 13,
  },
  titre: { margin: 0, fontSize: 16, fontWeight: 700 },
  sousTitre: { margin: '2px 0 8px', fontSize: 11, color: 'var(--texte-doux)' },
  progression: {
    margin: '0 0 10px',
    padding: '6px 9px',
    borderRadius: 7,
    background: 'rgb(148 163 184 / 0.12)',
    fontSize: 12,
  },
  actions: { display: 'grid', gap: 6 },
  proche: {
    margin: '8px 0 0',
    padding: '6px 9px',
    borderRadius: 7,
    background: 'rgb(56 189 248 / 0.14)',
    fontSize: 12,
  },
  section: { marginTop: 12 },
  sectionTitre: {
    margin: '0 0 6px',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  ligne: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '1px 0' },
  cle: { color: 'var(--texte-doux)' },
  valeur: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  alerte: { margin: '4px 0', fontSize: 11.5, lineHeight: 1.5, color: '#fbbf24' },
  bouton: {
    marginTop: 10,
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 12.5,
    cursor: 'pointer',
  },
  boutonActif: {
    marginTop: 0,
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent)',
    color: '#06202e',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pied: { margin: '10px 0 0', fontSize: 10.5, lineHeight: 1.5, color: 'var(--texte-doux)' },
}
