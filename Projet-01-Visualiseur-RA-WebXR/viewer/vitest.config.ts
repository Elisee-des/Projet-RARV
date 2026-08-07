import { defineConfig } from 'vitest/config'

/**
 * Étape 9.5 — Tests unitaires.
 *
 * Configuration séparée de `vite.config.ts` : celle-ci charge le plugin HTTPS
 * et le proxy vers Laravel, inutiles — et gênants — dans un environnement de
 * test.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
})
