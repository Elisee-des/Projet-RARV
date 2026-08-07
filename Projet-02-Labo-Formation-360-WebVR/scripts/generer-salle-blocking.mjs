/**
 * Génère le BLOCKING de l'atelier au format .glb — étape 1.1 sans Blender.
 *
 * Blender n'est pas installé (point B1 du suivi) et le Lot 1 bloque les Lots 3,
 * 4 et 5. Or l'étape 1.1 est un *blocking* : des volumes gris. C'est donc
 * générable par script, exactement comme l'a été le modèle de substitution du
 * Projet 01 (`scripts/generer-pompe-substitution.mjs`).
 *
 * Deux fichiers sont produits :
 *
 *   atelier.glb    géométrie visible + les Empty nommés SPAWN et POI_01…POI_08
 *   collision.glb  boîtes ultra-simplifiées, jamais la géométrie visible (1.5)
 *
 * Contraintes respectées, celles qui comptent pour la suite :
 *
 *   • ÉCHELLE RÉELLE en mètres, 1 unité glTF = 1 m
 *   • repère monde identique au plan 0.3 : X de 0 à 10, Z de 0 à 8, +Y en haut
 *   • EMPTY NOMMÉS exportés dans la scène — c'est la parade au piège n°1 du
 *     projet : plus jamais de coordonnées de postes codées en dur (étape 1.10)
 *   • normales correctes, sinon l'éclairage est faux
 *
 * ⚠️ Ce n'est PAS un livrable. Le Lot 1 le remplace par la vraie salle : le
 * blocking ne porte ni habillage (1.3), ni atlas (1.4), ni UV2 (1.6), ni
 * lightmaps (1.7) — ces étapes exigent Blender.
 *
 * ✅ Bénéfice secondaire : il impose l'étape 1.2, « valider la navigation sur
 * le blocking avant de détailler quoi que ce soit », que le plan déclare non
 * négociable.
 *
 * Usage : node scripts/generer-salle-blocking.mjs <dossier-de-sortie>
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/* ------------------------------------------------------------------ *
 * Dimensions — plan de l'étape 0.3 (docs/plan-salle.svg)
 * ------------------------------------------------------------------ */

const SALLE = { largeur: 10, profondeur: 8, hauteur: 3.2 }
const MUR = 0.15 // épaisseur
const DALLE = 0.1 // épaisseur sol et plafond

// Ouverture de la porte dans le mur sud (z = 8), en X
const PORTE = { x0: 8.0, x1: 9.5 }

/* ------------------------------------------------------------------ *
 * Volumes — décrits par leurs bornes, en mètres
 * ------------------------------------------------------------------ */

const { largeur: L, profondeur: P, hauteur: H } = SALLE

/** @type {{nom: string, min: number[], max: number[], mat: string, collision?: boolean}[]} */
const VOLUMES = [
  // --- Enveloppe -----------------------------------------------------
  { nom: 'sol', min: [0, -DALLE, 0], max: [L, 0, P], mat: 'sol' },
  { nom: 'plafond', min: [0, H, 0], max: [L, H + DALLE, P], mat: 'plafond' },

  { nom: 'mur-nord', min: [-MUR, 0, -MUR], max: [L + MUR, H, 0], mat: 'mur' },
  { nom: 'mur-ouest', min: [-MUR, 0, 0], max: [0, H, P], mat: 'mur' },
  { nom: 'mur-est', min: [L, 0, 0], max: [L + MUR, H, P], mat: 'mur' },

  // Mur sud coupé par la porte — deux segments plus un linteau au-dessus
  { nom: 'mur-sud-gauche', min: [-MUR, 0, P], max: [PORTE.x0, H, P + MUR], mat: 'mur' },
  { nom: 'mur-sud-droite', min: [PORTE.x1, 0, P], max: [L + MUR, H, P + MUR], mat: 'mur' },
  { nom: 'mur-sud-linteau', min: [PORTE.x0, 2.1, P], max: [PORTE.x1, H, P + MUR], mat: 'mur' },

  // --- Mobilier, un volume par poste ---------------------------------
  // Les emprises au sol viennent directement du plan 0.3.
  { nom: 'poste-01-panneau-accueil', min: [4.0, 1.0, P - 0.12], max: [6.0, 2.2, P], mat: 'panneau' },
  { nom: 'poste-02-armoire-electrique', min: [0, 0.4, 4.9], max: [0.4, 2.2, 6.1], mat: 'mobilier' },
  { nom: 'poste-03-armoire-epi', min: [0, 0, 6.5], max: [0.5, 2.0, 7.5], mat: 'mobilier' },
  { nom: 'poste-04-socle-pompe', min: [1.9, 0, 1.4], max: [3.1, 0.4, 2.6], mat: 'mobilier' },
  { nom: 'poste-05-etabli', min: [3.5, 0, 0], max: [6.5, 0.9, 0.8], mat: 'mobilier' },
  { nom: 'poste-06-banc-vibratoire', min: [6.6, 0, 1.4], max: [8.4, 1.1, 2.6], mat: 'mobilier' },
  { nom: 'poste-07-etagere-lubrifiants', min: [9.4, 0, 4.2], max: [L, 1.8, 5.8], mat: 'mobilier' },
  { nom: 'poste-08-pupitre-evaluation', min: [6.8, 0, 6.1], max: [8.2, 1.1, 6.9], mat: 'mobilier' },
]

