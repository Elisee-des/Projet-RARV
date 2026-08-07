<?php

use App\Http\Controllers\Api\Admin\AnnotationEditorController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AttemptController;
use App\Http\Controllers\Api\AttestationController;
use App\Http\Controllers\Api\EnvironmentAssetController;
use App\Http\Controllers\Api\EnvironmentController;
use App\Http\Controllers\Api\HandoffController;
use App\Http\Controllers\Api\LabDashboardController;
use App\Http\Controllers\Api\LearningObjectController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\SessionEventController;
use App\Http\Controllers\Api\ViewerTokenController;
use App\Http\Controllers\Api\ViewSessionController;
use App\Http\Controllers\Api\XapiController;
use App\Models\Environment;
use App\Models\LearningObject;
use App\Support\ViewerToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Routes API — Projet 01, visualiseur d'objets pédagogiques en RA
|--------------------------------------------------------------------------
|
| Préfixées automatiquement par /api et sans état.
|
*/

/**
 * Sonde de santé du socle technique (étape 0.3).
 */
Route::get('/ping', fn () => response()->json([
    'service' => 'rarv-api',
    // Socle mutualisé depuis l'ADR-001 du Projet 02 : cette même API sert le
    // viewer RA (module 1) et le laboratoire de formation 3D (module 2).
    'plateforme' => 'RARV — plateforme de formation immersive',
    'modules' => ['viewer-ra', 'labo-formation'],
    'laravel' => app()->version(),
    'php' => PHP_VERSION,
    'env' => app()->environment(),
    'time' => now()->toIso8601String(),
]));

/*
| Émission de jetons (2.7) -------------------------------------------------
| Appelé par le SERVEUR du LMS, authentifié par secret partagé.
*/
Route::post('/viewer-tokens', [ViewerTokenController::class, 'store'])
    ->middleware('throttle:tokens');

/*
| Jeton de développement ---------------------------------------------------
| En production, le jeton est émis par le SERVEUR du LMS (route ci-dessus) et
| injecté dans l'URL de l'iframe du viewer. Cette route reproduit ce geste en
| local, sans secret partagé — elle n'existe QUE dans l'environnement local.
*/
if (app()->environment('local')) {
    Route::get('/dev/viewer-token', function (Request $request) {
        abort_unless(app()->environment('local'), 404);

        $slug = (string) $request->query('slug');

        // Socle mutualisé (ADR-001) : le slug désigne soit un objet du module
        // « viewer-ra », soit un environnement du module « labo-formation ».
        // Le module est déduit ici et inscrit dans le jeton — le client ne le
        // choisit pas.
        $module = match (true) {
            LearningObject::query()->published()->where('slug', $slug)->exists() => 'viewer-ra',
            Environment::query()->published()->where('slug', $slug)->exists() => 'labo-formation',
            default => null,
        };

        abort_if($module === null, 404, 'Objet ou environnement inconnu, ou non publié.');

        $ttl = (int) config('rarv.token_ttl');

        return response()->json([
            'token' => ViewerToken::issue([
                'slug' => $slug,
                'module' => $module,
                'userRef' => (string) $request->query('userRef', 'apprenant-demo'),
                'lmsContext' => 'developpement-local',
            ], $ttl),
            'module' => $module,
            'expiresIn' => $ttl * 60,
        ]);
    })->middleware('throttle:tokens');
}

/*
| Catalogue (2.3) ---------------------------------------------------------
| Lecture seule et publique : la fiche ne contient aucune donnée personnelle.
*/
Route::get('/objects/{slug}', [LearningObjectController::class, 'show'])
    ->middleware('throttle:api');

/*
| Assets 3D (2.9) ---------------------------------------------------------
| URL signée stable : types MIME corrects et cache d'un an.
*/
Route::get('/assets/{slug}/{fichier}', [AssetController::class, 'show'])
    ->name('assets.show')
    ->middleware('signed');

/*
| Sessions de consultation (2.4 → 2.6) ------------------------------------
| Protégées par jeton viewer signé.
*/
Route::middleware('viewer.token')->group(function () {
    Route::post('/sessions', [ViewSessionController::class, 'store'])
        ->middleware('throttle:api');

    // 6.5 — sondage par le desktop pendant que le mobile est en RA
    Route::get('/sessions/{session}', [ViewSessionController::class, 'show'])
        ->middleware('throttle:events');

    Route::patch('/sessions/{session}', [ViewSessionController::class, 'update'])
        ->middleware('throttle:api');

    Route::post('/sessions/{session}/events', [SessionEventController::class, 'store'])
        ->middleware('throttle:events');

    // 6.1 — création du jeton de bascule desktop → mobile
    Route::post('/handoff', [HandoffController::class, 'store'])
        ->middleware('throttle:api');
});

/*
| Bascule desktop → mobile (6.3) -------------------------------------------
| Consommation PUBLIQUE : le téléphone qui vient de scanner ne possède encore
| aucun jeton viewer — c'est ce que cette route lui délivre. D'où l'usage
| unique et l'expiration courte.
*/
Route::post('/handoff/{token}/consume', [HandoffController::class, 'consume'])
    ->middleware('throttle:tokens');

