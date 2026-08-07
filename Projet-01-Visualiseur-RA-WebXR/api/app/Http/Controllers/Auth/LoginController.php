<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Étape 8.1 — Authentification du back-office.
 *
 * Session Laravel native, sans paquet supplémentaire : le besoin se limite à
 * « un formateur se connecte pour administrer des objets ». Breeze aurait
 * apporté un jeu de vues, une gestion de mot de passe oublié et une
 * inscription publique — trois choses dont ce back-office n'a pas l'usage.
 */
class LoginController extends Controller
{
    public function create(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->intended(route('admin.objets.index'));
        }

        return view('auth.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $identifiants = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($identifiants, $request->boolean('remember'))) {
            // Message volontairement générique : préciser « cet e-mail est
            // inconnu » révélerait quels comptes existent.
            throw ValidationException::withMessages([
                'email' => 'Identifiants incorrects.',
            ]);
        }

        // Contre la fixation de session : l'identifiant change à la connexion.
        $request->session()->regenerate();

        return redirect()->intended(route('admin.objets.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
