import { useState } from 'react'
import { useReglages } from '../etat/reglages'

/**
 * Étape 4.7 — Réglages de confort visuel.
 *
 * Repliés par défaut : ce n'est pas un panneau qu'on consulte en permanence,
 * mais un recours pour l'apprenant qui commence à se sentir mal. Il doit être
 * trouvable en deux secondes, sans occuper l'écran le reste du temps.
 */
export default function Confort() {
  const [ouvert, setOuvert] = useState(false)
  const { sensibilite, fov, vignette, mouvementReduit, regler } = useReglages()

  return (
    <div style={styles.cadre}>
      <button
        type="button"
        style={styles.bascule}
        onClick={() => setOuvert((etat) => !etat)}
        aria-expanded={ouvert}
      >
        ⚙︎ Confort {ouvert ? '▾' : '▸'}
      </button>

      {ouvert && (
        <div style={styles.contenu}>
          <Curseur
            libelle="Sensibilité"
            valeur={sensibilite}
            min={0.4}
            max={2.5}
            pas={0.1}
            format={(v) => `×${v.toFixed(1)}`}
            onChange={(v) => regler({ sensibilite: v })}
          />

          <Curseur
            libelle="Champ de vision"
            valeur={fov}
            min={55}
            max={85}
            pas={1}
            format={(v) => `${v}°`}
            onChange={(v) => regler({ fov: v })}
            aide="Un champ large réduit la sensation d'enfermement."
          />

          <Interrupteur
            libelle="Vignettage au déplacement"
            actif={vignette}
            onChange={(v) => regler({ vignette: v })}
            aide="Assombrit la périphérie quand vous avancez. Réduit le mal des transports."
          />

          <Interrupteur
            libelle="Mouvement réduit"
            actif={mouvementReduit}
            onChange={(v) => regler({ mouvementReduit: v })}
            aide="Le déplacement guidé vous téléporte au lieu de faire glisser la caméra."
          />

          <p style={styles.note}>
            Aucun balancement de caméra n'est appliqué à la marche, quel que soit le réglage —
            c'est la première cause de nausée en vue subjective.
          </p>
        </div>
      )}
    </div>
  )
}

function Curseur({
  libelle,
  valeur,
  min,
  max,
  pas,
  format,
  onChange,
  aide,
}: {
  libelle: string
  valeur: number
  min: number
  max: number
  pas: number
  format: (v: number) => string
  onChange: (v: number) => void
  aide?: string
}) {
  return (
    <label style={styles.champ}>
      <span style={styles.ligneChamp}>
        <span>{libelle}</span>
        <span style={styles.valeur}>{format(valeur)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(evenement) => onChange(Number(evenement.target.value))}
        style={styles.curseur}
      />
      {aide && <span style={styles.aide}>{aide}</span>}
    </label>
  )
}

function Interrupteur({
  libelle,
  actif,
  onChange,
  aide,
}: {
  libelle: string
  actif: boolean
  onChange: (v: boolean) => void
  aide?: string
}) {
  return (
    <label style={styles.champ}>
      <span style={styles.ligneChamp}>
        <span>{libelle}</span>
        <input type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} />
      </span>
      {aide && <span style={styles.aide}>{aide}</span>}
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  cadre: { position: 'fixed', right: 16, bottom: 16, zIndex: 15, width: 'min(266px, calc(100vw - 32px))' },
  bascule: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    color: 'var(--texte)',
    fontSize: 12.5,
    textAlign: 'left',
    cursor: 'pointer',
  },
  contenu: {
    marginTop: 8,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--bordure)',
    background: 'var(--fond-panneau)',
    backdropFilter: 'blur(8px)',
    display: 'grid',
    gap: 12,
  },
  champ: { display: 'grid', gap: 4, fontSize: 12 },
  ligneChamp: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  valeur: { fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' },
  curseur: { width: '100%', accentColor: 'var(--accent)' },
  aide: { fontSize: 10.5, lineHeight: 1.45, color: 'var(--texte-doux)' },
  note: { margin: 0, fontSize: 10.5, lineHeight: 1.45, color: 'var(--texte-doux)' },
}
