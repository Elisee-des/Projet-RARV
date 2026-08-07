import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuBookOpen,
  LuCircleCheck,
  LuCircleDashed,
  LuClipboardCheck,
  LuFileText,
  LuTriangleAlert,
  LuVideo,
} from 'react-icons/lu'
import type { IconType } from 'react-icons'

import Page from '../ui/Page'
import ActiviteOuverte from '../ui/ActiviteOuverte'
import { RangeeStats, TuileStat } from '../ui/viz/Graphiques'
import { useSeance } from '../hooks/useSeance'
import { useInteraction } from '../etat/interaction'
import type { PointInteraction } from '../api/types'

/**
 * Étape 10.4 — **Parcours alternatif 2D.**
 *
 * > « Un double gain. C'est une obligation d'accessibilité (un apprenant au
 * > clavier, malvoyant ou sur machine sans WebGL doit pouvoir suivre la
 * > formation), c'est le support des tests E2E, et c'est le plan B du Lot 1 si
 * > la 3D dérape. Trois raisons de la construire, aucune de la sauter. »
 *
 * ## Ce n'est pas une version dégradée
 *
 * La formation est **la même** : mêmes postes, mêmes contenus, même quiz noté,
 * même correction serveur, même progression, même attestation. Seule disparaît
 * la salle 3D — c'est-à-dire l'habillage, pas la pédagogie. C'est le sens de
 * l'architecture depuis le Lot 0 : les activités n'ont jamais dépendu du moteur
 * de rendu, elles sont branchées sur l'API.
 *
 * ## Structure
 *
 * Une **liste ordonnée** de huit éléments, dans l'ordre du parcours. Pas de
 * grille : une grille n'a pas d'ordre de lecture évident au lecteur d'écran, et
 * l'ordre est justement l'information — c'est un parcours.
 *
 * ## Ce qui la rend réellement accessible
 *
 * - chaque poste est un `<button>` natif, donc atteignable au `Tab` et
 *   déclenchable à `Entrée` comme à `Espace`, sans code de gestion clavier ;
 * - l'état est porté par une **icône + un mot**, jamais par la couleur seule ;
 * - la progression est annoncée par une région `aria-live` ;
 * - aucun `<canvas>`, aucun WebGL, aucune dépendance au pointeur.
 */

const ICONES: Record<string, IconType> = {
  panel: LuBookOpen,
  video: LuVideo,
  document: LuFileText,
  quiz: LuClipboardCheck,
}

const TYPES: Record<string, string> = {
  panel: 'Panneau d’information',
  video: 'Vidéo',
  document: 'Document',
  quiz: 'Quiz noté',
}

