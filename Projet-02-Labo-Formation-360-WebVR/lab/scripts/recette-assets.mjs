import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DOSSIER =
  'D:/Projets web/Projet RARV/Projet-01-Visualiseur-RA-WebXR/api/storage/app/assets3d/environnements/atelier-maintenance-01'

let echecs = 0
const verifier = (nom, condition, detail) => {
  console.log(`  ${condition ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`)
  if (!condition) echecs++
}

for (const fichier of ['fiche-couples-serrage.pdf', 'fiche-stockage-lubrifiants.pdf']) {
  const octets = readFileSync(join(DOSSIER, fichier))
  const s = octets.toString('latin1')

  console.log(`\n${fichier} (${(octets.length / 1024).toFixed(1)} Ko)`)

  verifier('En-tête %PDF-1.4', s.startsWith('%PDF-1.4'))
  verifier('Terminaison %%EOF', s.trimEnd().endsWith('%%EOF'))

  const startxref = Number(s.match(/startxref\s+(\d+)/)?.[1])
  verifier('startxref pointe sur la table xref', s.slice(startxref, startxref + 4) === 'xref', `offset ${startxref}`)

  const offsets = [...s.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
  const justes = offsets.every((o, i) => s.slice(o).startsWith(`${i + 1} 0 obj`))
  verifier('Chaque offset xref pointe sur son objet', justes, `${offsets.length} objets`)

  const longueurs = [...s.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)]
  verifier(
    'La longueur de chaque flux de contenu est exacte',
    longueurs.every(([, declaree, flux]) => Buffer.byteLength(flux, 'latin1') === Number(declaree)),
    `${longueurs.length} flux`
  )

  const pages = Number(s.match(/\/Count (\d+)/)?.[1])
  const objetsPage = (s.match(/\/Type \/Page[^s]/g) ?? []).length
  verifier('Le nombre de pages déclaré correspond aux objets', pages === objetsPage, `${pages} page(s)`)

  const kids = (s.match(/\/Kids \[([^\]]*)\]/)?.[1] ?? '').match(/\d+ 0 R/g) ?? []
  verifier('L’arbre des pages référence toutes les pages', kids.length === pages)

  const lignes = (s.match(/\) Tj/g) ?? []).length
  verifier('Le document porte du texte', lignes > 20, `${lignes} lignes`)

  // ⚠️ Le seul contrôle qui attrape une troncature : la DERNIÈRE phrase de
  // chaque fiche, plus le pied de page écrit tout à la fin. Compter les lignes
  // ne prouve rien — un document amputé en a toujours « assez ».
  const dernierePhrase = {
    'fiche-couples-serrage.pdf': 'cle dynamometrique pour desserrer',
    'fiche-stockage-lubrifiants.pdf': 'symptome d une fuite a traiter',
  }[fichier]

  verifier('La dernière phrase du contenu est présente', s.includes(dernierePhrase))
  verifier('Le pied de page est présent', s.includes('RARV - plateforme de formation immersive'))

  const horsLatin1 = [...s].some((c) => c.charCodeAt(0) > 255)
  verifier('Aucun caractère hors table Latin-1', !horsLatin1)

  const polices = (s.match(/BaseFont \/Helvetica(-Bold)?/g) ?? []).length
  verifier('Polices de base référencées (aucune à embarquer)', polices === 2, `${polices} polices`)
}

console.log(echecs === 0 ? '\n✅ PDF structurellement valides' : `\n❌ ${echecs} contrôle(s) en échec`)
process.exitCode = echecs === 0 ? 0 : 1
