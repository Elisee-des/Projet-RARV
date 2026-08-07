/**
 * Recette du Lot 4 — capsule contre BVH, sans navigateur.
 *
 * Charge le VRAI collision.glb depuis le stockage du backend, construit le BVH
 * comme le fait l'application, et fait marcher une capsule contre les murs, le
 * mobilier et des marches synthétiques.
 *
 * ⚠️ L'algorithme de résolution est REPRODUIT ici, pas importé : le code de
 * l'application est du TSX et dépend de React. Ce script valide le pipeline
 * BVH, l'asset et la justesse de l'algorithme documenté — le rendu final reste
 * à confirmer visuellement.
 */
import { readFileSync } from 'node:fs'
import { Box3, BufferAttribute, BufferGeometry, FrontSide, Line3, Ray, Vector3 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'

const CHEMIN =
  'D:/Projets web/Projet RARV/Projet-01-Visualiseur-RA-WebXR/api/storage/app/assets3d/environnements/atelier-maintenance-01/collision.glb'

/* ---------------------------------------------------------------- *
 * Lecture du GLB réel
 * ---------------------------------------------------------------- */

const octets = readFileSync(CHEMIN)
if (octets.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('GLB invalide')

const longueurJson = octets.readUInt32LE(12)
const gltf = JSON.parse(octets.subarray(20, 20 + longueurJson).toString('utf8'))
const bin = octets.subarray(20 + longueurJson + 8)

const lireAccesseur = (index, Type) => {
  const acc = gltf.accessors[index]
  const vue = gltf.bufferViews[acc.bufferView]
  const composantes = { SCALAR: 1, VEC3: 3 }[acc.type]
  return new Type(bin.buffer, bin.byteOffset + (vue.byteOffset ?? 0), acc.count * composantes)
}

const positions = []

for (const noeud of gltf.nodes) {
  if (noeud.mesh === undefined) continue
  const [tx, ty, tz] = noeud.translation ?? [0, 0, 0]

  for (const primitive of gltf.meshes[noeud.mesh].primitives) {
    const pos = lireAccesseur(primitive.attributes.POSITION, Float32Array)
    const idx = lireAccesseur(primitive.indices, Uint16Array)
    for (const i of idx) {
      positions.push(pos[i * 3] + tx, pos[i * 3 + 1] + ty, pos[i * 3 + 2] + tz)
    }
  }
}

const construireBvh = (tableau) => {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(tableau), 3))
  return new MeshBVH(g)
}

const bvhSalle = construireBvh(positions)
const volumes = gltf.nodes.filter((n) => n.mesh !== undefined).length

console.log(`BVH de l'atelier : ${positions.length / 9} triangles, ${volumes} volumes\n`)

/* ---------------------------------------------------------------- *
 * Géométrie synthétique : un sol et deux marches de hauteurs différentes
 * ---------------------------------------------------------------- */

function pave(min, max) {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const s = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ]
  const faces = [
    [0, 1, 2], [0, 2, 3], [5, 4, 7], [5, 7, 6], [4, 0, 3], [4, 3, 7],
    [1, 5, 6], [1, 6, 2], [3, 2, 6], [3, 6, 7], [4, 5, 1], [4, 1, 0],
  ]
  return faces.flatMap((f) => f.flatMap((i) => s[i]))
}

// Le marcheur part de z = 5 et avance vers −Z : la marche est DEVANT lui,
// de z = −2 à z = −10.
const marcheBasse = [
  ...pave([-5, -0.2, -10], [5, 0, 10]), // sol
  ...pave([-5, 0, -10], [5, 0.18, -2]), // marche de 0,18 m
]

const marcheHaute = [
  ...pave([-5, -0.2, -10], [5, 0, 10]),
  ...pave([-5, 0, -10], [5, 0.4, -2]), // marche de 0,40 m
]

/* ---------------------------------------------------------------- *
 * Solveur — reproduction de ControleurJoueur
 * ---------------------------------------------------------------- */

const RAYON = 0.35
const HAUTEUR = 1.7
const SEGMENT = HAUTEUR - 2 * RAYON
const HAUT_DEPUIS_PIEDS = SEGMENT + RAYON
const GRAVITE = -22
const VITESSE = 2.2
const PAS = 1 / 60
const HAUTEUR_MARCHE = 0.25
const SALLE = { largeur: 10, hauteur: 3.2, profondeur: 8 }

const boite = new Box3()
const seg = new Line3()
const vA = new Vector3()
const vB = new Vector3()
const vC = new Vector3()
const intention = new Vector3()
const sauvegarde = new Vector3()

