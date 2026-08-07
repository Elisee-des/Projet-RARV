/**
 * Génère les assets pédagogiques du Lot 6 qui peuvent l'être sans production
 * audiovisuelle : les deux fiches PDF et les deux fichiers de sous-titres.
 *
 * Le contenu vient intégralement de `docs/contenu.md`, rédigé à l'étape 0.2 —
 * il n'est pas inventé ici, il est mis en forme.
 *
 * ## Pourquoi écrire le PDF à la main
 *
 * Pour deux fiches d'une page, une bibliothèque de génération PDF ajouterait
 * une dépendance de plusieurs mégaoctets. Le format PDF est du texte : un
 * catalogue d'objets, une table de références croisées, un trailer. Les polices
 * de base (Helvetica) sont garanties présentes dans tout lecteur, donc rien à
 * embarquer.
 *
 * ## Ce qui reste à produire
 *
 * Les deux **vidéos** (point B6 du suivi). Elles ne se génèrent pas par script.
 * Le lecteur du Lot 6 se replie proprement sur le résumé écrit tant qu'elles
 * n'existent pas, et le poste reste validable.
 *
 * Usage : node scripts/generer-assets-pedagogiques.mjs <dossier-de-sortie>
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/* ------------------------------------------------------------------ *
 * Écriture PDF minimale
 * ------------------------------------------------------------------ */

const A4 = { largeur: 595.28, hauteur: 841.89 }
const MARGE = 56

/** Échappe les caractères spéciaux d'une chaîne littérale PDF. */
const echapper = (texte) => texte.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/**
 * Convertit en PDFDocEncoding (proche de Latin-1).
 *
 * Les polices de base n'ont pas d'Unicode : « é » s'écrit sur un octet. Les
 * caractères hors table sont remplacés plutôt que d'écrire un octet invalide
 * qui ferait afficher n'importe quoi.
 */
function versLatin1(texte) {
  return texte
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/×/g, 'x')
    .replace(/⚠️?/g, '!')
    .replace(/[^\x00-\xFF]/g, '?')
}

/**
 * Découpe un paragraphe pour tenir dans la largeur utile.
 *
 * Largeur de caractère approchée : les polices de base sont proportionnelles,
 * mais 0,5 em de moyenne pour Helvetica donne un résultat correct sur du texte
 * courant. Un calcul exact demanderait les métriques de la police.
 */
function decouper(texte, taille, largeurUtile) {
  const parCaractere = taille * 0.5
  const maximum = Math.floor(largeurUtile / parCaractere)
  const mots = texte.split(/\s+/)
  const lignes = []
  let ligne = ''

  for (const mot of mots) {
    if (ligne.length + mot.length + 1 > maximum && ligne) {
      lignes.push(ligne)
      ligne = mot
    } else {
      ligne = ligne ? `${ligne} ${mot}` : mot
    }
  }

  if (ligne) lignes.push(ligne)

  return lignes
}

/**
 * @param {{titre: string, sousTitre: string, blocs: Array}} contenu
 */
