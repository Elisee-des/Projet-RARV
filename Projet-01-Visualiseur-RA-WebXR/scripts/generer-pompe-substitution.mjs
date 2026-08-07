/**
 * Génère un groupe motopompe de SUBSTITUTION au format .glb.
 *
 * Objectif : débloquer le Lot 3 (viewer 3D) sans Blender et sans téléchargement.
 * Le modèle est volontairement simple — assemblage de primitives — mais il
 * respecte toutes les contraintes qui comptent pour la suite du projet :
 *
 *   • pièces SÉPARÉES et NOMMÉES (sinon les annotations n'ont rien à désigner)
 *   • échelle en MÈTRES RÉELS (1 unité glTF = 1 m, exigence de la RA)
 *   • origine au SOL, +Y vers le haut (placement au sol en RA)
 *   • normales correctes (sinon l'éclairage est faux)
 *
 * ⚠️ À remplacer par le vrai modèle au Lot 1.
 *
 * Usage : node scripts/generer-pompe-substitution.mjs <sortie.glb>
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** Cylindre d'axe Z, centré sur l'origine. */
function cylindreZ(rayon, longueur, segments = 28) {
  const positions = []
  const normales = []
  const indices = []
  const z0 = -longueur / 2
  const z1 = longueur / 2

  // Paroi latérale
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const nx = Math.cos(a)
    const ny = Math.sin(a)
    positions.push(rayon * nx, rayon * ny, z0, rayon * nx, rayon * ny, z1)
    normales.push(nx, ny, 0, nx, ny, 0)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }

  // Deux capuchons
  for (const [z, nz] of [
    [z0, -1],
    [z1, 1],
  ]) {
    const centre = positions.length / 3
    positions.push(0, 0, z)
    normales.push(0, 0, nz)
    const debut = positions.length / 3
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      positions.push(rayon * Math.cos(a), rayon * Math.sin(a), z)
      normales.push(0, 0, nz)
    }
    for (let i = 0; i < segments; i++) {
      if (nz > 0) indices.push(centre, debut + i, debut + i + 1)
      else indices.push(centre, debut + i + 1, debut + i)
    }
  }

  return { positions, normales, indices }
}

/** Pavé droit centré sur l'origine. */
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
 * Matériaux
 * ------------------------------------------------------------------ */

const MATERIAUX = [
  { name: 'fonte-peinte', baseColorFactor: [0.16, 0.40, 0.54, 1], metallicFactor: 0.35, roughnessFactor: 0.55 },
  { name: 'acier-brut', baseColorFactor: [0.32, 0.34, 0.37, 1], metallicFactor: 0.75, roughnessFactor: 0.60 },
  { name: 'bronze', baseColorFactor: [0.72, 0.45, 0.20, 1], metallicFactor: 0.85, roughnessFactor: 0.35 },
  { name: 'inox', baseColorFactor: [0.84, 0.85, 0.87, 1], metallicFactor: 0.90, roughnessFactor: 0.25 },
  { name: 'elastomere', baseColorFactor: [0.78, 0.26, 0.18, 1], metallicFactor: 0.0, roughnessFactor: 0.85 },
  { name: 'moteur-vert', baseColorFactor: [0.16, 0.42, 0.30, 1], metallicFactor: 0.40, roughnessFactor: 0.50 },
]
const M = Object.fromEntries(MATERIAUX.map((m, i) => [m.name, i]))

/* ------------------------------------------------------------------ *
 * Assemblage — axe de rotation le long de Z, à 0,62 m du sol
 * ------------------------------------------------------------------ */

const AXE = 0.62

