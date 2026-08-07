<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('titre') — RARV</title>
    <style>
        :root {
            --bg: #f7f8fa; --carte: #fff; --bord: #e3e6ea;
            --texte: #333a42; --titre: #12171d; --doux: #6b7783;
            --accent: #2563eb; --ok: #16a34a; --ko: #dc2626;
            font: 16px/1.6 system-ui, 'Segoe UI', Roboto, sans-serif;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #10141a; --carte: #161b22; --bord: #262d36;
                --texte: #c3cbd4; --titre: #fff; --doux: #8b98a5;
                --accent: #60a5fa; --ok: #4ade80; --ko: #f87171;
            }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--texte); }
        /* --- Navigation, présente sur toutes les pages --- */
        .saut-contenu {
            position: absolute; left: -9999px;
            padding: 10px 16px; background: var(--accent); color: #fff;
            border-radius: 0 0 8px 0; text-decoration: none; z-index: 100;
        }
        .saut-contenu:focus { left: 0; top: 0; }

        .bandeau {
            position: sticky; top: 0; z-index: 50;
            display: flex; align-items: center; justify-content: space-between;
            gap: 18px; flex-wrap: wrap; padding: 10px 20px;
            background: var(--carte); border-bottom: 1px solid var(--bord);
        }
        .bandeau__marque {
            display: flex; align-items: center; gap: 8px;
            color: var(--titre); font-weight: 600; font-size: 15px; text-decoration: none;
        }
        .bandeau__marque span[aria-hidden] { color: var(--accent); font-size: 18px; }
        .bandeau__nav {
            display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 13.5px;
        }
        .bandeau__nav a, .bandeau__lien-bouton {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 7px 12px; border-radius: 8px;
            color: var(--texte); text-decoration: none; white-space: nowrap;
            border: 1px solid transparent; background: none; font: inherit; cursor: pointer;
        }

        /* Icônes : contour, alignées sur le texte, héritant de sa couleur */
        .icone { flex: none; vertical-align: -0.18em; }
        .icone--accent { color: var(--accent); }
        .puce .icone { vertical-align: -0.14em; margin-right: 3px; }
        .bandeau__nav a:hover, .bandeau__lien-bouton:hover {
            background: rgba(127,127,127,.12); color: var(--titre);
        }
        .bandeau__nav a:focus-visible, .bandeau__lien-bouton:focus-visible {
            outline: 2px solid var(--accent); outline-offset: 2px;
        }
        .bandeau__nav a.actif {
            background: var(--accent-doux, rgba(37,99,235,.12));
            border-color: rgba(127,127,127,.25); color: var(--titre); font-weight: 500;
        }
        .bandeau__nav form { display: inline; margin: 0; }
        .bandeau__lien-bouton { color: var(--doux); }

        /*
         * Navigation défilante sous 860 px.
         *
         * À cinq entrées, le retour à la ligne empile trois rangées et pousse
         * le contenu hors de l'écran. Une bande qui défile horizontalement
         * garde la navigation sur une seule ligne, quel que soit le nombre
         * d'entrées ajoutées ensuite.
         */
        @media (max-width: 860px) {
            .bandeau {
                flex-direction: column; align-items: stretch;
                gap: 8px; padding: 10px 12px;
            }
            .bandeau__marque-suite { display: none; }
            .bandeau__nav {
                flex-wrap: nowrap; overflow-x: auto; gap: 2px;
                font-size: 12.5px;
                /* Masque la barre de défilement sans empêcher le geste */
                scrollbar-width: none; -ms-overflow-style: none;
                /* Marges négatives : les entrées touchent les bords à fond */
                margin: 0 -12px; padding: 0 12px 2px;
            }
            .bandeau__nav::-webkit-scrollbar { display: none; }
            .bandeau__nav a, .bandeau__lien-bouton { padding: 7px 10px; }
        }

        /* --- Pied de page --- */
        .pied {
            margin-top: 40px; padding: 24px 20px 34px;
            border-top: 1px solid var(--bord); background: var(--carte);
        }
        .pied nav {
            display: flex; flex-wrap: wrap; gap: 6px 20px;
            max-width: 1080px; margin: 0 auto; font-size: 13.5px;
        }
        .pied a {
            display: inline-flex; align-items: center; gap: 6px;
            color: var(--accent); text-decoration: none;
        }
        .pied a:hover { text-decoration: underline; }
        .pied p {
            max-width: 1080px; margin: 14px auto 0;
            font-size: 12px; color: var(--doux);
        }

        main { max-width: 1080px; margin: 0 auto; padding: 26px 20px 20px; }
        h1 { margin: 0 0 6px; font-size: 26px; color: var(--titre); }
        h2 { margin: 34px 0 12px; font-size: 18px; color: var(--titre); }
        h3 { margin: 22px 0 8px; font-size: 15px; color: var(--titre); }
        .carte {
            padding: 18px 20px; border: 1px solid var(--bord);
            border-radius: 12px; background: var(--carte);
        }
        .doux { color: var(--doux); font-size: 14px; }

        /*
         * Tableaux : défilement horizontal DANS leur conteneur.
         *
         * Sans cela, un tableau de six colonnes élargit la page entière sur
         * téléphone : tout le site se met à défiler latéralement, y compris la
         * navigation et les titres. Le débordement doit rester local.
         *
         * `-webkit-overflow-scrolling` conserve l'inertie sur iOS.
         */
        .tableau {
            overflow-x: auto; -webkit-overflow-scrolling: touch;
            margin: 0 -20px; padding: 0 20px;
        }
        .tableau table { min-width: 520px; }

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--bord); }
        th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--doux); }
        td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
        code {
            padding: 2px 6px; border-radius: 4px; font-size: 13px;
            background: rgba(127,127,127,.14); font-family: ui-monospace, Consolas, monospace;
        }
        .puce {
            display: inline-block; padding: 2px 9px; border-radius: 999px;
            font-size: 12px; font-weight: 500;
        }
        .puce--ok { background: rgba(22,163,74,.14); color: var(--ok); }
        .puce--ko { background: rgba(220,38,38,.14); color: var(--ko); }
        .puce--neutre { background: rgba(127,127,127,.14); color: var(--doux); }
        .puce { display: inline-flex; align-items: center; gap: 5px; }

        /* Messages de retour du back-office */
        .message {
            display: flex; align-items: flex-start; gap: 10px;
            margin-top: 18px; padding: 11px 14px; border-radius: 9px; font-size: 14px;
        }
        .message .icone { margin-top: 2px; }
        .message--ok { background: rgba(22,163,74,.12); color: var(--ok); }
        .message--ko { background: rgba(220,38,38,.12); color: var(--ko); }

        /* Conseil issu des données du tableau de bord */
        .conseil {
            display: flex; align-items: flex-start; gap: 9px; margin-top: 14px;
        }
        .conseil .icone { margin-top: 2px; color: var(--accent); }

        /* Titre de page + action principale, côte à côte puis empilés */
        .entete-page {
            display: flex; align-items: center; justify-content: space-between;
            gap: 16px; flex-wrap: wrap;
        }

        /* --- Adaptation aux petits écrans --- */
        @media (max-width: 720px) {
            /* L'action principale passe en pleine largeur : sur un téléphone,
               un bouton de 140 px collé à droite se rate une fois sur deux. */
            .entete-page { flex-direction: column; align-items: stretch; gap: 12px; }
            .entete-page > a { justify-content: center; }

            main { padding: 18px 14px 16px; }
            h1 { font-size: 21px; }
            h2 { margin: 26px 0 10px; font-size: 16.5px; }
            h3 { font-size: 14px; }
            .carte { padding: 14px 15px; border-radius: 10px; }

            /* Le conteneur défilant reprend la marge réduite de main */
            .tableau { margin: 0 -15px; padding: 0 15px; }

            th, td { padding: 8px 9px; }
            .pied { margin-top: 28px; padding: 18px 14px 26px; }
            .pied nav { gap: 4px 14px; font-size: 12.5px; }
        }

        /*
         * Sur un écran étroit, une hauteur fixe de 620 px pour le viewer
         * dépasse la fenêtre : l'apprenant ne voit ni le titre au-dessus ni
         * le suivi en dessous. On la ramène à une fraction de la hauteur
         * réelle — `dvh` et non `vh`, pour tenir compte de la barre d'adresse
         * mobile qui apparaît et disparaît.
         */
        @media (max-width: 720px) {
            rarv-viewer, rarv-lab { --rarv-hauteur: 62dvh; }
        }

        @media (max-width: 400px) {
            main { padding: 14px 11px 14px; }
            .tableau { margin: 0 -12px; padding: 0 12px; }
            h1 { font-size: 19px; }
        }
    </style>
    @stack('tete')