function construirePdf({ titre, sousTitre, blocs }) {
  const largeurUtile = A4.largeur - MARGE * 2

  // ⚠️ Pagination.
  //
  // La première version n'écrivait que sur une page et ABANDONNAIT
  // silencieusement tout ce qui dépassait le bas. Les deux fiches actuelles
  // tiennent en une page — la troncature ne s'est donc jamais produite — mais
  // c'est un défaut qui n'attend qu'un paragraphe de plus pour se manifester,
  // et qui ne laisserait aucune trace : ni erreur, ni avertissement, juste une
  // fiche technique amputée entre les mains d'un apprenant.
  //
  // La recette vérifie que la DERNIÈRE phrase de chaque fiche est présente
  // dans le PDF produit : c'est le seul contrôle qui attrape une troncature.
  const pages = []
  let flux = []
  let y = A4.hauteur - MARGE

  const BAS = MARGE + 24

  const nouvellePage = () => {
    pages.push(flux)
    flux = []
    y = A4.hauteur - MARGE
  }

  const ecrire = (texte, { taille = 10, police = 'F1', interligne = 1.45, couleur = null } = {}) => {
    for (const ligne of decouper(versLatin1(texte), taille, largeurUtile)) {
      if (y < BAS) nouvellePage()

      if (couleur) flux.push(`${couleur} rg`)
      flux.push(`BT /${police} ${taille} Tf 1 0 0 1 ${MARGE} ${y.toFixed(2)} Tm (${echapper(ligne)}) Tj ET`)
      if (couleur) flux.push('0 0 0 rg')

      y -= taille * interligne
    }
  }

  const espace = (h) => {
    y -= h
    if (y < BAS) nouvellePage()
  }

  const filet = () => {
    if (y < BAS) nouvellePage()
    flux.push(`0.75 0.78 0.82 RG 0.8 w ${MARGE} ${y.toFixed(2)} m ${(A4.largeur - MARGE).toFixed(2)} ${y.toFixed(2)} l S`)
    y -= 12
  }

  // En-tête
  ecrire(titre, { taille: 17, police: 'F2', interligne: 1.3 })
  espace(2)
  ecrire(sousTitre, { taille: 9.5, couleur: '0.42 0.45 0.5' })
  espace(8)
  filet()

  for (const bloc of blocs) {
    if (bloc.type === 'titre') {
      espace(6)
      ecrire(bloc.texte, { taille: 12, police: 'F2', interligne: 1.35 })
      espace(2)
    } else if (bloc.type === 'paragraphe') {
      ecrire(bloc.texte, { taille: 10 })
      espace(5)
    } else if (bloc.type === 'liste') {
      for (const item of bloc.items) {
        ecrire(`• ${item}`, { taille: 10 })
      }
      espace(5)
    } else if (bloc.type === 'tableau') {
      // Colonnes à largeur fixe : suffisant pour les tableaux de valeurs de
      // ces fiches, et évite d'implémenter une mise en page tabulaire.
      const largeurColonne = largeurUtile / bloc.colonnes.length
      const ligneTexte = (cellules, gras) => {
        if (y < BAS) nouvellePage()
        flux.push('BT')
        cellules.forEach((cellule, i) => {
          const x = MARGE + i * largeurColonne
          flux.push(`/${gras ? 'F2' : 'F1'} 9.5 Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${echapper(versLatin1(cellule))}) Tj`)
        })
        flux.push('ET')
        y -= 14
      }

      ligneTexte(bloc.colonnes, true)
      y += 2
      filet()
      for (const ligne of bloc.lignes) ligneTexte(ligne, false)
      espace(6)
    } else if (bloc.type === 'encadre') {
      espace(2)
      ecrire(bloc.texte, { taille: 9.5, couleur: '0.66 0.24 0.09' })
      espace(6)
    }
  }

  espace(4)
  filet()
  ecrire(
    'RARV - plateforme de formation immersive. Document genere depuis docs/contenu.md (etape 0.2).',
    { taille: 8, couleur: '0.55 0.58 0.62' }
  )

  pages.push(flux)

  /* --- Assemblage du fichier ---------------------------------------- *
   *
   * Numérotation des objets, avec N pages :
   *   1              catalogue
   *   2              arbre des pages
   *   3 … 2+N        pages
   *   3+N … 2+2N     flux de contenu, un par page
   *   3+2N, 4+2N     les deux polices
   */

  const n = pages.length
  const idPremierePage = 3
  const idPremierContenu = 3 + n
  const idF1 = 3 + 2 * n
  const idF2 = 4 + 2 * n

  const refsPages = pages.map((_, i) => `${idPremierePage + i} 0 R`).join(' ')

  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${refsPages}] /Count ${n} >>`,

    ...pages.map(
      (_, i) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.largeur} ${A4.hauteur}] ` +
        `/Resources << /Font << /F1 ${idF1} 0 R /F2 ${idF2} 0 R >> >> ` +
        `/Contents ${idPremierContenu + i} 0 R >>`
    ),

    ...pages.map((contenu) => {
      const texte = contenu.join('\n')
      return `<< /Length ${Buffer.byteLength(texte, 'latin1')} >>\nstream\n${texte}\nendstream`
    }),

    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]

  let pdf = '%PDF-1.4\n'
  const decalages = []

  objets.forEach((objet, i) => {
    decalages.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${objet}\nendobj\n`
  })

  const debutXref = Buffer.byteLength(pdf, 'latin1')

  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  for (const decalage of decalages) {
    pdf += `${String(decalage).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`

  return { octets: Buffer.from(pdf, 'latin1'), pages: n }
}

/* ------------------------------------------------------------------ *
 * Contenu des fiches — docs/contenu.md §5 et §7
 * ------------------------------------------------------------------ */

const FICHE_COUPLES = {
  fichier: 'fiche-couples-serrage.pdf',
  titre: 'Couples de serrage et methode de serrage des brides',
  sousTitre: 'Fiche technique - poste 5, etabli et outillage - atelier de maintenance',
  blocs: [
    { type: 'titre', texte: 'Tableau des couples (vis acier, filetage sec)' },
    {
      type: 'tableau',
      colonnes: ['Diametre', 'Classe 8.8', 'Classe 10.9', 'Classe 12.9'],
      lignes: [
        ['M6', '10 N.m', '14 N.m', '17 N.m'],
        ['M8', '25 N.m', '35 N.m', '41 N.m'],
        ['M10', '49 N.m', '69 N.m', '83 N.m'],
        ['M12', '85 N.m', '120 N.m', '145 N.m'],
        ['M16', '210 N.m', '295 N.m', '355 N.m'],
        ['M20', '410 N.m', '580 N.m', '690 N.m'],
      ],
    },
    {
      type: 'encadre',
      texte:
        '! Valeurs a filetage sec. Un filetage lubrifie reduit le couple d environ 20 % a precontrainte egale : appliquer un couple "sec" sur un filetage huile, c est risquer la rupture de la vis.',
    },
    { type: 'titre', texte: 'Methode de serrage d une bride - la regle des 3 passes' },
    {
      type: 'liste',
      items: [
        'Serrer EN CROIX, jamais dans l ordre circulaire',
        'Passe 1 : 30 % du couple final, sur tous les boulons',
        'Passe 2 : 60 % du couple final, sur tous les boulons',
        'Passe 3 : 100 % du couple final, sur tous les boulons',
        'Passe de controle : refaire un tour complet au couple final ; aucun boulon ne doit tourner',
      ],
    },
    {
      type: 'encadre',
      texte:
        '! L erreur qui fait fuir un joint : serrer un boulon au couple final des la premiere passe. La bride se deforme, le joint est ecrase localement et laisse passer le fluide de l autre cote. Le remontage est refait, et la cause n est jamais identifiee.',
    },
    { type: 'titre', texte: 'Etalonnage de la cle dynamometrique' },
    {
      type: 'liste',
      items: [
        'Verification annuelle obligatoire, ou apres toute chute',
        'Toujours ramener la cle a sa valeur minimale apres usage : un ressort laisse comprime se detend et fausse l appareil',
        'Ne jamais utiliser une cle dynamometrique pour desserrer',
      ],
    },
  ],
}

const FICHE_LUBRIFIANTS = {
  fichier: 'fiche-stockage-lubrifiants.pdf',
  titre: 'Stockage et manipulation des huiles en atelier',
  sousTitre: 'Fiche de securite simplifiee - poste 7 - atelier de maintenance',
  blocs: [
    { type: 'titre', texte: 'Retention' },
    {
      type: 'liste',
      items: [
        'Le bac de retention doit contenir le PLUS GRAND des deux volumes : 100 % du plus grand contenant stocke, ou 50 % du volume total stocke',
        'Le bac est maintenu vide : plein d eau de pluie, il n a plus aucune capacite de retention',
        'Un absorbant (granules ou feuilles) doit etre disponible a proximite immediate',
      ],
    },
    { type: 'titre', texte: 'Compatibilite' },
    {
      type: 'encadre',
      texte:
        '! Ne jamais melanger deux huiles, meme de viscosite identique et meme usage. Les additifs - anti-usure, antioxydants, detergents - peuvent etre chimiquement incompatibles et former des boues qui bouchent les filtres et les canaux de graissage. En cas de changement de reference, le circuit se vidange et se rince.',
    },
    { type: 'titre', texte: 'Etiquetage et contenants' },
    {
      type: 'liste',
      items: [
        'Tout bidon entame est referme et etiquete : reference de l huile, date d ouverture',
        'Jamais de transvasement dans un contenant alimentaire ou non etiquete',
        'Les huiles usagees sont un dechet dangereux : bidon dedie, jamais melange aux solvants, elimine par une filiere agreee avec bordereau de suivi',
      ],
    },
    { type: 'titre', texte: 'Conduite a tenir en cas de deversement' },
    {
      type: 'liste',
      items: [
        'Securiser la zone, supprimer les sources d ignition',
        'Endiguer avec l absorbant, du bord vers le centre',
        'Collecter dans le bac a dechets dangereux',
        'Signaler : un deversement recurrent est le symptome d une fuite a traiter',
      ],
    },
  ],
}

/* ------------------------------------------------------------------ *
 * Sous-titres WebVTT — docs/contenu.md §2 et §6
 * ------------------------------------------------------------------ */

const VTT_CONSIGNATION = {
  fichier: 'p02-consignation.vtt',
  cues: [
    [0, 15, "Toute intervention sur une machine commence par la meme chose :\nmettre l'installation hors d'etat de demarrer."],
    [15, 30, "C'est la consignation. Elle comporte quatre etapes,\ndans un ordre qui n'est pas negociable."],
    [30, 45, '1 - SEPARATION. On separe l\'installation\nde toutes ses sources d\'energie.'],
    [45, 60, 'Le sectionneur est ouvert,\nla coupure est visible ou materialisee.'],
    [60, 75, "2 - CONDAMNATION. On bloque l'organe de separation\nen position ouverte."],
    [75, 90, 'Avec un dispositif qui ne peut etre retire que volontairement,\net une pancarte nominative.'],
    [90, 105, "Le cadenas est personnel :\npersonne d'autre ne le retire."],
    [105, 120, "3 - IDENTIFICATION. On s'assure que l'ouvrage consigne\nest bien celui sur lequel on va travailler."],
    [120, 135, 'Sur une armoire a vingt departs, cette etape evite\nd\'intervenir sur la mauvaise machine.'],
    [135, 150, "4 - VERIFICATION D'ABSENCE DE TENSION. La VAT est la seule preuve\nque l'installation est reellement hors tension."],
    [150, 165, 'Elle se fait au plus pres du point de travail,\nsur tous les conducteurs.'],
    [165, 180, 'Et le verificateur se teste avant ET apres usage :\nun appareil tombe en panne entre-temps'],
    [180, 195, 'aurait affiche "hors tension"\nsur une installation encore alimentee.'],
    [195, 210, "S - C - I - V : Separer, Condamner, Identifier, Verifier.\nL'intervention peut commencer."],
  ],
}

const VTT_VIBRATOIRE = {
  fichier: 'p06-vibratoire.vtt',
  cues: [
    [0, 20, 'Une machine tournante previent toujours avant de casser.\nSa signature vibratoire se degrade plusieurs semaines avant la panne.'],
    [20, 35, 'Encore faut-il savoir lire le spectre.'],
    [35, 50, 'BALOURD - pic a 1 fois la frequence de rotation.\nLa masse tournante n\'est pas repartie uniformement.'],
    [50, 65, 'Cause : usure inegale de la roue, depot,\nreparation mal equilibree. Correction : equilibrage.'],
    [65, 80, 'DESALIGNEMENT - pic a 2 fois la frequence de rotation,\nsouvent avec une forte composante axiale.'],
    [80, 95, 'Correction : realignement au comparateur ou au laser.'],
    [95, 110, "DEFAUT DE ROULEMENT - une foret de raies\nen hautes frequences, a des frequences non entieres."],
    [110, 120, 'Elles apparaissent bien avant tout bruit audible.\n1x : balourd. 2x : desalignement. Hautes frequences : roulement.'],
  ],
}

const enTemps = (secondes) => {
  const m = String(Math.floor(secondes / 60)).padStart(2, '0')
  const s = String(secondes % 60).padStart(2, '0')
  return `00:${m}:${s}.000`
}

function construireVtt({ cues }) {
  const lignes = ['WEBVTT', '']

  cues.forEach(([debut, fin, texte], i) => {
    lignes.push(String(i + 1), `${enTemps(debut)} --> ${enTemps(fin)}`, texte, '')
  })

  return Buffer.from(lignes.join('\n'), 'utf8')
}

/* ------------------------------------------------------------------ *
 * Production
 * ------------------------------------------------------------------ */

const dossier = process.argv[2]

if (!dossier) {
  console.error('Usage : node scripts/generer-assets-pedagogiques.mjs <dossier-de-sortie>')
  process.exit(1)
}

mkdirSync(dossier, { recursive: true })

for (const fiche of [FICHE_COUPLES, FICHE_LUBRIFIANTS]) {
  const { octets, pages } = construirePdf(fiche)
  writeFileSync(join(dossier, fiche.fichier), octets)
  console.log(
    `✅ ${fiche.fichier.padEnd(34)} ${(octets.length / 1024).toFixed(1).padStart(5)} Ko · ${pages} page${pages > 1 ? 's' : ''}`
  )
}

for (const sousTitres of [VTT_CONSIGNATION, VTT_VIBRATOIRE]) {
  const vtt = construireVtt(sousTitres)
  writeFileSync(join(dossier, sousTitres.fichier), vtt)
  console.log(`✅ ${sousTitres.fichier.padEnd(34)} ${sousTitres.cues.length} sous-titres`)
}

console.log('')
console.log('⏳ Restent à produire (point B6) : p02-consignation.mp4 et p06-vibratoire.mp4.')
console.log('   Le lecteur du Lot 6 se replie sur le résumé écrit tant qu’elles sont absentes,')
console.log('   et le poste reste validable.')
