<?php

use App\Http\Controllers\Admin\LearningObjectController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LeconController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pages publiques — Lot 7
|--------------------------------------------------------------------------
*/

// 10.7 — vitrine publique : un QR code, quatre points, aucune installation
Route::get('/', function () {
    $url = file_exists(public_path('img/qr-demo.txt'))
        ? trim((string) file_get_contents(public_path('img/qr-demo.txt')))
        : url('/lecon/pompe-centrifuge-01');

    return view('demo', [
        'urlDemo' => $url,
        'tests' => ['php' => 169, 'front' => 23],
    ]);
})->name('demo');

// 7.3 — fausse leçon LMS embarquant le composant <rarv-viewer>
Route::get('/lecon/{slug}', [LeconController::class, 'show'])->name('lecon.show');

/*
|--------------------------------------------------------------------------
| Authentification du back-office — Lot 8, étape 8.1
|--------------------------------------------------------------------------
*/

Route::get('/admin/login', [LoginController::class, 'create'])->name('login');
Route::post('/admin/login', [LoginController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('login.store');
Route::post('/admin/logout', [LoginController::class, 'destroy'])->name('logout');

/*
|--------------------------------------------------------------------------
| Back-office — Lot 8
|--------------------------------------------------------------------------
|
| Le tableau de bord y est rattaché : il expose la progression nominative
| des apprenants, il n'a rien à faire en accès libre.
|
*/

/*
 * Accès LIBRE par défaut (`RARV_AUTH_REQUIRED=false`).
 *
 * Choix de portfolio assumé : un recruteur doit pouvoir parcourir le
 * back-office et le tableau de bord en un clic, sans compte ni identifiants à
 * réclamer. Le contenu de démonstration reste protégé contre la suppression
 * (voir `rarv.contenus_proteges`), sans quoi le lien du CV finirait par
 * afficher une page vide.
 *
 * Passer `RARV_AUTH_REQUIRED=true` rétablit la connexion obligatoire — à faire
 * le jour où la plateforme accueille de vrais apprenants, le tableau de bord
 * exposant alors une progression nominative.
 */
Route::middleware(config('rarv.auth_required') ? ['auth'] : [])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::prefix('admin/objets')->name('admin.objets.')->group(function () {
        Route::get('/', [LearningObjectController::class, 'index'])->name('index');
        Route::get('/nouveau', [LearningObjectController::class, 'create'])->name('create');
        Route::post('/', [LearningObjectController::class, 'store'])->name('store');
        Route::get('/{objet}/editer', [LearningObjectController::class, 'edit'])->name('edit');
        Route::put('/{objet}', [LearningObjectController::class, 'update'])->name('update');
        Route::delete('/{objet}', [LearningObjectController::class, 'destroy'])->name('destroy');

        // 8.6 — bascule brouillon ↔ publié
        Route::post('/{objet}/publication', [LearningObjectController::class, 'publier'])->name('publier');

        // 8.4 — ouverture de l'éditeur visuel, avec jeton de portée « edit »
        Route::get('/{objet}/annotations', [LearningObjectController::class, 'jetonEdition'])->name('annotations');
    });
});