export default function PageAccessible() {
  const {
    etat,
    seance,
    progression,
    ouvrirActivite,
    terminerActivite,
    recommencer,
  } = useSeance({ typeAppareil: 'accessible-2d', demanderReprise: false })

  const ouvert = useInteraction((e) => e.ouvert)
  const fermer = useInteraction((e) => e.fermer)
  const termines = useInteraction((e) => e.termines)
  const [attestation, setAttestation] = useState<'repos' | 'encours' | 'erreur'>('repos')

  const postes = seance?.environnement.points ?? []

  /**
   * ⚠️ Aucun type de Three.js ici.
   *
   * `ActiviteOuverte` acceptait initialement un `PointResolu`, dont la position
   * est un `Vector3`. Fabriquer un `Vector3` factice pour cette page aurait
   * fait entrer **tout Three.js** dans son morceau de bundle — sur la page
   * conçue pour les machines sans WebGL. Les composants d'activité ne
   * dépendent donc que de `PosteActivite`, qui ne connaît que le contenu.
   */
  const posteOuvert = useMemo(
    () => postes.find((p) => p.code === ouvert) ?? null,
    [ouvert, postes]
  )

  const telechargerAttestation = async () => {
    if (!seance) return

    setAttestation('encours')

    try {
      const reponse = await fetch('/api/attestation', {
        headers: { Authorization: `Bearer ${seance.jeton}`, Accept: 'application/pdf' },
      })

      if (!reponse.ok) throw new Error(String(reponse.status))

      const url = URL.createObjectURL(await reponse.blob())
      const lien = document.createElement('a')
      lien.href = url
      lien.download = 'attestation.pdf'
      lien.click()
      URL.revokeObjectURL(url)

      setAttestation('repos')
    } catch {
      setAttestation('erreur')
    }
  }

  if (etat.statut === 'erreur') {
    return (
      <Page etape="Étape 10.4" titre="Version accessible">
        <div style={styles.alerte}>
          <LuTriangleAlert size={20} style={{ flexShrink: 0, color: 'var(--erreur)' }} aria-hidden="true" />
          <div>
            <p style={styles.alerteTitre}>La formation n’a pas pu être chargée</p>
            <code style={styles.code}>{etat.message}</code>
          </div>
        </div>
      </Page>
    )
  }

  if (!seance || !progression) {
    return (
      <Page etape="Étape 10.4" titre="Version accessible">
        <p style={styles.attente}>Chargement de la formation…</p>
      </Page>
    )
  }

  const requis = postes.filter((p) => p.required)
  const requisFaits = requis.filter((p) => termines.includes(p.code)).length
  const meilleur = progression.quiz.best

  return (
    <Page
      etape="Étape 10.4"
      titre="Version accessible — sans 3D"
      chapeau="La formation complète, au clavier seul, sans WebGL ni carte graphique. Mêmes postes, mêmes contenus, même quiz noté corrigé côté serveur, même attestation. Seule la salle 3D disparaît."
      actions={
        <Link to="/atelier" style={styles.lienSecondaire}>
          Passer à la version 3D
        </Link>
      }
    >
      <RangeeStats>
        <TuileStat
          libelle="Postes obligatoires"
          valeur={`${requisFaits} / ${requis.length}`}
          appoint={`${termines.length} sur ${postes.length} au total`}
          accent={requisFaits === requis.length}
        />
        <TuileStat
          libelle="Évaluation"
          valeur={meilleur ? `${meilleur.score} / ${meilleur.maxScore}` : '—'}
          appoint={progression.quiz.passed ? 'seuil atteint' : 'non validée'}
          accent={progression.quiz.passed}
        />
        <TuileStat
          libelle="Progression"
          valeur={`${progression.completionPct} %`}
          appoint={progression.completed ? 'formation validée' : 'en cours'}
        />
      </RangeeStats>

      {/* La progression est annoncée aux lecteurs d'écran sans voler le focus. */}
      <p style={styles.annonce} role="status" aria-live="polite">
        {progression.completed
          ? 'Formation validée. Vous pouvez télécharger votre attestation.'
          : `Il vous reste ${progression.missingRequired.length} poste(s) obligatoire(s)${
              progression.quiz.passed ? '' : ' et l’évaluation'
            }.`}
      </p>

      <ol style={styles.liste}>
        {postes.map((poste, index) => (
          <LignePoste
            key={poste.code}
            poste={poste}
            numero={index + 1}
            termine={termines.includes(poste.code)}
            onOuvrir={() => ouvrirActivite(poste.code)}
          />
        ))}
      </ol>

      {progression.completed && (
        <section style={styles.fin}>
          <p style={styles.finTitre}>
            <LuCircleCheck size={17} style={{ color: 'var(--ok)' }} aria-hidden="true" /> Formation
            validée
          </p>
          <p style={styles.finTexte}>
            Vous avez consulté tous les postes obligatoires et réussi l’évaluation.
          </p>
          <div style={styles.finActions}>
            <button
              type="button"
              style={styles.boutonPrincipal}
              onClick={() => void telechargerAttestation()}
              disabled={attestation === 'encours'}
            >
              {attestation === 'encours' ? 'Génération…' : 'Télécharger mon attestation (PDF)'}
            </button>
            <button type="button" style={styles.bouton} onClick={() => void recommencer()}>
              Recommencer
            </button>
          </div>
          {attestation === 'erreur' && (
            <p style={styles.erreur}>L’attestation n’a pas pu être générée. Réessayez.</p>
          )}
        </section>
      )}

      {posteOuvert && (
        <ActiviteOuverte
          poste={posteOuvert}
          jeton={seance.jeton}
          sessionId={seance.sessionId}
          dejaTermine={termines.includes(posteOuvert.code)}
          onFermer={fermer}
          onTerminer={terminerActivite}
        />
      )}

      <p style={styles.mentions}>
        Cette version existe pour trois raisons : elle rend la formation suivable au clavier et au
        lecteur d’écran, elle sert de support aux tests automatisés de bout en bout — la 3D ne
        s’automatise pas — et elle est le plan de repli si la production de la salle 3D dérape.
      </p>
    </Page>
  )
}

