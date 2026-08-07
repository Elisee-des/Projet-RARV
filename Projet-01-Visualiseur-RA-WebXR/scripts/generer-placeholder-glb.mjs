/**
 * Génère un fichier .glb minimal mais VALIDE (scène vide).
 *
 * Sert uniquement à tester le service des assets de l'étape 2.9 — types MIME
 * et en-têtes de cache — avant que le vrai modèle 3D n'arrive au Lot 1.
 *
 * Usage : node scripts/generer-placeholder-glb.mjs <chemin/sortie.glb>
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const gltf = {
  asset: {
    version: '2.0',
    generator: 'RARV — placeholder, à remplacer au Lot 1',
  },
  scene: 0,
  scenes: [{ name: 'placeholder', nodes: [] }],
}

const json = Buffer.from(JSON.stringify(gltf), 'utf8')
// Les chunks GLB doivent être alignés sur 4 octets, complétés par des espaces.
const bourrage = (4 - (json.length % 4)) % 4
const chunkJson = Buffer.concat([json, Buffer.alloc(bourrage, 0x20)])

const entete = Buffer.alloc(12)
entete.writeUInt32LE(0x46546c67, 0) // magic « glTF »
entete.writeUInt32LE(2, 4) // version du conteneur
entete.writeUInt32LE(12 + 8 + chunkJson.length, 8) // longueur totale

const enteteChunk = Buffer.alloc(8)
enteteChunk.writeUInt32LE(chunkJson.length, 0)
enteteChunk.writeUInt32LE(0x4e4f534a, 4) // type « JSON »

const sortie = process.argv[2]
if (!sortie) {
  console.error('Usage : node generer-placeholder-glb.mjs <chemin/sortie.glb>')
  process.exit(1)
}

mkdirSync(dirname(sortie), { recursive: true })
writeFileSync(sortie, Buffer.concat([entete, enteteChunk, chunkJson]))

console.log(`GLB placeholder écrit (${12 + 8 + chunkJson.length} octets) : ${sortie}`)
