@extends('layout')

@section('titre', 'Connexion')

@section('contenu')
    <div style="max-width:400px;margin:6vh auto">
        <h1>Back-office</h1>
        <p class="doux">Administration des objets pédagogiques.</p>

        <form method="POST" action="{{ route('login.store') }}" class="carte" style="margin-top:20px">
            @csrf

            <label style="display:block;margin-bottom:14px">
                <span class="doux" style="display:block;margin-bottom:5px">Adresse e-mail</span>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus
                       autocomplete="username" style="width:100%;padding:9px 11px;border:1px solid var(--bord);border-radius:8px;background:transparent;color:inherit;font:inherit">
            </label>

            <label style="display:block;margin-bottom:14px">
                <span class="doux" style="display:block;margin-bottom:5px">Mot de passe</span>
                <input type="password" name="password" required autocomplete="current-password"
                       style="width:100%;padding:9px 11px;border:1px solid var(--bord);border-radius:8px;background:transparent;color:inherit;font:inherit">
            </label>

            <label style="display:flex;gap:8px;align-items:center;margin-bottom:16px" class="doux">
                <input type="checkbox" name="remember" value="1"> Rester connecté
            </label>

            @if ($errors->any())
                <p class="puce puce--ko" style="display:block;margin-bottom:14px;padding:8px 12px">
                    {{ $errors->first() }}
                </p>
            @endif

            <button type="submit"
                    style="width:100%;padding:11px;border:none;border-radius:8px;background:var(--accent);color:#fff;font:inherit;font-weight:500;cursor:pointer">
                Se connecter
            </button>
        </form>

        @if (app()->environment('local'))
            <p class="doux" style="margin-top:16px;text-align:center">
                Compte de démonstration : <code>formateur@example.com</code> / <code>password</code>
            </p>
        @endif
    </div>
@endsection
