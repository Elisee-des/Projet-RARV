@extends('layout')

@section('titre', 'Plateforme de formation immersive')

@push('tete')
<style>
    .hero { margin-bottom: 30px; }
    .hero h1 { font-size: 30px; line-height: 1.25; }
    .hero p { max-width: 62ch; margin: 10px 0 0; font-size: 15.5px; }

    /* Deux modules côte à côte, empilés dès qu'il n'y a plus la place */
    .modules {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 18px;
    }

    .module {
        display: flex; flex-direction: column; gap: 12px;
        padding: 22px 22px 24px;
        border: 1px solid var(--bord); border-radius: 14px;
        background: var(--carte);
    }
    .module__rang {
        align-self: flex-start; padding: 3px 10px; border-radius: 999px;
        background: rgba(37,99,235,.12); color: var(--accent);
        font-size: 11.5px; font-weight: 600; letter-spacing: .04em;
    }
    .module h2 { margin: 0; font-size: 19px; line-height: 1.3; }
    .module__resume { margin: 0; font-size: 14.5px; line-height: 1.6; }
    .module__points { margin: 0; padding-left: 18px; font-size: 13.5px; color: var(--doux); }
    .module__points li { margin-bottom: 4px; }
    .module__pied { margin-top: auto; padding-top: 6px; display: grid; gap: 8px; }

    .module__bouton {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 12px 18px; border-radius: 10px;
        background: var(--accent); color: #fff; text-decoration: none;
        font-size: 14.5px; font-weight: 500;
    }
    .module__bouton:hover { filter: brightness(1.08); }
    .module__url {
        font-family: ui-monospace, Consolas, monospace; font-size: 11.5px;
        color: var(--doux); overflow-wrap: anywhere;
    }

    .scan {
        display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
        margin-top: 26px;
    }
    .scan img {
        width: 150px; height: 150px; flex: none;
        background: #fff; padding: 8px; border-radius: 10px;
    }
    .scan div { flex: 1 1 260px; }

    .socle { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }

    @media (max-width: 720px) {
        .hero h1 { font-size: 23px; }
        .hero p { font-size: 14.5px; }
        .module { padding: 17px 16px 19px; }
        .module h2 { font-size: 17px; }
        .scan { gap: 14px; }
        .scan img { width: 124px; height: 124px; }
    }
</style>
@endpush

