/**
 * Recette de la chaîne du Lot 3, telle que le navigateur la parcourt :
 *   fiche de l'environnement → URL même origine → .glb → repères nommés
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // certificat auto-signé de basicSsl

const BASE = process.argv[2] ?? 'https://localhost:5174'

const versMemeOrigine = (url) => {
  if (!url) return url
  const u = new URL(url, BASE)
  return u.pathname.startsWith('/api/') ? `${u.pathname}${u.search}` : url
}

const echec = (m) => {
  console.error(`❌ ${m}`)
  process.exitCode = 1
}

// 1 — fiche
const fiche = await fetch(`${BASE}/api/environments/atelier-maintenance-01`).then((r) => r.json())
const env = fiche.data
console.log(`1. Fiche      : ${env.points.length} postes, ${env.completion.requiredPoints.length} requis`)

// 2 — réécriture même origine (le correctif du test sur téléphone)
const urlScene = versMemeOrigine(env.assets.scene)
const urlCollision = versMemeOrigine(env.assets.collision)
console.log(`2. URL scène  : ${urlScene.slice(0, 72)}…`)
if (urlScene.startsWith('http')) echec('URL absolue : elle échouera depuis le téléphone')

// 3 — téléchargement du .glb par le chemin même origine
const reponse = await fetch(`${BASE}${urlScene}`)
const octets = Buffer.from(await reponse.arrayBuffer())
console.log(
  `3. atelier.glb: HTTP ${reponse.status} | ${reponse.headers.get('content-type')} | ${octets.length} octets`
)
if (reponse.status !== 200) echec('la scène ne se télécharge pas')
if (reponse.headers.get('content-type') !== 'model/gltf-binary') echec('type MIME incorrect')

// 4 — structure GLB
if (octets.subarray(0, 4).toString('ascii') !== 'glTF') echec('en-tête GLB invalide')
const longueurJson = octets.readUInt32LE(12)
const gltf = JSON.parse(octets.subarray(20, 20 + longueurJson).toString('utf8'))
console.log(`4. Structure  : ${gltf.nodes.length} nœuds, ${gltf.meshes.length} maillages, ${gltf.materials.length} matériaux`)

// 5 — LES REPÈRES NOMMÉS (étape 1.10 / 3.5)
const attendus = ['SPAWN', ...Array.from({ length: 8 }, (_, i) => `POI_0${i + 1}`)]
const empties = gltf.nodes.filter((n) => n.mesh === undefined).map((n) => n.name)
const manquants = attendus.filter((n) => !empties.includes(n))

console.log(`5. Repères    : ${empties.length} Empty — ${empties.join(', ')}`)
if (manquants.length) echec(`repères manquants : ${manquants.join(', ')}`)

// 6 — chaque poste de l'API trouve son repère
const sansRepere = env.points.filter((p) => !empties.includes(p.code)).map((p) => p.code)
console.log(`6. Croisement : ${env.points.length - sansRepere.length}/${env.points.length} postes placés depuis le .glb`)
if (sansRepere.length) echec(`postes sans repère : ${sansRepere.join(', ')}`)

// 7 — mesh de collision
const col = await fetch(`${BASE}${urlCollision}`)
const colOctets = Buffer.from(await col.arrayBuffer())
const colJson = JSON.parse(
  colOctets.subarray(20, 20 + colOctets.readUInt32LE(12)).toString('utf8')
)
console.log(`7. collision  : HTTP ${col.status} | ${colJson.meshes.length} volumes | ${colOctets.length} octets`)
if (colJson.meshes.length >= gltf.meshes.length) echec('le mesh de collision n’est pas plus simple que la scène')

// 8 — décodeurs servis en local
for (const chemin of ['/draco/draco_decoder.wasm', '/basis/basis_transcoder.wasm']) {
  const r = await fetch(`${BASE}${chemin}`)
  console.log(`8. ${chemin.padEnd(32)} HTTP ${r.status}`)
  if (r.status !== 200) echec(`décodeur absent : ${chemin}`)
}

console.log(process.exitCode ? '\n❌ Recette en échec' : '\n✅ Chaîne complète validée')
