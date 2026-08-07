/**
 * Copie les décodeurs Draco et Basis depuis node_modules/three vers public/.
 *
 * Ils sont servis en local, jamais depuis un CDN : une démonstration ne doit
 * pas dépendre d'un domaine externe pour afficher une salle, et la politique
 * de sécurité de contenu de l'étape 11.2 bloquerait l'appel.
 *
 * Exécuté automatiquement avant `npm run dev` et `npm run build`.
 */
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const three = resolve(racine, 'node_modules/three/examples/jsm/libs')

const copies = [
  { de: `${three}/draco/gltf`, vers: resolve(racine, 'public/draco') },
  { de: `${three}/basis`, vers: resolve(racine, 'public/basis') },
]

for (const { de, vers } of copies) {
  mkdirSync(vers, { recursive: true })
  cpSync(de, vers, { recursive: true, filter: (src) => !src.endsWith('README.md') })
  console.log(`décodeurs → ${vers.replace(racine, '.')}`)
}
