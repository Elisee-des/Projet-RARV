@extends('layout')

@section('titre', 'Objets pédagogiques')

@section('contenu')
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
            <h1>Objets pédagogiques</h1>
            <p class="doux">{{ $objets->count() }} objet(s) · budget mobile : {{ number_format(\App\Models\LearningObject::BUDGET_TRIANGLES, 0, ',', ' ') }} triangles / {{ \App\Models\LearningObject::BUDGET_TAILLE_KO }} Ko</p>
        </div>
        <a href="{{ route('admin.objets.create') }}"
           style="display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:8px;background:var(--accent);color:#fff;text-decoration:none;font-size:14px">
            <x-icone nom="ajouter" :taille="16"/> Nouvel objet
        </a>
    </div>

    @include('admin._messages')

    <div class="carte" style="margin-top:22px">
        <table>
            <thead>
                <tr>
                    <th>Objet</th>
                    <th>Statut</th>
                    <th class="num">Annotations</th>
                    <th class="num">Triangles</th>
                    <th class="num">Poids</th>
                    <th class="num">Sessions</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                @forelse ($objets as $objet)
                    <tr>
                        <td>
                            <strong>{{ $objet->title }}</strong><br>
                            <span class="doux">{{ $objet->slug }}</span>
                        </td>
                        <td>
                            @if ($objet->status === 'published')
                                <span class="puce puce--ok">publié</span>
                            @else
                                <span class="puce puce--neutre">brouillon</span>
                            @endif
                        </td>
                        <td class="num">{{ $objet->annotations_count }}</td>
                        <td class="num">
                            @if ($objet->triangles)
                                <span @class(['puce', 'puce--ko' => ! $objet->respecteBudgetPerf()])>
                                    {{ number_format($objet->triangles, 0, ',', ' ') }}
                                </span>
                            @else — @endif
                        </td>
                        <td class="num">{{ $objet->file_size_kb ? $objet->file_size_kb.' Ko' : '—' }}</td>
                        <td class="num">{{ $objet->sessions_count }}</td>
                        <td style="text-align:right;white-space:nowrap">
                            <a href="{{ route('admin.objets.edit', $objet) }}">Éditer</a>
                            &nbsp;·&nbsp;
                            <a href="{{ route('admin.objets.annotations', $objet) }}">Annotations</a>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="7" class="doux">Aucun objet. Créez le premier.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <p class="doux" style="margin-top:18px">
        Un objet ne peut être publié qu'avec au moins une annotation et un modèle dans le budget
        de performance. C'est le système qui refuse, pas une consigne à retenir.
    </p>
@endsection