function resoudre(bvh, position, vitesse, etat) {
  seg.start.copy(position)
  seg.end.set(position.x, position.y - SEGMENT, position.z)

  boite.makeEmpty()
  boite.expandByPoint(seg.start)
  boite.expandByPoint(seg.end)
  boite.min.addScalar(-RAYON)
  boite.max.addScalar(RAYON)

  const avant = vA.copy(seg.start)

  bvh.shapecast({
    intersectsBounds: (bornes) => bornes.intersectsBox(boite),
    intersectsTriangle: (tri) => {
      const pTri = vB
      const pCap = vC
      const d = tri.closestPointToSegment(seg, pTri, pCap)
      if (d < RAYON) {
        const normale = pCap.sub(pTri).normalize()
        seg.start.addScaledVector(normale, RAYON - d)
        seg.end.addScaledVector(normale, RAYON - d)
      }
      return false
    },
  })

  const delta = vB.subVectors(seg.start, avant)
  etat.auSol = delta.y > Math.abs(vitesse.y) * 0.016

  const longueur = Math.max(0, delta.length() - 1e-5)
  if (longueur > 0) {
    delta.normalize().multiplyScalar(longueur)
    position.add(delta)
  }

  if (etat.auSol) {
    vitesse.set(0, 0, 0)
  } else if (longueur > 0) {
    delta.normalize()
    vitesse.addScaledVector(delta, -delta.dot(vitesse))
  }
}

const sauvegardeVitesse = new Vector3()
const rayonSonde = new Ray()

function tenterMarche(bvh, position, vitesse, etat) {
  const recul = Math.hypot(position.x - intention.x, position.z - intention.z)
  if (recul < 0.004) return

  const piedsActuels = position.y - HAUT_DEPUIS_PIEDS

  rayonSonde.origin.set(intention.x, piedsActuels + HAUTEUR_MARCHE + 0.05, intention.z)
  rayonSonde.direction.set(0, -1, 0)

  const impact = bvh.raycastFirst(rayonSonde, FrontSide, 0, HAUTEUR_MARCHE + 0.35)
  if (!impact) return

  const hauteurMarche = impact.point.y - piedsActuels
  if (hauteurMarche > HAUTEUR_MARCHE || hauteurMarche < 0.01) return

  sauvegarde.copy(position)
  sauvegardeVitesse.copy(vitesse)
  const auSolAvant = etat.auSol

  position.set(intention.x, impact.point.y + HAUT_DEPUIS_PIEDS + 0.001, intention.z)

  resoudre(bvh, position, vitesse, etat)

  if (Math.hypot(position.x - intention.x, position.z - intention.z) > recul * 0.5) {
    position.copy(sauvegarde)
    vitesse.copy(sauvegardeVitesse)
    etat.auSol = auSolAvant
  }
}

function marcher(bvh, departPieds, dir, secondes, { borner = true } = {}) {
  const position = new Vector3(departPieds[0], departPieds[1] + HAUT_DEPUIS_PIEDS, departPieds[2])
  const vitesse = new Vector3()
  const etat = { auSol: false }

  for (let i = 0; i < Math.round(secondes / PAS); i++) {
    vitesse.y = etat.auSol ? PAS * GRAVITE : vitesse.y + PAS * GRAVITE
    position.addScaledVector(vitesse, PAS)

    const seDeplace = dir[0] !== 0 || dir[1] !== 0
    position.x += dir[0] * VITESSE * PAS
    position.z += dir[1] * VITESSE * PAS

    const auSolAvant = etat.auSol
    intention.copy(position)

    resoudre(bvh, position, vitesse, etat)

    if (seDeplace && auSolAvant) tenterMarche(bvh, position, vitesse, etat)

    if (borner) {
      const marge = RAYON * 0.5
      position.x = Math.min(Math.max(position.x, marge), SALLE.largeur - marge)
      position.z = Math.min(Math.max(position.z, marge), SALLE.profondeur - marge)
      position.y = Math.min(position.y, SALLE.hauteur - RAYON)
    }
  }

  return {
    pieds: new Vector3(position.x, position.y - HAUT_DEPUIS_PIEDS, position.z),
    auSol: etat.auSol,
  }
}

/* ---------------------------------------------------------------- *
 * Cas de test
 * ---------------------------------------------------------------- */

let echecs = 0
const verifier = (nom, condition, detail) => {
  console.log(`${condition ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`)
  if (!condition) echecs++
}

const SPAWN = [5, 0, 6.5]

console.log('── Atelier réel ──')

{
  const r = marcher(bvhSalle, SPAWN, [0, 0], 2)
  verifier(
    'Le joueur repose sur le sol au point d’apparition',
    r.auSol && Math.abs(r.pieds.y) < 0.02,
    `pieds y = ${r.pieds.y.toFixed(4)} m`
  )
}