/* ------------------------------------------------------------------ *
 * Repères nommés — ÉTAPE 1.10, le cœur du script
 * ------------------------------------------------------------------ *
 *
 * Ces nœuds n'ont pas de maillage : ce sont des Empty. Le chargeur de scène
 * les lit par leur nom et positionne les 8 points d'interaction sans qu'aucune
 * coordonnée n'existe dans le code ni en base.
 *
 * `SPAWN` porte en plus une orientation. Convention retenue, celle de
 * Three.js : l'avant neutre d'un objet est −Z, donc un lacet nul regarde vers
 * −Z. Le point d'apparition est à z = 6,5 et regarde vers le fond de la salle,
 * dos au panneau d'accueil : lacet = 0.
 */

const HAUTEUR_OEIL = 1.65

const REPERES = [
  { nom: 'SPAWN', position: [5.0, 0, 6.5], lacet: 0 },

  { nom: 'POI_01', position: [5.0, 1.6, 7.6] }, // panneau d'accueil (mural)
  { nom: 'POI_02', position: [0.5, 1.4, 5.5] }, // tableau électrique
  { nom: 'POI_03', position: [0.5, 1.5, 7.0] }, // armoire à EPI
  { nom: 'POI_04', position: [2.5, 0.9, 2.0] }, // pompe centrifuge
  { nom: 'POI_05', position: [5.0, 1.0, 0.6] }, // établi
  { nom: 'POI_06', position: [7.5, 1.1, 2.0] }, // banc vibratoire
  { nom: 'POI_07', position: [9.5, 1.2, 5.0] }, // stockage lubrifiants
  { nom: 'POI_08', position: [7.5, 1.1, 6.5] }, // poste d'évaluation
]

/* ------------------------------------------------------------------ *
 * Matériaux — volumes gris, c'est un blocking
 * ------------------------------------------------------------------ */

const MATERIAUX = [
  { name: 'sol', baseColorFactor: [0.42, 0.44, 0.47, 1], metallicFactor: 0, roughnessFactor: 0.95 },
  { name: 'mur', baseColorFactor: [0.72, 0.73, 0.75, 1], metallicFactor: 0, roughnessFactor: 0.9 },
  { name: 'plafond', baseColorFactor: [0.82, 0.83, 0.85, 1], metallicFactor: 0, roughnessFactor: 0.95 },
  { name: 'mobilier', baseColorFactor: [0.55, 0.58, 0.63, 1], metallicFactor: 0.1, roughnessFactor: 0.75 },
  { name: 'panneau', baseColorFactor: [0.20, 0.42, 0.72, 1], metallicFactor: 0, roughnessFactor: 0.6 },
  { name: 'collision', baseColorFactor: [0.9, 0.25, 0.35, 0.35], metallicFactor: 0, roughnessFactor: 1 },
]

/* ------------------------------------------------------------------ *
 * Primitive : pavé droit centré sur l'origine
 * ------------------------------------------------------------------ */

