/**
 * Fabrique le paquet à téléverser sur l'hébergement mutualisé.
 *
 * Sur un mutualisé, ni Node ni Composer ne sont disponibles : tout doit être
 * construit ici, y compris `vendor/`. Ce script assemble l'arborescence
 * exacte attendue sur le serveur, sans rien qui n'ait sa place en production.
 *
 * Usage :
 *   node scripts/preparer-deploiement.mjs
 *   node scripts/preparer-deploiement.mjs --sans-build   (réutilise dist/)
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const api = join(racine, 'api')
const viewer = join(racine, 'viewer')
const paquet = join(racine, 'deploiement')
const app = join(paquet, 'rarv-app')

const sansBuild = process.argv.includes('--sans-build')

/* ------------------------------------------------------------------ */

function etape(titre) {
  console.log(`\n▸ ${titre}`)
}

function poids(chemin) {
  let total = 0

  const parcourir = (p) => {
    for (const entree of readdirSync(p, { withFileTypes: true })) {
      const complet = join(p, entree.name)
      if (entree.isDirectory()) parcourir(complet)
      else total += statSync(complet).size
    }
  }

  if (existsSync(chemin)) parcourir(chemin)

  return (total / 1024 / 1024).toFixed(1)
}

/* ------------------------------------------------------------------ */

etape('Nettoyage du paquet précédent')
rmSync(paquet, { recursive: true, force: true })
mkdirSync(app, { recursive: true })

/*
 * Les fronts sont construits et publiés dans `api/public/` par un script
 * dédié — ils y sont VERSIONNÉS, l'hébergement mutualisé ne pouvant rien
 * compiler. La copie de `public/` ci-dessous les embarque donc d'office.
 */
etape('Publication des fronts dans api/public/')
execSync(`node "${join(racine, 'scripts', 'publier-fronts.mjs')}"${sansBuild ? ' --sans-build' : ''}`, {
  cwd: racine,
  stdio: 'inherit',
})

if (!existsSync(join(viewer, 'dist', 'index.html'))) {
  console.error('\n✗ viewer/dist introuvable. Lancez le script sans --sans-build.')
  process.exit(1)
}

/**
 * Garde-fou : sans ce fichier, `/viewer/ar/{token}` et `/viewer/editeur/{slug}`
 * remontent au .htaccess de Laravel et renvoient un 404 du framework. La
 * bascule QR et l'éditeur seraient morts, sans erreur explicite.
 *
 * Le cas se produit quand `viewer/public/.htaccess` a été ajouté APRÈS le
 * dernier build et que l'on relance avec --sans-build.
 */
if (!existsSync(join(viewer, 'dist', '.htaccess'))) {
  console.error(`
✗ viewer/dist/.htaccess absent.

  Vite copie /public au moment du build : relancez SANS --sans-build.
`)
  process.exit(1)
}

/* ------------------------------------------------------------------ *
 * Application Laravel
 * ------------------------------------------------------------------ */

etape('Copie de l\'application Laravel')

// `vendor` est INCLUS : Composer n'est pas disponible sur le serveur.
const dossiersApp = [
  'app', 'bootstrap', 'config', 'database', 'public',
  'resources', 'routes', 'storage', 'vendor',
]
const fichiersApp = ['artisan', 'composer.json', 'composer.lock']

// Ce qui n'a rien à faire en production : secrets, dev, caches locaux,
// base SQLite de développement, journaux.
const exclus = new Set([
  '.env', '.env.example', 'database.sqlite', 'database.sqlite-journal',
  '.phpunit.result.cache', '.gitignore', 'hot',
])

/**
 * Dossiers d'écriture : exclus de la copie, puis RECRÉÉS VIDES.
 * Laravel refuse de démarrer s'ils n'existent pas.
 */
const dossiersEcriture = [
  join('storage', 'framework', 'cache', 'data'),
  join('storage', 'framework', 'sessions'),
  join('storage', 'framework', 'views'),
  join('storage', 'logs'),
  join('bootstrap', 'cache'),
]

