import { useId, useState } from 'react'
import { paliers } from './palette'

/* ================================================================== *
 * Tuile de statistique
 * ================================================================== */

/**
 * Une valeur isolée n'est pas un graphique.
 *
 * Un histogramme à une barre pour afficher « 12 apprenants » est une figure
 * imposée qui n'apporte rien : le lecteur doit relire l'axe pour retrouver un
 * nombre déjà écrit. La tuile dit le chiffre, gros, avec son libellé.
 *
 * La valeur porte des chiffres **proportionnels** (par défaut) et non tabulaires :
 * à cette taille, `tabular-nums` donne à chaque chiffre la largeur d'un zéro et
 * un nombre comme « 121 » paraît décousu. Les chiffres tabulaires sont réservés
 * aux colonnes qui doivent s'aligner verticalement.
 */
export function TuileStat({
  libelle,
  valeur,
  appoint,
  accent = false,
}: {
  libelle: string
  valeur: string
  appoint?: string
  accent?: boolean
}) {
  return (
    <div style={styles.tuile}>
      <p style={styles.tuileLibelle}>{libelle}</p>
      <p style={{ ...styles.tuileValeur, color: accent ? 'var(--accent)' : 'var(--texte)' }}>
        {valeur}
      </p>
      {appoint && <p style={styles.tuileAppoint}>{appoint}</p>}
    </div>
  )
}

export function RangeeStats({ children }: { children: React.ReactNode }) {
  return <div style={styles.rangee}>{children}</div>
}

/* ================================================================== *
 * Barres horizontales
 * ================================================================== */

export interface Barre {
  cle: string
  libelle: string
  valeur: number
  /** Ligne secondaire, sous le libellé. */
  contexte?: string
  /** Texte du survol, en plus du libellé et de la valeur. */
  detail?: string
}

interface PropsBarres {
  barres: Barre[]
  /** Suffixe de la valeur affichée en bout de barre. */
  unite?: string
  /** Maximum de l'échelle. Par défaut, la plus grande valeur. */
  maximum?: number
  /** Message affiché quand il n'y a rien à tracer. */
  vide?: string
}

/**
 * Graphique en barres horizontales, **série unique**.
 *
 * Choix de forme : comparer des magnitudes avec des libellés longs
 * (« Dans quel ordre s'enchaînent les étapes d'une consignation… »). En
 * colonnes verticales, ces libellés seraient tournés à 45° ou tronqués ;
 * horizontalement ils se lisent normalement.
 *
 * ## Détails qui comptent
 *
 * - **Pas de légende.** Il n'y a qu'une série ; un cartouche à une pastille ne
 *   ferait que répéter le titre.
 * - **Bout de barre arrondi à 4 px, carré à la ligne de base.** La barre part
 *   d'une origine franche et se termine en douceur.
 * - **Barres de 18 px, espacées** — l'air entre les barres fait le travail de
 *   séparation, aucun contour n'est dessiné.
 * - **Valeur en bout de barre**, jamais dans la barre : un libellé posé dans une
 *   barre courte serait rogné.
 * - **Le texte ne porte jamais la couleur de la donnée.** Les libellés restent
 *   en encre neutre ; c'est la barre colorée à côté qui porte l'identité.
 */
export function BarresHorizontales({ barres, unite = '', maximum, vide }: PropsBarres) {
  const [survolee, setSurvolee] = useState<string | null>(null)
  const idBase = useId()

  if (barres.length === 0) {
    return <p style={styles.vide}>{vide ?? 'Aucune donnée pour l’instant.'}</p>
  }

  const echelle = maximum ?? Math.max(...barres.map((b) => b.valeur), 1)

  return (
    <div style={styles.graphique}>
      {barres.map((barre) => {
        const largeur = echelle > 0 ? Math.max(0, (barre.valeur / echelle) * 100) : 0
        const couleur = paliers(barre.valeur, echelle)
        const actif = survolee === barre.cle

        return (
          <div
            key={barre.cle}
            style={styles.ligne}
            onMouseEnter={() => setSurvolee(barre.cle)}
            onMouseLeave={() => setSurvolee(null)}
            onFocus={() => setSurvolee(barre.cle)}
            onBlur={() => setSurvolee(null)}
            tabIndex={0}
            aria-describedby={`${idBase}-${barre.cle}`}
          >
            <div style={styles.entete}>
              <span style={styles.libelle}>{barre.libelle}</span>
              <span style={styles.valeur}>
                {barre.valeur}
                {unite}
              </span>
            </div>

            <div style={styles.piste}>
              <div
                style={{
                  ...styles.barre,
                  width: `${largeur}%`,
                  background: couleur,
                  opacity: actif ? 1 : 0.92,
                }}
              />
            </div>

            {(barre.contexte || (actif && barre.detail)) && (
              <p id={`${idBase}-${barre.cle}`} style={styles.contexte}>
                {actif && barre.detail ? barre.detail : barre.contexte}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================== *
 * Cartouche de graphique
 * ================================================================== */

export function Cartouche({
  titre,
  legende,
  actions,
  children,
}: {
  titre: string
  legende?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={styles.cartouche}>
      <header style={styles.cartoucheEntete}>
        <div>
          <h2 style={styles.cartoucheTitre}>{titre}</h2>
          {legende && <p style={styles.cartoucheLegende}>{legende}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  rangee: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))',
  },
  tuile: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.55)',
  },
  tuileLibelle: { margin: 0, fontSize: 11.5, color: 'var(--texte-doux)' },
  tuileValeur: { margin: '5px 0 0', fontSize: 27, fontWeight: 600, lineHeight: 1.1 },
  tuileAppoint: { margin: '3px 0 0', fontSize: 11, color: 'var(--texte-doux)' },

  cartouche: {
    padding: '18px 20px 20px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.45)',
    display: 'grid',
    gap: 16,
  },
  cartoucheEntete: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  cartoucheTitre: { margin: 0, fontSize: 15.5, fontWeight: 700 },
  cartoucheLegende: { margin: '3px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--texte-doux)', maxWidth: '64ch' },

  graphique: { display: 'grid', gap: 14 },
  ligne: { display: 'grid', gap: 5, outline: 'none', cursor: 'default' },
  entete: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 },
  libelle: { fontSize: 12.5, lineHeight: 1.45, color: 'var(--texte)' },
  valeur: {
    fontSize: 12.5,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--texte-doux)',
    flexShrink: 0,
  },
  piste: {
    height: 18,
    borderRadius: 2,
    background: 'rgb(148 163 184 / 0.1)',
    overflow: 'hidden',
  },
  barre: {
    height: '100%',
    // Bout de donnée arrondi, base carrée : la barre part d'une origine franche.
    borderRadius: '2px 4px 4px 2px',
    transition: 'width 320ms ease-out, opacity 140ms',
  },
  contexte: { margin: 0, fontSize: 11, color: 'var(--texte-doux)' },
  vide: { margin: 0, fontSize: 12.5, color: 'var(--texte-doux)' },
}
