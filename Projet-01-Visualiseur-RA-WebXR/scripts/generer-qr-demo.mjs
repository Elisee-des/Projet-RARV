/**
 * Étape 10.7 — QR code de la page de démonstration.
 *
 * Généré au DÉPLOIEMENT, pas au runtime : l'URL de démo est fixe, un QR
 * calculé à chaque affichage serait un coût sans contrepartie. Le SVG obtenu
 * reste net à toutes les tailles, ce qui compte quand un recruteur scanne
 * depuis un écran ou une impression.
 *
 * Usage :
 *   node scripts/generer-qr-demo.mjs https://demo.exemple.fr/lecon/pompe-centrifuge-01
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from '../viewer/node_modules/qrcode/lib/index.js'

const url = process.argv[2]

if (!url) {
  console.error('Usage : node scripts/generer-qr-demo.mjs <url>')
  process.exit(1)
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sortie = resolve(racine, 'api/public/img/qr-demo.svg')

const svg = await QRCode.toString(url, {
  type: 'svg',
  margin: 1,
  errorCorrectionLevel: 'M',
  color: { dark: '#12171d', light: '#ffffff' },
})

mkdirSync(dirname(sortie), { recursive: true })
writeFileSync(sortie, svg, 'utf8')

// Écrit aussi l'URL, pour que la page l'affiche en clair sous le code.
writeFileSync(resolve(racine, 'api/public/img/qr-demo.txt'), url, 'utf8')

console.log(`QR de démonstration écrit : ${sortie}`)
console.log(`   cible : ${url}`)
