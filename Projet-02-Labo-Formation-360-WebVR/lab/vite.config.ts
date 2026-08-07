import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

/**
 * Sous-chemin de déploiement.
 *
 * En développement, Vite sert à la racine. En production, le labo vit dans
 * `public/labo/` du domaine — même origine que l'API, donc aucun CORS.
 *
 * Sans cette option, le build référence `/assets/…` au lieu de
 * `/labo/assets/…` : la page reste blanche en production, alors que tout
 * fonctionne en local. Panne invisible jusqu'à la mise en ligne.
 *
 *   VITE_BASE=/labo/ npm run build
 */
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,

  // basicSsl : HTTPS auto-signé, sans mkcert ni droits administrateur (décision D7
  // du Projet 01). Obligatoire ici aussi : WebXR `immersive-vr` (Lot 8) exige un
  // contexte sécurisé, et le test sur téléphone passe par HTTPS.
  plugins: [react(), basicSsl()],

  server: {
    // host: true → écoute sur 0.0.0.0, donc joignable depuis le téléphone
    // sur le même Wi-Fi (https://192.168.1.75:5174).
    host: true,

    // ⚠️ 5174 et non 5173 : le viewer du Projet 01 occupe 5173. Les deux fronts
    // doivent pouvoir tourner en même temps — ils partagent le même backend (D6).
    port: 5174,
    strictPort: true,

    // Backend Laravel MUTUALISÉ avec le Projet 01 (ADR-001). Proxifié sous la
    // même origine : pas de CORS en développement.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,

        // ⚠️ `php artisan serve` est MONO-THREAD sous Windows. Les connexions
        // persistantes du proxy immobilisent son unique worker et figent tout le
        // serveur — piège rencontré au Lot 3 du Projet 01. On force donc la
        // fermeture après chaque requête. Sans objet en production (nginx + php-fpm).
        agent: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (requete) => requete.setHeader('Connection', 'close'))
        },
      },
    },
  },
})