const PIECES = [
  { nom: 'socle', geo: boite(0.95, 0.10, 0.62), t: [0, 0.05, -0.18], mat: 'acier-brut' },
  { nom: 'support-pompe', geo: boite(0.20, 0.26, 0.24), t: [0, 0.23, 0.22], mat: 'acier-brut' },
  { nom: 'support-moteur', geo: boite(0.34, 0.36, 0.32), t: [0, 0.28, -0.78], mat: 'acier-brut' },

  { nom: 'corps-volute', geo: cylindreZ(0.30, 0.24), t: [0, AXE, 0.22], mat: 'fonte-peinte' },
  { nom: 'bride-aspiration', geo: cylindreZ(0.14, 0.16), t: [0, AXE, 0.42], mat: 'fonte-peinte' },
  { nom: 'roue-a-aubes', geo: cylindreZ(0.22, 0.09), t: [0, AXE, 0.06], mat: 'bronze' },
  { nom: 'garniture-mecanique', geo: cylindreZ(0.10, 0.10), t: [0, AXE, -0.10], mat: 'inox' },
  { nom: 'arbre', geo: cylindreZ(0.045, 0.58), t: [0, AXE, -0.32], mat: 'inox' },
  { nom: 'palier-avant', geo: cylindreZ(0.13, 0.16), t: [0, AXE, -0.26], mat: 'acier-brut' },
  { nom: 'palier-arriere', geo: cylindreZ(0.13, 0.16), t: [0, AXE, -0.44], mat: 'acier-brut' },
  { nom: 'accouplement', geo: cylindreZ(0.11, 0.10), t: [0, AXE, -0.58], mat: 'elastomere' },
  { nom: 'moteur', geo: cylindreZ(0.20, 0.36), t: [0, AXE, -0.80], mat: 'moteur-vert' },
  { nom: 'boite-bornes', geo: boite(0.16, 0.10, 0.20), t: [0, AXE + 0.24, -0.80], mat: 'moteur-vert' },
]

/* ------------------------------------------------------------------ *
 * Écriture du tampon binaire
 * ------------------------------------------------------------------ */

const morceaux = []
let curseur = 0

function pousser(buffer) {
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

let trianglesTotal = 0
const bbMin = [Infinity, Infinity, Infinity]
const bbMax = [-Infinity, -Infinity, -Infinity]

for (const piece of PIECES) {
  const { positions, normales, indices } = piece.geo

  // Bornes locales, requises par la spécification glTF sur l'accesseur POSITION
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }
  for (let k = 0; k < 3; k++) {
    bbMin[k] = Math.min(bbMin[k], min[k] + piece.t[k])
    bbMax[k] = Math.max(bbMax[k], max[k] + piece.t[k])
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
    name: piece.nom,
    primitives: [{ attributes: { POSITION: aPos, NORMAL: aNorm }, indices: aIdx, material: M[piece.mat] }],
  }) - 1

  nodes.push({ name: piece.nom, mesh, translation: piece.t })
  trianglesTotal += indices.length / 3
}

/* ------------------------------------------------------------------ *
 * Assemblage du conteneur GLB
 * ------------------------------------------------------------------ */

const binaire = Buffer.concat(morceaux)

const gltf = {
  asset: { version: '2.0', generator: 'RARV — pompe de substitution (Lot 3), à remplacer au Lot 1' },
  scene: 0,
  scenes: [{ name: 'groupe-motopompe', nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials: MATERIAUX.map((m) => ({
    name: m.name,
    pbrMetallicRoughness: {
      baseColorFactor: m.baseColorFactor,
      metallicFactor: m.metallicFactor,
      roughnessFactor: m.roughnessFactor,
    },
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

const sortie = process.argv[2]
if (!sortie) {
  console.error('Usage : node generer-pompe-substitution.mjs <sortie.glb>')
  process.exit(1)
}

mkdirSync(dirname(sortie), { recursive: true })
const glb = Buffer.concat([entete, enteteJson, jsonPad, enteteBin, binPad])
writeFileSync(sortie, glb)

const dim = bbMax.map((v, i) => (v - bbMin[i]).toFixed(2))

console.log(`✅ ${sortie}`)
console.log(`   pièces     : ${PIECES.length} (séparées et nommées)`)
console.log(`   triangles  : ${trianglesTotal}`)
console.log(`   taille     : ${(glb.length / 1024).toFixed(1)} Ko`)
console.log(`   dimensions : ${dim[0]} × ${dim[1]} × ${dim[2]} m (L × H × P)`)
console.log(`   sol        : y min = ${bbMin[1].toFixed(3)} m`)