/**
 * Chemins simplement exclus, à ne surtout PAS recréer.
 *
 * La base SQLite de développement en fait partie : la production tourne sur
 * MySQL. La recréer en dossier — ce que faisait ce script — produisait un
 * répertoire nommé `database.sqlite`, propre à dérouter au premier incident.
 */
const cheminsExclus = [...dossiersEcriture, join('database', 'database.sqlite')]

for (const dossier of dossiersApp) {
  const source = join(api, dossier)
  if (!existsSync(source)) continue

  cpSync(source, join(app, dossier), {
    recursive: true,
    filter: (chemin) => {
      const relatif = chemin.slice(api.length + 1)
      const nom = relatif.split(/[\\/]/).pop()

      if (exclus.has(nom)) return false

      return !cheminsExclus.some((exclu) => relatif.startsWith(exclu))
    },
  })
}

for (const fichier of fichiersApp) {
  if (existsSync(join(api, fichier))) cpSync(join(api, fichier), join(app, fichier))
}

// Dossiers d'écriture, recréés vides : Laravel refuse de démarrer sans eux.
for (const vide of dossiersEcriture) {
  mkdirSync(join(app, vide), { recursive: true })
  writeFileSync(join(app, vide, '.gitignore'), "*\n!.gitignore\n")
}

etape('Copie du modèle de configuration')
cpSync(join(api, '.env.production.example'), join(app, '.env.example'))

/* ------------------------------------------------------------------ *
 * Contrôle des fronts
 * ------------------------------------------------------------------ *
 *
 * Ils ont déjà été copiés avec `public/` : `publier-fronts.mjs` les écrit
 * dans `api/public/`, où ils sont versionnés. On se contente de vérifier
 * qu'ils sont bien arrivés dans le paquet.
 */

etape('Contrôle des fronts embarqués')

for (const nom of ['viewer', 'labo']) {
  const cible = join(app, 'public', nom)

  if (!existsSync(join(cible, 'index.html'))) {
    console.error(`\n✗ public/${nom}/index.html absent du paquet.`)
    process.exit(1)
  }

  if (!existsSync(join(cible, '.htaccess'))) {
    console.error(`\n✗ public/${nom}/.htaccess absent — le repli SPA ne fonctionnerait pas.`)
    process.exit(1)
  }

  console.log(`  ${nom} : index.html + .htaccess OK`)
}

/* ------------------------------------------------------------------ *
 * Aide-mémoire déposé dans le paquet
 * ------------------------------------------------------------------ */

writeFileSync(
  join(paquet, 'LISEZ-MOI.txt'),
  `RARV — paquet de déploiement
=============================

Arborescence attendue sur le serveur :

  /home/<compte>/rarv-app/          <- ce dossier, HORS de public_html
      app/ bootstrap/ config/ ...
      public/                       <- racine du sous-domaine rarv.kodemeet.com
          viewer/                   <- viewer RA
          labo/                     <- labo de formation (Projet 02)

À FAIRE APRÈS LE TÉLÉVERSEMENT
------------------------------
1. Renommer .env.example en .env, puis le compléter
2. Pointer la racine du sous-domaine sur  rarv-app/public
3. En Terminal cPanel, depuis rarv-app/ :
       php artisan migrate --force
       php artisan db:seed --force
       php artisan config:cache
       php artisan route:cache
       php artisan view:cache
4. Cron toutes les 5 minutes :
       cd ~/rarv-app && php artisan rarv:xapi:rejouer

Procédure détaillée : docs/deploiement-cpanel.md
`,
  'utf8'
)

/* ------------------------------------------------------------------ */

etape('Terminé')
console.log(`
  paquet      : ${paquet}
  application : ${poids(app)} Mo
  dont vendor : ${poids(join(app, 'vendor'))} Mo
  viewer      : ${poids(join(app, 'public', 'viewer'))} Mo
  assets 3D   : ${poids(join(app, 'storage', 'app', 'assets3d'))} Mo
`)
