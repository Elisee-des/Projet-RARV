import { NavLink } from 'react-router-dom'
import {
  LuAccessibility,
  LuBoxes,
  LuChartNoAxesColumn,
  LuGraduationCap,
  LuHouse,
  LuRadio,
} from 'react-icons/lu'
import type { IconType } from 'react-icons'

interface Lien {
  vers: string
  libelle: string
  Icone: IconType
  aide: string
}

/**
 * Barre de navigation.
 *
 * ⚠️ **Aucune authentification.** Le projet est une démonstration de
 * portfolio : un recruteur doit pouvoir ouvrir n'importe quel écran en un clic,
 * y compris le tableau de bord formateur, sans compte ni mot de passe. Le
 * serveur applique la même règle via `RARV_DEMO_PUBLIC` — et pseudonymise les
 * identifiants d'apprenants partout où ils apparaîtraient.
 *
 * Les libellés disent **ce qu'on va voir**, pas le nom technique de l'écran :
 * « Tableau de bord formateur » et non « Dashboard », « Traçabilité xAPI » et
 * non « LRS ». Un visiteur qui ne connaît pas le domaine doit pouvoir choisir.
 */
const LIENS: Lien[] = [
  { vers: '/', libelle: 'Présentation', Icone: LuHouse, aide: 'Ce que fait le projet' },
  { vers: '/atelier', libelle: 'Atelier 3D', Icone: LuBoxes, aide: 'La formation, en 3D navigable' },
  {
    vers: '/accessible',
    libelle: 'Version accessible',
    Icone: LuAccessibility,
    aide: 'La même formation au clavier, sans 3D',
  },
  { vers: '/lecon', libelle: 'Leçon LMS', Icone: LuGraduationCap, aide: 'Intégration dans un LMS' },
  { vers: '/formateur', libelle: 'Tableau de bord', Icone: LuChartNoAxesColumn, aide: 'Résultats de la cohorte' },
  { vers: '/tracabilite', libelle: 'Traçabilité xAPI', Icone: LuRadio, aide: 'Déclarations envoyées au LRS' },
]

export default function Navbar() {
  return (
    /*
      Les `className` ci-dessous n'ont pas de style par défaut : ils servent
      uniquement de points d'accroche aux media queries d'index.css. Les
      styles de ce fichier étant des objets inline, une règle CSS ne peut les
      surcharger sans sélecteur explicite.
    */
    <header style={styles.barre} className="labo-barre">
      <div style={styles.marque} className="labo-marque">
        <span style={styles.pastille} aria-hidden="true" />
        <div>
          <p style={styles.titre}>Atelier de maintenance</p>
          <p style={styles.sousTitre} className="labo-sous-titre">
            Laboratoire de formation 3D · module labo-formation
          </p>
        </div>
      </div>

      <nav style={styles.nav} className="labo-nav" aria-label="Navigation principale">
        {LIENS.map(({ vers, libelle, Icone, aide }) => (
          <NavLink
            key={vers}
            to={vers}
            end={vers === '/'}
            title={aide}
            className="labo-lien"
            style={({ isActive }) => ({
              ...styles.lien,
              ...(isActive ? styles.lienActif : null),
            })}
          >
            <Icone size={16} aria-hidden="true" />
            <span>{libelle}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

/** Hauteur de la barre, en pixels — le contenu des pages s'y adosse. */
export const HAUTEUR_NAVBAR = 58

const styles: Record<string, React.CSSProperties> = {
  barre: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: HAUTEUR_NAVBAR,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '0 16px',
    borderBottom: '1px solid var(--bordure)',
    background: 'rgb(11 18 32 / 0.92)',
    backdropFilter: 'blur(10px)',
    zIndex: 50,
  },
  marque: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  pastille: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
  },
  titre: { margin: 0, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' },
  sousTitre: {
    margin: 0,
    fontSize: 10.5,
    color: 'var(--texte-doux)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' },
  lien: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    color: 'var(--texte-doux)',
    textDecoration: 'none',
    fontSize: 12.5,
    whiteSpace: 'nowrap',
  },
  lienActif: {
    color: 'var(--texte)',
    background: 'rgb(56 189 248 / 0.14)',
    borderColor: 'rgb(56 189 248 / 0.35)',
  },
}
