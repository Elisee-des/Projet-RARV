@extends('layout')

@section('titre', 'Démonstration')

@section('contenu')
    <h1>Visualiseur d'objets pédagogiques en réalité augmentée</h1>
    <p class="doux">
        Module de formation embarquable dans un LMS · consultation traçable en xAPI
    </p>

    <div class="carte" style="margin-top:24px;display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center">
        <div style="text-align:center">
            @if (file_exists(public_path('img/qr-demo.svg')))
                <img src="/img/qr-demo.svg" alt="QR code vers la démonstration" width="190" height="190"
                     style="background:#fff;padding:8px;border-radius:10px">
            @endif
            <p class="doux" style="margin-top:8px;font-size:12px">Scannez avec votre téléphone</p>
        </div>

        <div>
            <h2 style="margin-top:0">Essayez en 30 secondes</h2>
            <ol style="padding-left:20px;font-size:14.5px;line-height:1.8">
                <li>Scannez le code ci-contre, ou ouvrez <a href="{{ $urlDemo }}">la leçon</a></li>
                <li>Faites tourner la pompe, ouvrez ses <strong>5 annotations</strong></li>
                <li>Sur <strong>Android</strong> : « Voir en réalité augmentée », puis posez-la dans votre pièce</li>
                <li>Sur <strong>ordinateur</strong> : « Continuer sur mon téléphone », un QR reprend la session</li>
            </ol>
            <p class="doux">Aucune installation, aucun compte.</p>
        </div>
    </div>

    <h2>Ce que ça démontre</h2>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
        <div class="carte">
            <h3 style="margin-top:0">Réalité augmentée sans application</h3>
            <p class="doux">
                WebXR sur Android, AR Quick Look sur iOS. Détection du sol, placement à l'échelle
                réelle, annotations 3D ancrées à l'objet.
            </p>
        </div>

        <div class="carte">
            <h3 style="margin-top:0">Traçabilité de formation</h3>
            <p class="doux">
                Chaque consultation produit une séquence xAPI complète, transmise à un Learning
                Record Store. Le formateur voit qui a consulté quoi, et quelle annotation est ignorée.
            </p>
        </div>

        <div class="carte">
            <h3 style="margin-top:0">Contenu administrable</h3>
            <p class="doux">
                Un formateur téléverse un modèle, pose ses annotations à la souris et publie —
                sans développeur. Le modèle est inspecté et refusé s'il dépasse le budget mobile.
            </p>
        </div>

        <div class="carte">
            <h3 style="margin-top:0">Accessible sans 3D</h3>
            <p class="doux">
                Une version texte complète, utilisable au clavier et au lecteur d'écran, qui
                produit exactement la même traçabilité que le parcours 3D.
            </p>
        </div>
    </div>

    <h2>Sous le capot</h2>

    <div class="carte">
        <table>
            <tbody>
                <tr><td>Front 3D</td><td class="doux">React · TypeScript · Three.js · React Three Fiber · WebXR</td></tr>
                <tr><td>Backend</td><td class="doux">Laravel · API REST · jetons signés HMAC · SQLite/MySQL</td></tr>
                <tr><td>Traçabilité</td><td class="doux">xAPI 1.0.3 · client LRS interchangeable</td></tr>
                <tr><td>Intégration LMS</td><td class="doux">Web Component · iframe · postMessage</td></tr>
                <tr><td>Tests</td><td class="doux">{{ $tests['php'] }} tests PHPUnit · {{ $tests['front'] }} tests Vitest · specs Playwright</td></tr>
            </tbody>
        </table>
    </div>

    <p class="doux" style="margin-top:20px">
        Le modèle 3D actuellement en ligne est un <strong>modèle de substitution généré par script</strong>
        (13 pièces nommées, 1 056 triangles), en attendant le modèle définitif. Toutes les
        fonctionnalités sont pleinement opérationnelles avec lui.
    </p>
@endsection
