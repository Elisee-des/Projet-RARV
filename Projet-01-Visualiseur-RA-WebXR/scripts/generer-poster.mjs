/**
 * Vignette de chargement — étape 1.6.
 *
 * Un vrai poster serait un rendu de l'objet. Faute de rendu hors écran
 * disponible (ni Blender, ni GPU en ligne de commande), on génère une vignette
 * SVG : silhouette schématique construite à partir des mesures RÉELLES du
 * modèle, plus son titre.
 *
 * Le SVG convient parfaitement à l'usage : affiché flouté derrière l'écran de
 * chargement, il pèse 2 Ko au lieu des 60 Ko d'un WebP, et reste net à toutes
 * les résolutions.
 *
 * Usage : node scripts/generer-poster.mjs <modele.glb> <sortie.svg> "<titre>"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [entree, sortie, titre = 'Objet pédagogique'] = process.argv.slice(2)

if (!entree || !sortie) {
  console.error('Usage : node scripts/generer-poster.mjs <modele.glb> <sortie.svg> "<titre>"')
  process.exit(1)
}

/* Lecture des bornes de chaque maillage, via les min/max des accesseurs
   POSITION — obligatoires dans un glTF valide, donc lisibles sans toucher
   au tampon binaire. */
const buffer = readFileSync(entree)
const vue = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
const longueurJson = vue.getUint32(12, true)
const gltf = JSON.parse(buffer.slice(20, 20 + longueurJson).toString('utf8'))

const boites = []

for (const noeud of gltf.nodes ?? []) {
  if (noeud.mesh === undefined) continue

  const [tx, ty] = noeud.translation ?? [0, 0, 0]
  const tz = (noeud.translation ?? [0, 0, 0])[2]

  for (const primitive of gltf.meshes[noeud.mesh].primitives ?? []) {
    const accesseur = gltf.accessors[primitive.attributes.POSITION]
    if (!accesseur?.min || !accesseur?.max) continue

    boites.push({
      nom: gltf.meshes[noeud.mesh].name ?? '',
      min: [accesseur.min[0] + tx, accesseur.min[1] + ty, accesseur.min[2] + tz],
      max: [accesseur.max[0] + tx, accesseur.max[1] + ty, accesseur.max[2] + tz],
    })
  }
}

if (boites.length === 0) {
  console.error('Aucune géométrie exploitable dans le modèle.')
  process.exit(1)
}

// Vue de côté : Z en abscisse, Y en ordonnée.
const zMin = Math.min(...boites.map((b) => b.min[2]))
const zMax = Math.max(...boites.map((b) => b.max[2]))
const yMin = Math.min(...boites.map((b) => b.min[1]))
const yMax = Math.max(...boites.map((b) => b.max[1]))

const L = 960
const H = 540
const marge = 90
const echelle = Math.min((L - marge * 2) / (zMax - zMin), (H - marge * 2) / (yMax - yMin))

const px = (z) => marge + (zMax - z) * echelle
const py = (y) => H - marge - (y - yMin) * echelle

const rectangles = boites
  .map((b, i) => {
    const x = px(b.max[2])
    const y = py(b.max[1])
    const largeur = (b.max[2] - b.min[2]) * echelle
    const hauteur = (b.max[1] - b.min[1]) * echelle
    const opacite = (0.32 + (i % 4) * 0.11).toFixed(2)

    return `    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${largeur.toFixed(1)}" height="${hauteur.toFixed(1)}" rx="4" fill="url(#piece)" opacity="${opacite}"/>`
  })
  .join('\n')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-label="${titre}">
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#161d24"/>
      <stop offset="1" stop-color="#0d1116"/>
    </linearGradient>
    <linearGradient id="piece" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f9dd0"/>
      <stop offset="1" stop-color="#2a5f85"/>
    </linearGradient>
  </defs>

  <rect width="${L}" height="${H}" fill="url(#fond)"/>

${rectangles}

  <line x1="${marge / 2}" y1="${py(yMin).toFixed(1)}" x2="${L - marge / 2}" y2="${py(yMin).toFixed(1)}"
        stroke="#4f9dd0" stroke-opacity="0.28" stroke-width="2"/>

  <text x="${marge / 2}" y="${H - 34}" fill="#d7dee5" font-family="system-ui, sans-serif" font-size="26" font-weight="600">${titre}</text>
  <text x="${marge / 2}" y="${H - 12}" fill="#8b98a5" font-family="system-ui, sans-serif" font-size="15">${(zMax - zMin).toFixed(2)} × ${(yMax - yMin).toFixed(2)} m · ${boites.length} pièces</text>
</svg>
`

mkdirSync(dirname(sortie), { recursive: true })
writeFileSync(sortie, svg, 'utf8')

console.log(`✅ ${sortie}`)
console.log(`   pièces  : ${boites.length}`)
console.log(`   emprise : ${(zMax - zMin).toFixed(2)} × ${(yMax - yMin).toFixed(2)} m`)
console.log(`   taille  : ${(svg.length / 1024).toFixed(1)} Ko`)