@section('contenu')
    <div class="hero">
        <h1>Plateforme de formation immersive</h1>
        <p>
            Deux modules web pour la formation professionnelle, sur un socle commun :
            sessions, traçabilité <strong>xAPI</strong> et tableau de bord formateur mutualisés.
            Aucune installation, aucun compte — tout est ouvert.
        </p>
    </div>

    <div class="modules">
        {{-- ---------------- Module 1 ---------------- --}}
        <article class="module">
            <span class="module__rang">Projet 01</span>
            <h2>Visualiseur d'objets pédagogiques en réalité augmentée</h2>

            <p class="module__resume">
                Depuis sa leçon, l'apprenant explore une pompe centrifuge en 3D, puis la pose
                <strong>à taille réelle dans son atelier</strong> via la caméra de son téléphone.
                Chaque consultation remonte au Learning Record Store.
            </p>

            <ul class="module__points">
                <li>Réalité augmentée WebXR sur Android, AR Quick Look sur iOS</li>
                <li>Bascule ordinateur → téléphone par QR code, même session</li>
                <li>Version texte accessible, avec la même traçabilité</li>
            </ul>

            <div class="module__pied">
                <a class="module__bouton" href="{{ route('lecon.show', 'pompe-centrifuge-01') }}">
                    <x-icone nom="lecon" :taille="17"/> Ouvrir la leçon
                </a>
                <span class="module__url">{{ url('/lecon/pompe-centrifuge-01') }}</span>
            </div>
        </article>

        {{-- ---------------- Module 2 ---------------- --}}
        <article class="module">
            <span class="module__rang">Projet 02</span>
            <h2>Laboratoire de formation interactif 3D</h2>

            <p class="module__resume">
                Un atelier virtuel parcouru <strong>à la première personne</strong> dans le
                navigateur. L'apprenant s'approche des postes de travail et y déclenche quiz notés,
                vidéos et fiches techniques.
            </p>

            <ul class="module__points">
                <li>Quiz corrigés <strong>côté serveur</strong>, jamais dans le navigateur</li>
                <li>Progression sauvegardée, reprise là où on s'était arrêté</li>
                <li>Attestation de réussite en PDF</li>
            </ul>

            {{--
                Barre finale OBLIGATOIRE.

                Sans elle, /labo déclenche une redirection avant d'atteindre
                l'application. Un site ne doit pas dépendre d'une redirection
                pour ses propres liens : c'est une requête de plus, et surtout
                un 301 que les navigateurs mettent en cache — le nôtre l'avait
                mémorisé vers une mauvaise cible et y retournait sans plus
                jamais interroger le serveur.
            --}}
            @php $urlLabo = \Illuminate\Support\Str::finish(config('rarv.lab_url'), '/'); @endphp

            <div class="module__pied">
                <a class="module__bouton" href="{{ $urlLabo }}">
                    <x-icone nom="cube" :taille="17"/> Entrer dans l'atelier
                </a>
                <span class="module__url">{{ $urlLabo }}</span>
            </div>
        </article>
    </div>

    @if (file_exists(public_path('img/qr-demo.svg')))
        <div class="carte scan">
            <img src="/img/qr-demo.svg" alt="QR code vers la leçon de démonstration">
            <div>
                <h2 style="margin-top:0">Essayez depuis votre téléphone</h2>
                <p class="doux" style="margin:0">
                    Scannez ce code pour ouvrir la leçon du Projet 01. Sur Android, le bouton
                    <em>Voir en réalité augmentée</em> pose la pompe dans votre pièce.
                    Comptez trente secondes.
                </p>
            </div>
        </div>
    @endif

    <h2>Un socle, deux modules</h2>

    <div class="socle">
        <div class="carte">
            <h3 style="margin-top:0">Traçabilité de formation</h3>
            <p class="doux" style="margin:0">
                Chaque consultation produit une séquence xAPI transmise à un Learning Record Store.
                Le formateur voit qui a consulté quoi — et quelle annotation personne n'ouvre.
            </p>
        </div>

        <div class="carte">
            <h3 style="margin-top:0">Contenu administrable</h3>
            <p class="doux" style="margin:0">
                Un formateur téléverse un modèle, pose ses annotations à la souris et publie,
                sans développeur. Le système refuse tout modèle hors budget mobile.
            </p>
        </div>

        <div class="carte">
            <h3 style="margin-top:0">Accessible sans 3D</h3>
            <p class="doux" style="margin:0">
                Une version texte complète, utilisable au clavier et au lecteur d'écran, qui
                produit exactement la même traçabilité que le parcours 3D.
            </p>
        </div>
    </div>

    <h2>Sous le capot</h2>

    <div class="carte">
        <div class="tableau">
            <table>
                <tbody>
                    <tr><td>Front 3D</td><td class="doux">React · TypeScript · Three.js / React Three Fiber · WebXR</td></tr>
                    <tr><td>Backend</td><td class="doux">Laravel · API REST · jetons signés HMAC · MySQL</td></tr>
                    <tr><td>Traçabilité</td><td class="doux">xAPI 1.0.3 · client LRS interchangeable</td></tr>
                    <tr><td>Intégration LMS</td><td class="doux">Web Component · iframe · postMessage</td></tr>
                    <tr><td>Tests</td><td class="doux">{{ $tests['php'] }} tests PHPUnit · {{ $tests['front'] }} tests Vitest</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <p class="doux" style="margin-top:18px">
        Les modèles 3D en ligne sont des <strong>modèles de substitution générés par script</strong>,
        en attendant les modèles définitifs. Toutes les fonctionnalités sont pleinement
        opérationnelles avec eux.
    </p>
@endsection
