/**
 * Convertit un .glb en .usdz — étape 1.5 du pipeline d'assets.
 *
 * Pourquoi écrire ce convertisseur plutôt qu'utiliser un outil existant :
 * Reality Converter d'Apple ne tourne que sur macOS, `usd-from-gltf` de Google
 * exige une chaîne de compilation C++, et l'export USD de Blender demande…
 * Blender. Aucun n'était disponible.
 *
 * Un .usdz est un ZIP **non compressé** contenant un fichier USDA (format
 * texte de la scène). Les deux contraintes d'Apple sont strictes :
 *   • aucune compression (méthode 0)
 *   • données de chaque fichier alignées sur 64 octets
 * Un zip ordinaire ne satisfait ni l'une ni l'autre — d'où l'écriture manuelle.
 *
 * Limites assumées : géométrie et couleurs de matériaux uniquement. Pas de
 * textures, pas d'animation. Suffisant pour un objet technique dont les pièces
 * sont colorées à plat ; à revoir si le modèle du Lot 1 est texturé.
 *
 * Usage : node scripts/glb-vers-usdz.mjs <entree.glb> <sortie.usdz>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, basename } from 'node:path'

/* ------------------------------------------------------------------ *
 * Lecture du GLB
 * ------------------------------------------------------------------ */

const COMPOSANTS = {
  5120: { taille: 1, lire: (v, o) => v.getInt8(o) },
  5121: { taille: 1, lire: (v, o) => v.getUint8(o) },
  5122: { taille: 2, lire: (v, o) => v.getInt16(o, true) },
  5123: { taille: 2, lire: (v, o) => v.getUint16(o, true) },
  5125: { taille: 4, lire: (v, o) => v.getUint32(o, true) },
  5126: { taille: 4, lire: (v, o) => v.getFloat32(o, true) },
}

const COMPOSANTS_PAR_TYPE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

function lireGlb(chemin) {
  const buffer = readFileSync(chemin)
  const vue = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  if (vue.getUint32(0, true) !== 0x46546c67) throw new Error('Ce fichier n\'est pas un .glb')
  if (vue.getUint32(4, true) !== 2) throw new Error('Seul glTF 2.0 est pris en charge')

  let offset = 12
  let json = null
  let bin = null

  while (offset < buffer.length) {
    const longueur = vue.getUint32(offset, true)
    const type = vue.getUint32(offset + 4, true)
    const debut = offset + 8

    if (type === 0x4e4f534a) json = JSON.parse(buffer.slice(debut, debut + longueur).toString('utf8'))
    if (type === 0x004e4942) bin = buffer.slice(debut, debut + longueur)

    offset = debut + longueur
  }

  if (!json) throw new Error('Bloc JSON absent du .glb')

  return { gltf: json, bin: bin ?? Buffer.alloc(0) }
}

function lireAccesseur(gltf, bin, index) {
  const accesseur = gltf.accessors[index]
  const vueTampon = gltf.bufferViews[accesseur.bufferView]
  const composant = COMPOSANTS[accesseur.componentType]
  const nbComposants = COMPOSANTS_PAR_TYPE[accesseur.type]

  const depart = (vueTampon.byteOffset ?? 0) + (accesseur.byteOffset ?? 0)
  const pas = vueTampon.byteStride ?? composant.taille * nbComposants
  const vue = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  const valeurs = []

  for (let i = 0; i < accesseur.count; i++) {
    for (let c = 0; c < nbComposants; c++) {
      valeurs.push(composant.lire(vue, depart + i * pas + c * composant.taille))
    }
  }

  return valeurs
}

/* ------------------------------------------------------------------ *
 * Transformations de nœud
 * ------------------------------------------------------------------ */

