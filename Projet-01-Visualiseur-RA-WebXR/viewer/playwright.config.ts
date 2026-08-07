import { defineConfig, devices } from '@playwright/test'

/**
 * Étape 9.6 — Configuration des tests de bout en bout.
 *
 * `ignoreHTTPSErrors` est indispensable : le viewer tourne en HTTPS avec un
 * certificat auto-signé, exigé par WebXR et l'accès caméra (décision D7).
 *
 * Les navigateurs ne sont pas téléchargés par défaut :
 *   npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',

  use: {
    // Les pages de leçon sont servies par Laravel, le viewer par Vite.
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
