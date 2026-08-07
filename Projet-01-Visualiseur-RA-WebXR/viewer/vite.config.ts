import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

/**
 * Sous-chemin de déploiement.
 *
 * En développement, Vite sert à la racine. En production sur hébergement
 * mutualisé, le viewer vit dans `public/viewer/` du domaine — même origine que
 * l'API, donc aucun CORS à traverser.
 *
 *   VITE_BASE=/viewer/ npm run build
 */
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,

  // basicSsl : HTTPS auto-signé. Obligatoire — WebXR et l'accès caméra
  // exigent un contexte sécurisé, y compris en développement local.
  plugins: [react(), basicSsl()],

  server: {
    // host: true → écoute sur 0.0.0.0, donc accessible depuis le téléphone
    // sur le même Wi-Fi (https://192.168.1.75:5173)
    host: true,
    port: 5173,

    // L'API Laravel est proxifiée sous la même origine : pas de CORS en dev.
    // La configuration CORS de production reste à faire (étape 2.9).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,

        // ⚠️ `php artisan serve` est MONO-THREAD sous Windows. Les connexions
        // persistantes du proxy immobilisent son unique worker et figent tout
        // le serveur. On force donc la fermeture après chaque requête.
        // Sans objet en production (nginx + php-fpm).
        agent: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (requete) => requete.setHeader('Connection', 'close'))
        },
      },
    },
  },
})
