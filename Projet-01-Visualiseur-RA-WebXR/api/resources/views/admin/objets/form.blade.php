@extends('layout')

@php $creation = ! $objet->exists; @endphp

@section('titre', $creation ? 'Nouvel objet' : $objet->title)

@push('tete')
<style>
    .champ { display:block; margin-bottom:16px }
    .champ > span { display:block; margin-bottom:5px; font-size:12px; text-transform:uppercase;
                    letter-spacing:.06em; color:var(--doux) }
    .champ input, .champ select, .champ textarea {
        width:100%; padding:9px 11px; border:1px solid var(--bord); border-radius:8px;
        background:transparent; color:inherit; font:inherit; font-size:14px;
    }
    .champ textarea { min-height:110px; resize:vertical }
    .grille { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:0 18px }
    .bouton { display:inline-flex; align-items:center; gap:7px;
              padding:10px 18px; border:none; border-radius:8px; background:var(--accent);
              color:#fff; font:inherit; font-size:14px; cursor:pointer }
    .bouton--secondaire { background:transparent; border:1px solid var(--bord); color:var(--texte) }
    .bouton--danger { background:transparent; border:1px solid var(--ko); color:var(--ko) }
    .aide { margin:-10px 0 16px; font-size:12px; color:var(--doux) }
</style>
@endpush

@section('contenu')
    <p class="doux">
        <a href="{{ route('admin.objets.index') }}" style="display:inline-flex;align-items:center;gap:6px">
            <x-icone nom="retour" :taille="15"/> Tous les objets
        </a>
    </p>
    <h1>{{ $creation ? 'Nouvel objet pédagogique' : $objet->title }}</h1>

    @include('admin._messages')

    <form method="POST"
          action="{{ $creation ? route('admin.objets.store') : route('admin.objets.update', $objet) }}"
          enctype="multipart/form-data" class="carte" style="margin-top:22px">
        @csrf
        @unless ($creation) @method('PUT') @endunless

        <h2 style="margin-top:0">Identité</h2>

        <div class="grille">
            <label class="champ">
                <span>Slug (URL)</span>
                <input name="slug" value="{{ old('slug', $objet->slug) }}" required
                       pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="pompe-centrifuge-01">
            </label>

            <label class="champ">
                <span>Catégorie</span>
                <input name="category" value="{{ old('category', $objet->category) }}"
                       placeholder="Maintenance industrielle">
            </label>
        </div>

        <label class="champ">
            <span>Titre</span>
            <input name="title" value="{{ old('title', $objet->title) }}" required>
        </label>

        <label class="champ">
            <span>Description</span>
            <textarea name="description">{{ old('description', $objet->description) }}</textarea>
        </label>

        <h2>Calibrage pour la réalité augmentée</h2>
        <p class="aide">
            1 unité glTF = 1 mètre réel. L'origine du modèle doit être posée au sol.
        </p>

        <div class="grille">
            <label class="champ">
                <span>Échelle</span>
                <input type="number" step="0.001" min="0.001" name="default_scale"
                       value="{{ old('default_scale', $objet->default_scale ?? 1) }}" required>
            </label>

            <label class="champ">
                <span>Axe vertical</span>
                <select name="up_axis" required>
                    @foreach (['Y', 'Z'] as $axe)
                        <option value="{{ $axe }}" @selected(old('up_axis', $objet->up_axis) === $axe)>{{ $axe }}</option>
                    @endforeach
                </select>
            </label>

            <label class="champ">
                <span>Placement conseillé</span>
                <select name="recommended_placement" required>
                    @foreach (['floor' => 'Au sol', 'table' => 'Sur une table', 'wall' => 'Au mur'] as $valeur => $libelle)
                        <option value="{{ $valeur }}" @selected(old('recommended_placement', $objet->recommended_placement) === $valeur)>{{ $libelle }}</option>
                    @endforeach
                </select>
            </label>
        </div>

        <h2>Fichiers 3D</h2>
        <p class="aide">
            Budget imposé : {{ number_format(\App\Models\LearningObject::BUDGET_TRIANGLES, 0, ',', ' ') }} triangles
            et {{ \App\Models\LearningObject::BUDGET_TAILLE_KO }} Ko maximum. Le fichier est inspecté à
            l'envoi — un modèle trop lourd, ou d'une seule pièce, est refusé.
        </p>

        <div class="grille">
            <label class="champ">
                <span>Modèle .glb {{ $creation ? '(requis)' : '(remplacer)' }}</span>
                <input type="file" name="glb" accept=".glb" @required($creation)>
            </label>

            <label class="champ">
                <span>Modèle .usdz (iOS)</span>
                <input type="file" name="usdz" accept=".usdz">
            </label>

            <label class="champ">
                <span>Vignette</span>
                <input type="file" name="poster" accept="image/*">
            </label>
        </div>

        <button type="submit" class="bouton">
            {{ $creation ? 'Créer l\'objet' : 'Enregistrer' }}
        </button>
    </form>

    @unless ($creation)
        <div class="carte" style="margin-top:22px">
            <h2 style="margin-top:0">État</h2>

            <table>
                <tbody>
                    <tr>
                        <td>Statut</td>
                        <td class="num">
                            @if ($objet->status === 'published')
                                <span class="puce puce--ok">publié</span>
                            @else
                                <span class="puce puce--neutre">brouillon</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td>Triangles</td>
                        <td class="num">
                            <span @class(['puce', 'puce--ko' => ! $objet->respecteBudgetPerf(), 'puce--ok' => $objet->respecteBudgetPerf()])>
                                {{ $objet->triangles ? number_format($objet->triangles, 0, ',', ' ') : '—' }}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>Poids du modèle</td>
                        <td class="num">{{ $objet->file_size_kb ? $objet->file_size_kb.' Ko' : '—' }}</td>
                    </tr>
                    <tr>
                        <td>Annotations posées</td>
                        <td class="num">{{ $objet->annotations()->count() }}</td>
                    </tr>
                </tbody>
            </table>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
                <a href="{{ route('admin.objets.annotations', $objet) }}" class="bouton" style="text-decoration:none">
                    <x-icone nom="annotation" :taille="16"/> Éditer les annotations
                </a>

                {{-- 8.6 — prévisualiser AVANT de publier --}}
                <a href="{{ route('lecon.show', $objet->slug) }}" class="bouton bouton--secondaire" style="text-decoration:none">
                    <x-icone nom="oeil" :taille="16"/> Prévisualiser la leçon
                </a>

                <form method="POST" action="{{ route('admin.objets.publier', $objet) }}" style="display:inline">
                    @csrf
                    <button type="submit" class="bouton bouton--secondaire">
                        {{ $objet->status === 'published' ? 'Dépublier' : 'Publier' }}
                    </button>
                </form>

                <form method="POST" action="{{ route('admin.objets.destroy', $objet) }}" style="display:inline"
                      onsubmit="return confirm('Supprimer définitivement cet objet, ses annotations et ses fichiers ?')">
                    @csrf @method('DELETE')
                    <button type="submit" class="bouton bouton--danger">Supprimer</button>
                </form>
            </div>
        </div>
    @endunless
@endsection