/*
| Éditeur visuel d'annotations (Lot 8) -------------------------------------
| Jeton de portée `edit`, émis par le back-office authentifié. Distinct du
| jeton de consultation : un apprenant ne peut pas écrire dans le contenu.
*/
Route::middleware('editor.token')->prefix('admin/objects/{slug}')->group(function () {
    Route::get('/', [AnnotationEditorController::class, 'objet']);
    Route::get('/annotations', [AnnotationEditorController::class, 'index']);
    Route::post('/annotations', [AnnotationEditorController::class, 'store']);
    Route::put('/annotations/order', [AnnotationEditorController::class, 'reordonner']);
    Route::put('/annotations/{annotation}', [AnnotationEditorController::class, 'update']);
    Route::delete('/annotations/{annotation}', [AnnotationEditorController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Module « labo-formation » — Projet 02
|--------------------------------------------------------------------------
|
| Socle mutualisé (ADR-001) : sessions, journal d'événements, jeton signé et
| chaîne xAPI sont ceux du module « viewer-ra » ci-dessus. Ne s'ajoutent ici
| que l'environnement 3D, les quiz notés, les tentatives et la progression.
|
*/

/*
| Mode démonstration (11.5) ------------------------------------------------
| « Accès sans compte pour qu'un recruteur teste en un clic. »
|
| Cette route délivre un jeton viewer à qui le demande, avec un identifiant
| d'apprenant tiré au sort. Elle n'existe que si `RARV_DEMO_PUBLIC` est actif —
| en production réelle, le jeton vient du SERVEUR du LMS.
*/
Route::get('/guest-token', function (Request $request) {
    abort_unless(config('rarv.demo_public'), 404);

    $slug = (string) $request->query('slug', 'atelier-maintenance-01');

    $module = match (true) {
        Environment::query()->published()->where('slug', $slug)->exists() => 'labo-formation',
        LearningObject::query()->published()->where('slug', $slug)->exists() => 'viewer-ra',
        default => null,
    };

    abort_if($module === null, 404, 'Environnement inconnu ou non publié.');

    // Identifiant tiré au sort et conservé côté client : deux visiteurs
    // simultanés ne se marchent pas dessus, et personne ne reprend par
    // accident la progression d'un autre.
    $userRef = (string) $request->query('userRef', 'invite-'.Str::lower(Str::random(6)));

    $ttl = (int) config('rarv.token_ttl');

    return response()->json([
        'token' => ViewerToken::issue([
            'slug' => $slug,
            'module' => $module,
            'userRef' => $userRef,
            'lmsContext' => 'demonstration-publique',
        ], $ttl),
        'userRef' => $userRef,
        'module' => $module,
        'expiresIn' => $ttl * 60,
    ]);
})->middleware('throttle:guest');

/*
| Environnement (2.3) ------------------------------------------------------
| Lecture seule et publique : décrit la salle et ses postes, sans donnée
| personnelle ni bonne réponse.
*/
Route::get('/environments/{slug}', [EnvironmentController::class, 'show'])
    ->middleware('throttle:api');

/*
| Assets de l'environnement ------------------------------------------------
| Scène, mesh de collision, lightmaps, vidéos, sous-titres, documents.
| Liste blanche + URL signée + cache d'un an.
*/
Route::get('/environments/{slug}/assets/{fichier}', [EnvironmentAssetController::class, 'show'])
    ->name('environments.assets.show')
    ->middleware('signed');

/*
| Contenu pédagogique et progression (2.4 → 2.8) --------------------------
| Protégés par jeton viewer signé : l'apprenant et l'environnement autorisé
| proviennent du jeton, jamais du corps de la requête.
*/
Route::middleware('viewer.token')->group(function () {
    // 2.4 — quiz SANS is_correct ni explication (décision D5)
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])
        ->middleware('throttle:api');

    // 2.5 — ouverture d'une tentative (vérifie max_attempts)
    Route::post('/attempts', [AttemptController::class, 'store'])
        ->middleware('throttle:api');

    Route::get('/attempts/{attempt}', [AttemptController::class, 'show'])
        ->middleware('throttle:api');

    // 2.6 — CORRECTION SERVEUR, verrouillage définitif
    Route::post('/attempts/{attempt}/submit', [AttemptController::class, 'submit'])
        ->middleware('throttle:api');

    // 2.8 — sauvegarde et reprise de progression
    Route::get('/progress', [ProgressController::class, 'show'])
        ->middleware('throttle:api');

    Route::put('/progress', [ProgressController::class, 'update'])
        ->middleware('throttle:events');

    // 7.6 — attestation PDF. La complétion est REVÉRIFIÉE à la délivrance.
    Route::get('/attestation', [AttestationController::class, 'show'])
        ->middleware('throttle:api');

    // 7.5 — recommencer : efface la progression, PAS les tentatives de quiz.
    Route::delete('/progress', [AttestationController::class, 'reinitialiser'])
        ->middleware('throttle:api');
});

/*
| Tableau de bord formateur (2.10) -----------------------------------------
| Agrégats de cohorte : scores et identifiants d'apprenants. Protégés par
| secret partagé — non configuré, l'accès est FERMÉ (503), pas ouvert.
*/
Route::middleware(['dashboard', 'throttle:api'])->prefix('dashboard')->group(function () {
    Route::get('/environments/{slug}', [LabDashboardController::class, 'environment']);
    Route::get('/environments/{slug}/export.csv', [LabDashboardController::class, 'exportCsv']);

    // 9.6 — les questions les plus ratées, avec leur poste d'origine
    Route::get('/quizzes/{quiz}', [LabDashboardController::class, 'quiz']);

    // 9.5 — journal du LRS local, pour montrer les déclarations émises
    Route::get('/xapi', [XapiController::class, 'index']);
});
