/**
 * Construit les deux fronts et les publie dans `api/public/`.
 *
 * Pourquoi versionner des fichiers construits — ce qu'on évite d'ordinaire :
 * l'hébergement est mutualisé, sans Node ni Composer. Sans build committé, le
 * serveur ne peut RIEN produire. Le dépôt reflète donc l'arborescence réelle
 * du serveur, et `git pull` suffit à mettre les fronts à jour.
 *
 *   api/public/viewer/   ← https://rarv.kodemeet.com/viewer/
 *   api/public/labo/     ← https://rarv.kodemeet.com/labo/
 *
 * Les `dist/` restent ignorés : ils feraient doublon dans l'historique.
 *
 * Usage :
 *   node scripts/publier-fronts.mjs
 *   node scripts/publier-fronts.mjs --sans-build   (réutilise les dist/)
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicApi = join(racine, 'api', 'public')

const sansBuild = process.argv.includes('--sans-build')

/**
 * `@react-three/xr` embarque un émulateur WebXR et ses décors de test —
 * près de 6 Mo. Le store est configuré avec `emulate: false` : ces morceaux
 * ne sont jamais chargés en production, et n'ont donc rien à faire dans
 * l'historique du dépôt.
 */
const MORCEAUX_EMULATEUR = /^(emulate-|.*_room-|office_(small|large)-)/

const FRONTS = [
  {
    nom: 'viewer RA',
    source: join(racine, 'viewer'),
    base: '/viewer/',
    cible: join(publicApi, 'viewer'),
  },
  {
    nom: 'labo de formation',
    source: join(racine, '..', 'Projet-02-Labo-Formation-360-WebVR', 'lab'),
    base: '/labo/',
    cible: join(publicApi, 'labo'),
  },
]

function poids(chemin) {
  let total = 0

  const parcourir = (p) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const complet = join(p, e.name)
      e.isDirectory() ? parcourir(complet) : (total += statSync(complet).size)
    }
  }

  if (existsSync(chemin)) parcourir(chemin)

  return (total / 1024 / 1024).toFixed(1)
}

for (const front of FRONTS) {
  if (!existsSync(join(front.source, 'package.json'))) {
    console.log(`\n⚠ ${front.nom} introuvable — ignoré`)
    continue
  }

  console.log(`\n▸ ${front.nom} — base ${front.base}`)

  if (!sansBuild) {
    execSync('npm run build', {
      cwd: front.source,
      stdio: 'inherit',
      env: { ...process.env, VITE_BASE: front.base },
    })
  }

  const dist = join(front.source, 'dist')

  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`\n✗ ${dist} introuvable. Relancez sans --sans-build.`)
    process.exit(1)
  }

  /*
   * Sans ce fichier, les routes internes remontent au .htaccess de Laravel et
   * reçoivent un 404 du framework. Vite copie /public au moment du build : son
   * absence signale un dist périmé.
   */
  if (!existsSync(join(dist, '.htaccess'))) {
    console.error(`\n✗ ${dist}/.htaccess absent. Relancez sans --sans-build.`)
    process.exit(1)
  }

  // Vérifie que le build porte bien la base attendue — un dist construit pour
  // la racine donnerait une page blanche en production.
  const html = readFileSync(join(dist, 'index.html'), 'utf8')

  if (!html.includes(`src="${front.base}`)) {
    console.error(`
✗ ${front.nom} : le build ne porte pas la base ${front.base}.
  Relancez sans --sans-build.
`)
    process.exit(1)
  }

  // Remplacement complet : sinon les fichiers hashés des builds précédents
  // s'accumuleraient indéfiniment dans le dépôt.
  rmSync(front.cible, { recursive: true, force: true })

  let ecartes = 0

  cpSync(dist, front.cible, {
    recursive: true,
    filter: (chemin) => {
      const nom = chemin.split(/[\\/]/).pop() ?? ''

      if (MORCEAUX_EMULATEUR.test(nom)) {
        ecartes += statSync(chemin).size

        return false
      }

      return true
    },
  })

  console.log(`  → api/public/${front.base.replaceAll('/', '')} · ${poids(front.cible)} Mo`)

  if (ecartes > 0) {
    console.log(`  émulateur WebXR écarté : ${(ecartes / 1024 / 1024).toFixed(1)} Mo`)
  }
}

console.log(`
✅ Fronts publiés dans api/public/

   Ils sont VERSIONNÉS : commitez-les pour qu'un simple « git pull »
   mette le serveur à jour.

     git add Projet-01-Visualiseur-RA-WebXR/api/public/viewer \\
             Projet-01-Visualiseur-RA-WebXR/api/public/labo
     git commit -m "build: fronts viewer et labo"
     git push
`)