function boite(lx, ly, lz) {
  const [hx, hy, hz] = [lx / 2, ly / 2, lz / 2]
  const faces = [
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
    { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
  ]

  const positions = []
  const normales = []
  const indices = []

  faces.forEach((f, fi) => {
    for (const v of f.v) {
      positions.push(...v)
      normales.push(...f.n)
    }
    const o = fi * 4
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3)
  })

  return { positions, normales, indices }
}

/* ------------------------------------------------------------------ *
 * Écriture d'un .glb
 * ------------------------------------------------------------------ */

/**
 * @param {{nom: string, min: number[], max: number[], mat: string}[]} volumes
 * @param {{nom: string, position: number[], lacet?: number}[]} reperes
 */
function construireGlb(volumes, reperes, generateur) {
  const morceaux = []
  let curseur = 0

  const pousser = (buffer) => {
    const bourrage = (4 - (curseur % 4)) % 4
    if (bourrage) {
      morceaux.push(Buffer.alloc(bourrage))
      curseur += bourrage
    }
    const debut = curseur
    morceaux.push(buffer)
    curseur += buffer.length
    return debut
  }

  const bufferViews = []
  const accessors = []
  const meshes = []
  const nodes = []

  let triangles = 0
  const bbMin = [Infinity, Infinity, Infinity]
  const bbMax = [-Infinity, -Infinity, -Infinity]

  // Les matériaux réellement employés, indexés dans l'ordre de MATERIAUX
  const utilises = MATERIAUX.filter((m) => volumes.some((v) => v.mat === m.name))
  const indexMat = Object.fromEntries(utilises.map((m, i) => [m.name, i]))

  for (const volume of volumes) {
    const taille = volume.max.map((v, i) => v - volume.min[i])
    const centre = volume.max.map((v, i) => (v + volume.min[i]) / 2)

    const { positions, normales, indices } = boite(...taille)

    const min = [-taille[0] / 2, -taille[1] / 2, -taille[2] / 2]
    const max = [taille[0] / 2, taille[1] / 2, taille[2] / 2]

    for (let k = 0; k < 3; k++) {
      bbMin[k] = Math.min(bbMin[k], volume.min[k])
      bbMax[k] = Math.max(bbMax[k], volume.max[k])
    }

    const offPos = pousser(Buffer.from(new Float32Array(positions).buffer))
    const offNorm = pousser(Buffer.from(new Float32Array(normales).buffer))
    const offIdx = pousser(Buffer.from(new Uint16Array(indices).buffer))

    const vPos = bufferViews.push({ buffer: 0, byteOffset: offPos, byteLength: positions.length * 4, target: 34962 }) - 1
    const vNorm = bufferViews.push({ buffer: 0, byteOffset: offNorm, byteLength: normales.length * 4, target: 34962 }) - 1
    const vIdx = bufferViews.push({ buffer: 0, byteOffset: offIdx, byteLength: indices.length * 2, target: 34963 }) - 1

    const aPos = accessors.push({ bufferView: vPos, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max }) - 1
    const aNorm = accessors.push({ bufferView: vNorm, componentType: 5126, count: normales.length / 3, type: 'VEC3' }) - 1
    const aIdx = accessors.push({ bufferView: vIdx, componentType: 5123, count: indices.length, type: 'SCALAR' }) - 1

    const mesh = meshes.push({
      name: volume.nom,
      primitives: [{ attributes: { POSITION: aPos, NORMAL: aNorm }, indices: aIdx, material: indexMat[volume.mat] }],
    }) - 1

    nodes.push({ name: volume.nom, mesh, translation: centre })
    triangles += indices.length / 3
  }

  // Empty nommés — nœuds SANS maillage (étape 1.10)
  for (const repere of reperes) {
    const noeud = { name: repere.nom, translation: repere.position }

    if (repere.lacet !== undefined) {
      // Quaternion d'une rotation de `lacet` radians autour de +Y
      const demi = repere.lacet / 2
      noeud.rotation = [0, Math.sin(demi), 0, Math.cos(demi)]
    }

    nodes.push(noeud)
  }

  const binaire = Buffer.concat(morceaux)

  const gltf = {
    asset: { version: '2.0', generator: generateur },
    scene: 0,
    scenes: [{ name: 'atelier-maintenance-01', nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials: utilises.map((m) => ({
      name: m.name,
      pbrMetallicRoughness: {
        baseColorFactor: m.baseColorFactor,
        metallicFactor: m.metallicFactor,
        roughnessFactor: m.roughnessFactor,
      },
      ...(m.baseColorFactor[3] < 1 ? { alphaMode: 'BLEND', doubleSided: true } : {}),
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: binaire.length }],
  }

  const json = Buffer.from(JSON.stringify(gltf), 'utf8')
  const jsonPad = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)])
  const binPad = Buffer.concat([binaire, Buffer.alloc((4 - (binaire.length % 4)) % 4, 0x00)])

  const entete = Buffer.alloc(12)
  entete.writeUInt32LE(0x46546c67, 0) // « glTF »
  entete.writeUInt32LE(2, 4)
  entete.writeUInt32LE(12 + 8 + jsonPad.length + 8 + binPad.length, 8)

  const enteteJson = Buffer.alloc(8)
  enteteJson.writeUInt32LE(jsonPad.length, 0)
  enteteJson.writeUInt32LE(0x4e4f534a, 4) // « JSON »

  const enteteBin = Buffer.alloc(8)
  enteteBin.writeUInt32LE(binPad.length, 0)
  enteteBin.writeUInt32LE(0x004e4942, 4) // « BIN\0 »

  return {
    glb: Buffer.concat([entete, enteteJson, jsonPad, enteteBin, binPad]),
    triangles,
    noeuds: nodes.length,
    maillages: meshes.length,
    bbMin,
    bbMax,
  }
}

