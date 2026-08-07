import { defineConfig, devices } from '@playwright/test'

/**
 * Étape 10.8 — Tests de bout en bout.
 *
 * > « Test E2E du parcours quiz **via le parcours 2D** — la 3D ne s'automatise
 * > pas. »
 *
 * C'est la raison d'être des tests écrits ici. Piloter une scène WebGL depuis
 * un navigateur automatisé demanderait de simuler des déplacements à la
 * souris, d'attendre que la caméra arrive, de deviner qu'un poste est visé —
 * un test lent, fragile, et qui échouerait pour des raisons sans rapport avec
 * la pédagogie. Le parcours accessible de l'étape 10.4 traverse exactement la
 * même chaîne — mêmes API, même correction serveur, même progression — en HTML
 * ordinaire, donc en quelques secondes et sans hasard.
 *
 * ⚠️ `ignoreHTTPSErrors` : le serveur de développement utilise un certificat
 * auto-signé (`@vitejs/plugin-basic-ssl`, décision D7). Sans cette option, tous
 * les tests échoueraient sur une erreur de certificat, pas sur l'application.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],

  use: {
    baseURL: 'https://localhost:5174',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    locale: 'fr-FR',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Le serveur de développement est réutilisé s'il tourne déjà, sinon démarré.
  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:5174',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120_000,
  },
})
