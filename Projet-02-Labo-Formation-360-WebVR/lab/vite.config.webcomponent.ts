import { defineConfig } from 'vite'

/**
 * Étape 9.1 — Build autonome du Web Component.
 *
 * Le composant doit être un **fichier isolé**, servi tel quel à un LMS :
 *
 * ```html
 * <script type="module" src="https://…/rarv-lab.js"></script>
 * <rarv-lab environment="atelier-maintenance-01"></rarv-lab>
 * ```
 *
 * ⚠️ Il ne peut pas être livré par le bundle de l'application. Une page de
 * leçon Moodle n'a aucune raison de télécharger React, Three.js et 1,3 Mo de
 * moteur 3D pour afficher une iframe — c'est le contenu de l'iframe qui les
 * charge, quand l'apprenant décide d'entrer.
 *
 * Sortie : `public/rarv-lab.js`, donc repris automatiquement dans `dist/` par
 * le build principal. Environ 2 Ko, sans aucune dépendance.
 */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/lms/rarv-lab-autonome.ts',
      formats: ['es'],
      fileName: () => 'rarv-lab.js',
    },
    outDir: 'public',
    emptyOutDir: false,
    // On écrit dans `public/`, qui contient aussi les décodeurs Draco et KTX2 :
    // vider le dossier les emporterait.
    //
    // Minifieur laissé par défaut : Vite 8 s'appuie sur Rolldown, et demander
    // explicitement `esbuild` exige d'installer une dépendance de plus.
    target: 'es2022',
  },
})
