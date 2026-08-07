@extends('layout')

@section('titre', 'Tableau de bord formateur')

@section('contenu')
    <h1>Tableau de bord formateur</h1>
    <p class="doux">
        Règle de complétion : <strong>{{ $regleCompletion }}</strong> ·
        LRS : <code>{{ $pilotelrs }}</code> ·
        {{ $totalDeclarations }} déclarations xAPI
        @if ($declarationsEchouees > 0)
            · <span class="puce puce--ko">{{ $declarationsEchouees }} en échec</span>
        @endif
    </p>

    @forelse ($objets as $objet)
        <h2>{{ $objet['titre'] }}</h2>

        <div class="carte">
            <table>
                <thead>
                    <tr>
                        <th>Consultations</th>
                        <th class="num">Total</th>
                        <th class="num">Passées en RA</th>
                        <th class="num">Durée moyenne</th>
                        <th class="num">Terminées</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doux">{{ $objet['slug'] }}</td>
                        <td class="num"><strong>{{ $objet['sessions'] }}</strong></td>
                        <td class="num">{{ $objet['enRa'] }} <span class="doux">({{ $objet['tauxRa'] }} %)</span></td>
                        <td class="num">{{ $objet['dureeMoyenne'] }} s</td>
                        <td class="num">{{ $objet['completions'] }} <span class="doux">({{ $objet['tauxCompletion'] }} %)</span></td>
                    </tr>
                </tbody>
            </table>

            <h3>Annotations, de la moins consultée à la plus consultée</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Annotation</th>
                        <th class="num">Sessions l'ayant ouverte</th>
                        <th class="num">Taux</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($objet['annotations'] as $annotation)
                        <tr>
                            <td>{{ $annotation['ordre'] }}</td>
                            <td>{{ $annotation['label'] }}</td>
                            <td class="num">{{ $annotation['vues'] }}</td>
                            <td class="num">
                                @if ($annotation['taux'] < 50)
                                    <span class="puce puce--ko">{{ $annotation['taux'] }} %</span>
                                @elseif ($annotation['taux'] < 90)
                                    <span class="puce puce--neutre">{{ $annotation['taux'] }} %</span>
                                @else
                                    <span class="puce puce--ok">{{ $annotation['taux'] }} %</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            @php
                $faible = collect($objet['annotations'])->first();
            @endphp
            @if ($faible && $objet['sessions'] > 0 && $faible['taux'] < 60)
                <p class="doux conseil">
                    <x-icone nom="idee" :taille="17"/>
                    <span>
                        L'annotation <strong>« {{ $faible['label'] }} »</strong> n'est ouverte que par
                        {{ $faible['taux'] }} % des apprenants : sa pastille est probablement mal placée
                        ou peu visible sur le modèle.
                    </span>
                </p>
            @endif
        </div>
    @empty
        <p class="doux">Aucun objet pédagogique publié.</p>
    @endforelse

    <h2>Dernières déclarations xAPI</h2>
    <div class="carte">
        <table>
            <thead>
                <tr>
                    <th>Verbe</th>
                    <th>Apprenant</th>
                    <th>Activité</th>
                    <th>État</th>
                    <th class="num">Émise</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($declarations as $declaration)
                    <tr>
                        <td><code>{{ $declaration->verbeCourt() }}</code></td>
                        <td>{{ $declaration->actor_ref ?? '—' }}</td>
                        <td class="doux">{{ \Illuminate\Support\Str::after($declaration->object_iri, '/objects/') }}</td>
                        <td>
                            @if ($declaration->etat_envoi === 'envoye')
                                <span class="puce puce--ok">envoyée</span>
                            @elseif ($declaration->etat_envoi === 'echec')
                                <span class="puce puce--ko">échec</span>
                            @else
                                <span class="puce puce--neutre">en attente</span>
                            @endif
                        </td>
                        <td class="num doux">{{ $declaration->created_at?->format('H:i:s') }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="doux">Aucune déclaration pour l'instant.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <p class="doux" style="margin-top:20px">
        Les déclarations sont conservées en base même lorsqu'elles partent vers un LRS distant :
        c'est ce journal qui permet de rejouer un envoi échoué et d'auditer ce qui a été transmis.
    </p>
@endsection
