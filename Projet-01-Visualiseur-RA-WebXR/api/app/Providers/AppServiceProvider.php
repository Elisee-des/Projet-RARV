<?php

namespace App\Providers;

use App\Support\Xapi\HttpLrs;
use App\Support\Xapi\LocalLrs;
use App\Support\Xapi\LrsClient;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Étape 7.5 — le pilote LRS se choisit par configuration : la
        // démonstration locale et un vrai Learning Record Store reçoivent
        // exactement les mêmes déclarations.
        $this->app->bind(LrsClient::class, fn () => match ((string) config('rarv.lrs.driver')) {
            'http' => new HttpLrs,
            default => new LocalLrs,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->forcerHttpsEnProduction();
        $this->configurerLimitesDebit();
    }

    /**
     * Sans cela, la génération d'URL retombe sur le schéma vu par PHP.
     *
     * Sur un hébergement mutualisé derrière un terminateur TLS, PHP voit du
     * HTTP en clair : les URL SIGNÉES des assets 3D seraient donc calculées
     * en `http://`, puis appelées en `https://` par le navigateur. La
     * signature ne correspondrait plus et tous les modèles renverraient 403 —
     * un symptôme classique, et déroutant, du premier déploiement.
     *
     * WebXR exigeant de toute façon HTTPS, forcer le schéma ne retire rien.
     */
    private function forcerHttpsEnProduction(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }

    /**
     * Étape 2.8b — Limitation de débit.
     *
     * Le journal d'événements est l'endpoint le plus exposé : il est appelé
     * en boucle pendant une session RA. On le limite par SESSION plutôt que
     * par IP, car plusieurs apprenants derrière le même NAT d'établissement
     * partagent une adresse publique — limiter par IP les bloquerait ensemble.
     */
    private function configurerLimitesDebit(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        RateLimiter::for('events', function (Request $request) {
            $session = $request->route('session');
            $cle = is_object($session) ? $session->getKey() : $request->ip();

            return Limit::perMinute(120)->by((string) $cle);
        });

        // Émission de jetons : réservée au serveur LMS, donc peu d'appels légitimes.
        RateLimiter::for('tokens', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        /*
         * Jetons d'invité (étape 11.5) — limite distincte, plus large.
         *
         * ⚠️ 30/min était trop serré et l'a montré en test de bout en bout :
         * chaque chargement de page en réclame un, et une salle de démonstration
         * derrière un même NAT — ou simplement quelqu'un qui rafraîchit —
         * épuisait le quota et se retrouvait bloqué. La limite reste bornée :
         * ces jetons ne donnent accès qu'à du contenu public, et la route
         * n'existe pas quand le mode démonstration est désactivé.
         */
        RateLimiter::for('guest', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));
    }
}