</head>
<body>
    <a href="#contenu-principal" class="saut-contenu">Aller au contenu</a>

    <header class="bandeau">
        <a href="{{ route('demo') }}" class="bandeau__marque">
            <x-icone nom="marque" :taille="21" class="icone--accent"/>
            <span>RARV<span class="bandeau__marque-suite"> — formation immersive</span></span>
        </a>

        <nav class="bandeau__nav" aria-label="Navigation principale">
            <a href="{{ route('demo') }}" @class(['actif' => request()->routeIs('demo')])>
                <x-icone nom="accueil"/> Accueil
            </a>

            <a href="{{ route('lecon.show', 'pompe-centrifuge-01') }}"
               @class(['actif' => request()->routeIs('lecon.*')])>
                <x-icone nom="lecon"/> Leçon
            </a>

            <a href="{{ rtrim(config('rarv.viewer_url'), '/') }}" target="_blank" rel="noopener">
                <x-icone nom="cube"/> Viewer 3D
                <x-icone nom="externe" :taille="13"/>
            </a>

            {{-- Accès libre : le back-office et le tableau de bord sont
                 toujours atteignables, c'est tout l'intérêt pour un visiteur
                 qui découvre le projet. --}}
            <a href="{{ route('admin.objets.index') }}"
               @class(['actif' => request()->routeIs('admin.objets.*')])>
                <x-icone nom="reglages"/> Back-office
            </a>

            <a href="{{ route('dashboard') }}" @class(['actif' => request()->routeIs('dashboard')])>
                <x-icone nom="graphique"/> Tableau de bord
            </a>

            @if (config('rarv.auth_required'))
                @auth
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="bandeau__lien-bouton">
                            <x-icone nom="sortie"/> Déconnexion
                        </button>
                    </form>
                @else
                    <a href="{{ route('login') }}" @class(['actif' => request()->routeIs('login')])>
                        <x-icone nom="cle"/> Espace formateur
                    </a>
                @endauth
            @endif
        </nav>
    </header>

    <main id="contenu-principal">
        @yield('contenu')
    </main>

    <footer class="pied">
        <nav aria-label="Navigation de bas de page">
            <a href="{{ route('demo') }}"><x-icone nom="accueil" :taille="15"/> Accueil</a>
            <a href="{{ route('lecon.show', 'pompe-centrifuge-01') }}"><x-icone nom="lecon" :taille="15"/> Leçon de démonstration</a>
            <a href="{{ rtrim(config('rarv.viewer_url'), '/') }}" target="_blank" rel="noopener">
                <x-icone nom="cube" :taille="15"/> Viewer 3D <x-icone nom="externe" :taille="12"/>
            </a>
            <a href="{{ route('admin.objets.index') }}"><x-icone nom="reglages" :taille="15"/> Back-office</a>
            <a href="{{ route('dashboard') }}"><x-icone nom="graphique" :taille="15"/> Tableau de bord</a>
            @if (config('rarv.auth_required') && auth()->guest())
                <a href="{{ route('login') }}"><x-icone nom="cle" :taille="15"/> Espace formateur</a>
            @endif
        </nav>
        <p>RARV — visualiseur d'objets pédagogiques en réalité augmentée</p>
    </footer>

    @stack('scripts')
</body>
</html>
