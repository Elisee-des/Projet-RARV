<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'viewer.token' => \App\Http\Middleware\EnsureViewerToken::class,
            'dashboard' => \App\Http\Middleware\EnsureDashboardAccess::class,
            'editor.token' => \App\Http\Middleware\EnsureEditorToken::class,
        ]);

        // Étape 10.2 — en-têtes de sécurité sur toutes les réponses.
        $middleware->append(\App\Http\Middleware\EnTetesSecurite::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
