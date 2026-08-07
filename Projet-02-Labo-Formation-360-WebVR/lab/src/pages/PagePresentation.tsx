import { Link } from 'react-router-dom'
import {
  LuBoxes,
  LuChartNoAxesColumn,
  LuGraduationCap,
  LuRadio,
  LuShieldCheck,
  LuFootprints,
  LuFileCheck,
} from 'react-icons/lu'
import type { IconType } from 'react-icons'
import Page from '../ui/Page'

/**
 * Page d'accueil.
 *
 * Elle s'adresse à quelqu'un qui arrive **sans contexte** — un recruteur qui
 * ouvre un lien depuis un CV. Elle répond donc dans l'ordre : qu'est-ce que
 * c'est, qu'est-ce que je peux essayer, et qu'est-ce qui est difficile
 * là-dedans. Pas de compte, pas de formulaire : chaque écran s'ouvre en un clic.
 */

interface Ecran {
  vers: string
  titre: string
  texte: string
  Icone: IconType
}

const ECRANS: Ecran[] = [
  {
    vers: '/atelier',
    titre: 'Atelier 3D',
    texte:
      'La formation elle-même : une salle de maintenance parcourue à la première personne, huit postes à consulter, un quiz noté.',
    Icone: LuBoxes,
  },
  {
    vers: '/lecon',
    titre: 'Leçon LMS',
    texte:
      'La même formation embarquée dans une page de cours, via un Web Component. La leçon suit la progression en direct.',
    Icone: LuGraduationCap,
  },
  {
    vers: '/formateur',
    titre: 'Tableau de bord formateur',
    texte:
      'Taux de complétion, score moyen, questions les plus ratées et postes les moins visités — avec export CSV.',
    Icone: LuChartNoAxesColumn,
  },
  {
    vers: '/tracabilite',
    titre: 'Traçabilité xAPI',
    texte:
      'Les déclarations émises vers le Learning Record Store, telles qu’un LRS les recevrait.',
    Icone: LuRadio,
  },
]

interface Point {
  titre: string
  texte: string
  Icone: IconType
}

const POINTS: Point[] = [
  {
    titre: 'Le quiz est corrigé côté serveur',
    texte:
      'Le navigateur ne reçoit jamais l’indicateur de bonne réponse. Il envoie les cases cochées, le serveur corrige. Un test automatisé échoue si la chaîne « is_correct » apparaît dans une réponse HTTP — et un autre vérifie qu’aucun corrigé ne fuit dans les déclarations xAPI envoyées au LRS.',
    Icone: LuShieldCheck,
  },
  {
    titre: 'Les collisions sont une capsule contre un BVH',
    texte:
      'Pas de moteur physique : on n’empêche que de traverser un mur. Le BVH est bâti sur un mesh de collision de 180 triangles, jamais sur la géométrie visible — et il ressert au système d’interaction pour savoir si un poste est masqué. Une recette de 13 cas le vérifie sans navigateur.',
    Icone: LuFootprints,
  },
  {
    titre: 'L’attestation est générée par le serveur',
    texte:
      'PDF écrit sans dépendance, à partir de données relues en base. La règle de complétion est rejouée au moment de la délivrance : un poste rendu obligatoire après coup invalide une attestation déjà obtenue.',
    Icone: LuFileCheck,
  },
]

export default function PagePresentation() {
  return (
    <Page
      etape="Projet 02 · portfolio"
      titre="Un environnement de formation 3D, dans le navigateur"
      chapeau="L’apprenant se déplace dans un atelier de maintenance, s’approche des postes de travail et y déclenche des panneaux, des vidéos, des fiches techniques et un quiz noté. Le score et la progression sont gérés par un backend Laravel, et tout remonte en xAPI vers un Learning Record Store."
    >
      <section>
        <h2 style={styles.sousTitre}>Quatre écrans à parcourir</h2>
        <p style={styles.aide}>
          Aucun compte n’est demandé. Une identité d’apprenant vous est attribuée automatiquement à
          la première visite de l’atelier, et votre progression vous suit d’un écran à l’autre.
        </p>

        <div style={styles.grille}>
          {ECRANS.map(({ vers, titre, texte, Icone }) => (
            <Link key={vers} to={vers} style={styles.carte}>
              <Icone size={22} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <p style={styles.carteTitre}>{titre}</p>
              <p style={styles.carteTexte}>{texte}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={styles.sousTitre}>Ce qui est difficile là-dedans</h2>

        <div style={styles.points}>
          {POINTS.map(({ titre, texte, Icone }) => (
            <article key={titre} style={styles.point}>
              <Icone size={19} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <p style={styles.pointTitre}>{titre}</p>
                <p style={styles.pointTexte}>{texte}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.note}>
        <p style={styles.noteTitre}>Ce qui n’est pas terminé</p>
        <p style={styles.noteTexte}>
          La salle affichée est un <strong>blocking</strong> — des volumes gris aux dimensions
          réelles, générés par script. L’habillage, les textures et l’éclairage précalculé sont
          produits sous Blender, qui n’est pas installé sur la machine de développement. Les deux
          vidéos de formation ne sont pas tournées : le lecteur détecte leur absence et affiche le
          contenu écrit correspondant, si bien que le parcours reste complétable. Le mode casque VR
          est un lot bonus, non commencé.
        </p>
      </section>
    </Page>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sousTitre: { margin: '0 0 6px', fontSize: 16, fontWeight: 700 },
  aide: { margin: '0 0 16px', fontSize: 13, lineHeight: 1.65, color: 'var(--texte-doux)', maxWidth: '62ch' },
  grille: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(232px, 1fr))',
  },
  carte: {
    display: 'grid',
    gap: 7,
    alignContent: 'start',
    padding: '16px 16px 18px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.55)',
    textDecoration: 'none',
    color: 'var(--texte)',
  },
  carteTitre: { margin: 0, fontSize: 14.5, fontWeight: 700 },
  carteTexte: { margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--texte-doux)' },
  points: { display: 'grid', gap: 12 },
  point: {
    display: 'flex',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid var(--bordure)',
    background: 'rgb(15 23 42 / 0.4)',
  },
  pointTitre: { margin: 0, fontSize: 14, fontWeight: 600 },
  pointTexte: { margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.65, color: 'var(--texte-doux)' },
  note: {
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px dashed var(--bordure)',
  },
  noteTitre: { margin: 0, fontSize: 13, fontWeight: 600 },
  noteTexte: { margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.7, color: 'var(--texte-doux)', maxWidth: '70ch' },
}
