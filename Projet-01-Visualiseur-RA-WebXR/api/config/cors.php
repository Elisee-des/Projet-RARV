<?php

/*
|--------------------------------------------------------------------------
| Étape 2.9 — Partage de ressources entre origines (CORS)
|--------------------------------------------------------------------------
|
| En développement, le viewer passe par le proxy Vite : front et API
| partagent l'origine, aucun CORS n'est traversé. Cette configuration sert
| donc surtout la production, où le viewer et l'API sont sur deux domaines.
|
| Les origines viennent de VIEWER_ORIGINS. Si la variable est vide, on
| n'autorise rien plutôt que d'ouvrir à tous par défaut.
|
*/

return [

    'paths' => ['api/*', 'assets/*'],

    'allowed_methods' => ['GET', 'POST', 'PATCH', 'OPTIONS'],

    'allowed_origins' => config('rarv.viewer_origins', []),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    // Pas de cookie : l'authentification passe par un jeton porteur (2.7).
    'supports_credentials' => false,

];
