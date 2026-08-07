import { defineConfig } from 'vitest/config'

/**
 * Étape 10.7 — Tests unitaires.
 *
 * Configuration séparée de `vite.config.ts` : le serveur de développement
 * charge `basicSsl` et un proxy, qui n'ont rien à faire dans un lanceur de
 * tests et ralentissent chaque démarrage.
 *
 * `jsdom` est nécessaire, pas décoratif : la fonction d'assainissement du HTML
 * s'appuie sur `DOMParser`, et la file d'attente hors-ligne sur
 * `localStorage`. Les tester sans DOM reviendrait à tester autre chose.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
})