{
  const r = marcher(bvhSalle, [5, 3, 4], [0, 0], 3)
  verifier('Une chute de 3 m se termine au sol', r.auSol && Math.abs(r.pieds.y) < 0.02, `pieds y = ${r.pieds.y.toFixed(4)} m`)
}

{
  const r = marcher(bvhSalle, SPAWN, [0, -1], 8)
  verifier('Le mur nord arrête la marche', r.pieds.z > RAYON - 0.02 && r.pieds.z < 1.6, `z = ${r.pieds.z.toFixed(3)} m`)
}

{
  const r = marcher(bvhSalle, [5, 0, 4], [-1, 0], 8)
  verifier('Le mur ouest arrête la marche', r.pieds.x > RAYON - 0.02, `x = ${r.pieds.x.toFixed(3)} m`)
}

{
  const r = marcher(bvhSalle, [5, 0, 4], [1, 0], 8)
  verifier('Le mur est arrête la marche', r.pieds.x < SALLE.largeur - RAYON + 0.02, `x = ${r.pieds.x.toFixed(3)} m`)
}

{
  const r = marcher(bvhSalle, [5, 0, 3], [0, -1], 6)
  verifier('L’établi (0,90 m) bloque', r.pieds.z > 0.8 + RAYON - 0.05, `z = ${r.pieds.z.toFixed(3)} m`)
}

{
  // Le socle de la pompe fait 0,40 m : c'est du MOBILIER, il doit bloquer.
  const r = marcher(bvhSalle, [2.5, 0, 4], [0, -1], 6)
  verifier(
    'Le socle de la pompe (0,40 m) bloque — c’est du mobilier, pas un cheminement',
    r.pieds.z > 2.6 + RAYON - 0.05 && r.pieds.y < 0.05,
    `z = ${r.pieds.z.toFixed(3)} m, pieds y = ${r.pieds.y.toFixed(3)} m`
  )
}

{
  const r = marcher(bvhSalle, [8.7, 0, 6.5], [0, 1], 6)
  verifier(
    'Les bornes de scène retiennent devant la porte',
    r.pieds.z <= SALLE.profondeur - RAYON * 0.5 + 0.01,
    `z = ${r.pieds.z.toFixed(3)} m`
  )
}

{
  const r = marcher(bvhSalle, [8.7, 0, 6.5], [0, 1], 6, { borner: false })
  verifier(
    'Sans bornes, l’ouverture de porte est franchissable — la borne 4.6 est donc nécessaire',
    r.pieds.z > SALLE.profondeur,
    `z = ${r.pieds.z.toFixed(3)} m`
  )
}

{
  const r = marcher(bvhSalle, [1.5, 0, 4], [-1, -1], 6)
  verifier(
    'La capsule glisse le long du mur au lieu de s’y coller',
    r.pieds.x > RAYON - 0.02 && r.pieds.z < 2.5,
    `x = ${r.pieds.x.toFixed(3)}, z = ${r.pieds.z.toFixed(3)}`
  )
}

{
  const r = marcher(bvhSalle, [5, 0, 7], [0, -1], 10)
  verifier(
    'Traversée complète de la salle en restant au sol',
    r.auSol && Math.abs(r.pieds.y) < 0.02,
    `arrivée z = ${r.pieds.z.toFixed(3)} m`
  )
}

console.log('\n── Marches synthétiques (étape 4.3) ──')

{
  const bvh = construireBvh(marcheBasse)
  const r = marcher(bvh, [0, 0, 5], [0, -1], 6, { borner: false })
  verifier(
    'Une marche de 0,18 m est franchie automatiquement',
    r.pieds.z < -2 && Math.abs(r.pieds.y - 0.18) < 0.03,
    `z = ${r.pieds.z.toFixed(3)} m, pieds y = ${r.pieds.y.toFixed(3)} m (attendu 0,180)`
  )
}

{
  const bvh = construireBvh(marcheHaute)
  const r = marcher(bvh, [0, 0, 5], [0, -1], 6, { borner: false })
  verifier(
    'Une marche de 0,40 m bloque',
    r.pieds.z > -2 && r.pieds.y < 0.05,
    `z = ${r.pieds.z.toFixed(3)} m (arrêt avant z = −2), pieds y = ${r.pieds.y.toFixed(3)} m`
  )
}

console.log(echecs === 0 ? '\n✅ Recette collisions validée' : `\n❌ ${echecs} cas en échec`)
process.exitCode = echecs === 0 ? 0 : 1