/* ------------------------------------------------------------------ *
 * Production
 * ------------------------------------------------------------------ */

const dossier = process.argv[2]

if (!dossier) {
  console.error('Usage : node scripts/generer-salle-blocking.mjs <dossier-de-sortie>')
  process.exit(1)
}

mkdirSync(dossier, { recursive: true })

// --- Scène visible ---------------------------------------------------
const visible = construireGlb(
  VOLUMES,
  REPERES,
  'RARV — blocking de l’atelier (étape 1.1 sans Blender), à remplacer au Lot 1'
)
writeFileSync(join(dossier, 'atelier.glb'), visible.glb)

// --- Mesh de collision (étape 1.5) -----------------------------------
// Le plafond est écarté : rien ne peut le heurter, et une capsule de 1,65 m
// sous 3,20 m de hauteur ne le teste jamais. Autant d'écono­mie de shapecast.
const collision = construireGlb(
  VOLUMES.filter((v) => v.nom !== 'plafond').map((v) => ({ ...v, nom: `col-${v.nom}`, mat: 'collision' })),
  [],
  'RARV — mesh de collision simplifié (étape 1.5)'
)
writeFileSync(join(dossier, 'collision.glb'), collision.glb)

/* ------------------------------------------------------------------ *
 * Compte rendu
 * ------------------------------------------------------------------ */

const dim = visible.bbMax.map((v, i) => (v - visible.bbMin[i]).toFixed(2))

console.log(`✅ ${join(dossier, 'atelier.glb')}`)
console.log(`   volumes    : ${visible.maillages}`)
console.log(`   repères    : ${REPERES.length} Empty nommés (${REPERES.map((r) => r.nom).join(', ')})`)
console.log(`   triangles  : ${visible.triangles}   (budget Lot 1 : ≤ 150 000)`)
console.log(`   taille     : ${(visible.glb.length / 1024).toFixed(1)} Ko   (budget : ≤ 8 192 Ko)`)
console.log(`   dimensions : ${dim[0]} × ${dim[1]} × ${dim[2]} m (L × H × P), murs compris`)
console.log(`   sol        : y = ${visible.bbMin[1].toFixed(3)} → ${(0).toFixed(3)} m`)
console.log('')
console.log(`✅ ${join(dossier, 'collision.glb')}`)
console.log(`   volumes    : ${collision.maillages} (plafond écarté)`)
console.log(`   triangles  : ${collision.triangles}`)
console.log(`   taille     : ${(collision.glb.length / 1024).toFixed(1)} Ko`)
console.log('')
console.log(`ℹ️  Hauteur d'œil de référence : ${HAUTEUR_OEIL} m — SPAWN à ${REPERES[0].position.join(', ')}, lacet 0 (regarde vers −Z)`)
console.log('⚠️  Blocking : ni habillage, ni atlas, ni UV2, ni lightmaps. Le Lot 1 remplace ces fichiers.')