/** Matrice 4×4 en ordre colonne, comme glTF et USD l'attendent. */
function matriceDuNoeud(noeud) {
  if (noeud.matrix) return noeud.matrix

  const [tx, ty, tz] = noeud.translation ?? [0, 0, 0]
  const [qx, qy, qz, qw] = noeud.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = noeud.scale ?? [1, 1, 1]

  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2
  const yy = qy * y2, yz = qy * z2, zz = qz * z2
  const wx = qw * x2, wy = qw * y2, wz = qw * z2

  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

/* ------------------------------------------------------------------ *
 * Écriture USDA
 * ------------------------------------------------------------------ */

const nettoyerNom = (nom, secours) =>
  (nom ?? secours).replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || secours

const nb = (v) => (Number.isFinite(v) ? Number(v.toFixed(6)) : 0)

function ecrireUsda(gltf, bin, nomRacine) {
  const materiaux = (gltf.materials ?? []).map((m, i) => {
    const pbr = m.pbrMetallicRoughness ?? {}
    const [r, v, b] = pbr.baseColorFactor ?? [0.8, 0.8, 0.8, 1]

    return {
      nom: nettoyerNom(m.name, `materiau_${i}`),
      couleur: [nb(r), nb(v), nb(b)],
      metallique: nb(pbr.metallicFactor ?? 1),
      rugosite: nb(pbr.roughnessFactor ?? 1),
    }
  })

  const lignes = []
  const scene = gltf.scenes?.[gltf.scene ?? 0]
  const racines = scene?.nodes ?? gltf.nodes.map((_, i) => i)

  let triangles = 0

  for (const indexNoeud of racines) {
    const noeud = gltf.nodes[indexNoeud]
    if (noeud.mesh === undefined) continue

    const mesh = gltf.meshes[noeud.mesh]
    const matrice = matriceDuNoeud(noeud)

    mesh.primitives.forEach((primitive, iPrim) => {
      if ((primitive.mode ?? 4) !== 4) return

      const positions = lireAccesseur(gltf, bin, primitive.attributes.POSITION)
      const normales = primitive.attributes.NORMAL
        ? lireAccesseur(gltf, bin, primitive.attributes.NORMAL)
        : null
      const indices = primitive.indices !== undefined
        ? lireAccesseur(gltf, bin, primitive.indices)
        : [...Array(positions.length / 3).keys()]

      triangles += indices.length / 3

      const nom = nettoyerNom(mesh.name, `maillage_${noeud.mesh}`) + (iPrim > 0 ? `_${iPrim}` : '')

      const points = []
      for (let i = 0; i < positions.length; i += 3) {
        points.push(`(${nb(positions[i])}, ${nb(positions[i + 1])}, ${nb(positions[i + 2])})`)
      }

      const normalesUsd = []
      if (normales) {
        for (let i = 0; i < normales.length; i += 3) {
          normalesUsd.push(`(${nb(normales[i])}, ${nb(normales[i + 1])}, ${nb(normales[i + 2])})`)
        }
      }

      const materiau = materiaux[primitive.material]

      lignes.push(`    def Mesh "${nom}"
    {
        uniform bool doubleSided = 0
        uniform token subdivisionScheme = "none"
        int[] faceVertexCounts = [${Array(indices.length / 3).fill(3).join(', ')}]
        int[] faceVertexIndices = [${indices.join(', ')}]
        point3f[] points = [${points.join(', ')}]${
          normalesUsd.length
            ? `\n        normal3f[] normals = [${normalesUsd.join(', ')}] (\n            interpolation = "vertex"\n        )`
            : ''
        }${materiau ? `\n        rel material:binding = </${nomRacine}/Materiaux/${materiau.nom}>` : ''}
        matrix4d xformOp:transform = ( (${matrice.slice(0, 4).map(nb).join(', ')}), (${matrice.slice(4, 8).map(nb).join(', ')}), (${matrice.slice(8, 12).map(nb).join(', ')}), (${matrice.slice(12, 16).map(nb).join(', ')}) )
        uniform token[] xformOpOrder = ["xformOp:transform"]
    }`)
    })
  }

  const blocsMateriaux = materiaux.map((m) => `        def Material "${m.nom}"
        {
            token outputs:surface.connect = </${nomRacine}/Materiaux/${m.nom}/shader.outputs:surface>

            def Shader "shader"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${m.couleur.join(', ')})
                float inputs:metallic = ${m.metallique}
                float inputs:roughness = ${m.rugosite}
                token outputs:surface
            }
        }`)

  return `#usda 1.0
(
    defaultPrim = "${nomRacine}"
    metersPerUnit = 1
    upAxis = "Y"
    doc = "Généré par scripts/glb-vers-usdz.mjs — projet RARV"
)

def Xform "${nomRacine}"
{
${lignes.join('\n\n')}

    def Scope "Materiaux"
    {
${blocsMateriaux.join('\n\n')}
    }
}
`
}

/* ------------------------------------------------------------------ *
 * Écriture du conteneur ZIP, aux contraintes d'Apple
 * ------------------------------------------------------------------ */

const tableCrc = (() => {
  const table = new Uint32Array(256)

  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }

  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const octet of buffer) c = tableCrc[(c ^ octet) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * @param {{nom: string, donnees: Buffer}[]} fichiers
 */
function ecrireUsdz(fichiers) {
  const morceaux = []
  const entrees = []
  let offset = 0

  for (const { nom, donnees } of fichiers) {
    const nomBuf = Buffer.from(nom, 'utf8')
    const crc = crc32(donnees)

    // Alignement 64 octets EXIGÉ par USDZ : le rembourrage passe par le champ
    // « extra » de l'en-tête local, seul endroit prévu à cet effet.
    const avantExtra = offset + 30 + nomBuf.length
    let bourrage = (64 - (avantExtra % 64)) % 64
    if (bourrage > 0 && bourrage < 4) bourrage += 64 // un champ extra fait au moins 4 octets

    const extra = Buffer.alloc(bourrage)
    if (bourrage >= 4) {
      extra.writeUInt16LE(0x0001, 0) // identifiant arbitraire
      extra.writeUInt16LE(bourrage - 4, 2)
    }

    const entete = Buffer.alloc(30)
    entete.writeUInt32LE(0x04034b50, 0)
    entete.writeUInt16LE(10, 4) // version minimale
    entete.writeUInt16LE(0, 6) // drapeaux
    entete.writeUInt16LE(0, 8) // méthode 0 : AUCUNE compression
    entete.writeUInt16LE(0, 10) // heure
    entete.writeUInt16LE(0x21, 12) // date : 1980-01-01, pour un binaire reproductible
    entete.writeUInt32LE(crc, 14)
    entete.writeUInt32LE(donnees.length, 18)
    entete.writeUInt32LE(donnees.length, 22)
    entete.writeUInt16LE(nomBuf.length, 26)
    entete.writeUInt16LE(extra.length, 28)

    entrees.push({ nom: nomBuf, crc, taille: donnees.length, offset, extraLongueur: extra.length })

    morceaux.push(entete, nomBuf, extra, donnees)
    offset += entete.length + nomBuf.length + extra.length + donnees.length
  }

  const debutCentral = offset
  const central = []

  for (const e of entrees) {
    const entete = Buffer.alloc(46)
    entete.writeUInt32LE(0x02014b50, 0)
    entete.writeUInt16LE(20, 4)
    entete.writeUInt16LE(10, 6)
    entete.writeUInt16LE(0, 8)
    entete.writeUInt16LE(0, 10)
    entete.writeUInt16LE(0, 12)
    entete.writeUInt16LE(0x21, 14)
    entete.writeUInt32LE(e.crc, 16)
    entete.writeUInt32LE(e.taille, 20)
    entete.writeUInt32LE(e.taille, 24)
    entete.writeUInt16LE(e.nom.length, 28)
    entete.writeUInt16LE(0, 30)
    entete.writeUInt16LE(0, 32)
    entete.writeUInt16LE(0, 34)
    entete.writeUInt16LE(0, 36)
    entete.writeUInt32LE(0, 38)
    entete.writeUInt32LE(e.offset, 42)

    central.push(entete, e.nom)
    offset += entete.length + e.nom.length
  }

  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(0, 4)
  fin.writeUInt16LE(0, 6)
  fin.writeUInt16LE(entrees.length, 8)
  fin.writeUInt16LE(entrees.length, 10)
  fin.writeUInt32LE(offset - debutCentral, 12)
  fin.writeUInt32LE(debutCentral, 16)
  fin.writeUInt16LE(0, 20)

  return Buffer.concat([...morceaux, ...central, fin])
}

/* ------------------------------------------------------------------ *
 * Programme
 * ------------------------------------------------------------------ */

const [entree, sortie] = process.argv.slice(2)

if (!entree || !sortie) {
  console.error('Usage : node scripts/glb-vers-usdz.mjs <entree.glb> <sortie.usdz>')
  process.exit(1)
}

const { gltf, bin } = lireGlb(entree)
const nomRacine = nettoyerNom(basename(sortie, '.usdz'), 'objet')

const usda = ecrireUsda(gltf, bin, nomRacine)
const usdz = ecrireUsdz([{ nom: `${nomRacine}.usda`, donnees: Buffer.from(usda, 'utf8') }])

mkdirSync(dirname(sortie), { recursive: true })
writeFileSync(sortie, usdz)

const maillages = (gltf.meshes ?? []).length

console.log(`✅ ${sortie}`)
console.log(`   maillages : ${maillages}`)
console.log(`   matériaux : ${(gltf.materials ?? []).length}`)
console.log(`   USDA      : ${(usda.length / 1024).toFixed(1)} Ko`)
console.log(`   USDZ      : ${(usdz.length / 1024).toFixed(1)} Ko`)
