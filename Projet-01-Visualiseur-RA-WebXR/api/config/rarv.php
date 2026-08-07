<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Secret partagé avec le LMS
    |--------------------------------------------------------------------------
    |
    | La page de leçon (côté serveur LMS) présente ce secret pour obtenir un
    | jeton viewer. Il ne quitte JAMAIS le serveur : le navigateur ne reçoit
    | que le jeton signé, à durée de vie courte.
    |
    */

    'lms_secret' => env('RARV_LMS_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Durées de vie
    |--------------------------------------------------------------------------
    */

    // Jeton viewer (étape 2.7), en minutes.
    'token_ttl' => (int) env('RARV_TOKEN_TTL', 120),

    // Jeton de bascule desktop → mobile (Lot 6), en minutes.
    'handoff_ttl' => (int) env('RARV_HANDOFF_TTL', 10),

    /*
    |--------------------------------------------------------------------------
    | Origines autorisées (étape 2.9)
    |--------------------------------------------------------------------------
    */

    'viewer_origins' => array_filter(
        array_map('trim', explode(',', (string) env('VIEWER_ORIGINS', '')))
    ),

    /*
    |--------------------------------------------------------------------------
    | URL du viewer (Lot 7)
    |--------------------------------------------------------------------------
    |
    | Adresse chargée dans l'iframe par le composant <rarv-viewer>.
    |
    */

    'viewer_url' => env('RARV_VIEWER_URL', 'https://localhost:5173'),

    /*
    |--------------------------------------------------------------------------
    | URL du laboratoire de formation (Projet 02)
    |--------------------------------------------------------------------------
    |
    | Second module de la plateforme mutualisée (ADR-001). Port distinct du
    | viewer : les deux fronts tournent simultanément sur le même backend.
    |
    */

    'lab_url' => env('RARV_LAB_URL', 'https://localhost:5174'),

    /*
    |--------------------------------------------------------------------------
    | Tableau de bord formateur (étape 2.10)
    |--------------------------------------------------------------------------
    |
    | Secret partagé exigé par le middleware `dashboard`. Non configuré, les
    | endpoints d'agrégats répondent 503 : l'absence de secret FERME l'accès,
    | elle ne l'ouvre pas.
    |
    | Le back-office avec comptes formateurs relève du Lot 8 du module
    | « viewer-ra » ; ce secret est la mesure adaptée d'ici là.
    |
    */

    'dashboard_secret' => env('RARV_DASHBOARD_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Organisme émetteur (étape 7.6)
    |--------------------------------------------------------------------------
    |
    | Figure sur l'attestation de fin de formation.
    |
    */

    'organisation' => env('RARV_ORGANISATION', 'RARV — plateforme de formation immersive'),

    /*
    |--------------------------------------------------------------------------
    | Mode démonstration publique (étape 11.5)
    |--------------------------------------------------------------------------
    |
    | « Mode invité : accès sans compte pour qu'un recruteur teste en un clic. »
    |
    | Quand il est actif :
    |
    |   - `/api/guest-token` délivre un jeton à toute personne qui le demande,
    |     avec un identifiant d'apprenant tiré au sort ;
    |   - le tableau de bord formateur et le journal xAPI sont consultables
    |     sans secret partagé ;
    |   - les identifiants d'apprenants y sont PSEUDONYMISÉS.
    |
    | ⚠️ Il ouvre délibérément des écrans qui exposent des scores. C'est
    | acceptable pour une démonstration de portfolio, pas pour un déploiement
    | réel : en production, le laisser à `false` et configurer
    | `RARV_DASHBOARD_SECRET`.
    |
    */

    'demo_public' => filter_var(env('RARV_DEMO_PUBLIC', true), FILTER_VALIDATE_BOOL),

    /*
    |--------------------------------------------------------------------------
    | Authentification du back-office
    |--------------------------------------------------------------------------
    |
    | `false` (défaut) : back-office et tableau de bord en accès LIBRE. C'est
    | le mode portfolio — un recruteur doit pouvoir tout parcourir en un clic,
    | sans compte à créer ni identifiants à demander.
    |
    | `true` : comportement classique, connexion exigée. À basculer le jour où
    | la plateforme accueille de vrais apprenants, car le tableau de bord
    | expose alors une progression nominative.
    |
    */

    'auth_required' => filter_var(env('RARV_AUTH_REQUIRED', false), FILTER_VALIDATE_BOOL),

    /*
    |--------------------------------------------------------------------------
    | Contenus protégés en mode démonstration
    |--------------------------------------------------------------------------
    |
    | Sans authentification, n'importe quel visiteur peut supprimer un objet.
    | Ces slugs sont ceux que porte le CV : ils restent modifiables et
    | consultables, mais ni supprimables ni dépubliables, sans quoi le lien
    | partagé afficherait un jour une page vide.
    |
    */

    'contenus_proteges' => array_filter(array_map('trim', explode(',', (string) env(
        'RARV_CONTENUS_PROTEGES',
        'pompe-centrifuge-01,atelier-maintenance-01'
    )))),

    /*
    |--------------------------------------------------------------------------
    | LRS — Learning Record Store (étapes 7.4 et 7.5)
    |--------------------------------------------------------------------------
    |
    | driver « local » : les déclarations xAPI sont conservées en base et
    | consultables dans le tableau de bord. Utile en développement et pour la
    | démonstration, sans dépendre d'un service externe.
    |
    | driver « http » : envoi vers un vrai LRS (Learning Locker, SCORM Cloud,
    | Veracity…). Le format des déclarations est identique — seul le transport
    | change.
    |
    */

    'lrs' => [
        'driver' => env('RARV_LRS_DRIVER', 'local'),
        'endpoint' => env('RARV_LRS_ENDPOINT'),
        'username' => env('RARV_LRS_USERNAME'),
        'password' => env('RARV_LRS_PASSWORD'),
        'version' => env('RARV_LRS_VERSION', '1.0.3'),
        'timeout' => (int) env('RARV_LRS_TIMEOUT', 5),
    ],

    /*
    |--------------------------------------------------------------------------
    | Identité xAPI (étape 7.4)
    |--------------------------------------------------------------------------
    |
    | IRI de base des activités. Doit être une URI stable et propre à
    | l'organisation : c'est la clé qui relie les déclarations entre elles.
    |
    */

    'xapi_iri' => rtrim((string) env('RARV_XAPI_IRI', 'https://rarv.local/xapi'), '/'),

    'xapi_homepage' => env('RARV_XAPI_HOMEPAGE', 'https://rarv.local'),

    /*
    |--------------------------------------------------------------------------
    | Règle de complétion (étape 7.6)
    |--------------------------------------------------------------------------
    |
    | all_annotations : toutes les annotations doivent avoir été ouvertes
    | min_duration    : une durée minimale de consultation suffit
    | both            : les deux conditions
    |
    */

    'completion' => [
        'mode' => env('RARV_COMPLETION_MODE', 'all_annotations'),
        'min_duration_s' => (int) env('RARV_COMPLETION_MIN_DURATION', 60),
    ],

];