function LignePoste({
  poste,
  numero,
  termine,
  onOuvrir,
}: {
  poste: PointInteraction
  numero: number
  termine: boolean
  onOuvrir: () => void
}) {
  const Icone = ICONES[poste.activity.type] ?? LuBookOpen
  const Etat = termine ? LuCircleCheck : LuCircleDashed

  return (
    <li style={styles.item}>
      <button
        type="button"
        onClick={onOuvrir}
        style={styles.ligne}
        data-poste={poste.code}
        data-termine={termine ? 'oui' : 'non'}
      >
        <span style={styles.numero} aria-hidden="true">
          {numero}
        </span>

        <Icone size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />

        <span style={styles.corps}>
          <span style={styles.libelle}>{poste.label}</span>
          <span style={styles.meta}>
            {TYPES[poste.activity.type] ?? poste.activity.type} ·{' '}
            {poste.required ? 'obligatoire' : 'facultatif'}
          </span>
        </span>

        {/* Icône ET mot : l'état ne repose jamais sur la couleur seule. */}
        <span style={{ ...styles.etat, color: termine ? 'var(--ok)' : 'var(--texte-doux)' }}>
          <Etat size={15} aria-hidden="true" />
          {termine ? 'Terminé' : 'À faire'}
        </span>
      </button>
    </li>
  )
}

const styles: Record<string, React.CSSProperties> = {
  annonce: {
    margin: 0,
    padding: '10px 14px',
    borderRadius: 9,
    background: 'rgb(148 163 184 / 0.1)',
    fontSize: 13,
    lineHeight: 1.55,
  },
  liste: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 },
  item: { margin: 0 },
  ligne: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    padding: '13px 15px',
    borderRadius: 11,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.5)',
    color: 'var(--texte)',
    textAlign: 'left',
    cursor: 'pointer',
    font: 'inherit',
  },
  numero: {
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    border: '1px solid var(--bordure)',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  corps: { display: 'grid', gap: 2, flex: 1, minWidth: 0 },
  libelle: { fontSize: 13.5, fontWeight: 600 },
  meta: { fontSize: 11.5, color: 'var(--texte-doux)' },
  etat: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 },
  fin: {
    padding: '16px 18px',
    borderRadius: 12,
    border: '1px solid var(--ok)',
    background: 'rgb(74 222 128 / 0.07)',
  },
  finTitre: { margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 },
  finTexte: { margin: '5px 0 13px', fontSize: 13, color: 'var(--texte-doux)' },
  finActions: { display: 'flex', gap: 9, flexWrap: 'wrap' },
  boutonPrincipal: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--ok)',
    color: '#06210f',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  bouton: {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    background: 'transparent',
    color: 'var(--texte)',
    fontSize: 13,
    cursor: 'pointer',
  },
  lienSecondaire: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--bordure)',
    color: 'var(--texte)',
    textDecoration: 'none',
    fontSize: 12.5,
  },
  erreur: { margin: '9px 0 0', fontSize: 12, color: 'var(--erreur)' },
  attente: { margin: 0, fontSize: 13, color: 'var(--texte-doux)' },
  alerte: { display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--bordure)' },
  alerteTitre: { margin: 0, fontSize: 14, fontWeight: 600 },
  code: { fontSize: 11, color: 'var(--texte-doux)' },
  mentions: { margin: 0, fontSize: 11.5, lineHeight: 1.65, color: 'var(--texte-doux)', maxWidth: '70ch' },
}
