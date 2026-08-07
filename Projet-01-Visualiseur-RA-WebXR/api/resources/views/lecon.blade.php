@extends('layout')

@section('titre', $objet->title)

@push('tete')
    <script src="/js/rarv-viewer.js" defer></script>
@endpush

@section('contenu')
    <p class="doux">Module 3 · Maintenance des machines tournantes</p>
    <h1>{{ $objet->title }}</h1>

    <p>{{ $objet->description }}</p>

    <h2>Objectif de la séquence</h2>
    <p>
        À l'issue de cette activité, vous saurez identifier les
        <strong>{{ $objet->annotations->count() }} organes principaux</strong> d'une pompe centrifuge
        et énoncer, pour chacun, le point de contrôle prioritaire en maintenance préventive.
    </p>

    <h2>Explorez l'équipement</h2>
    <p class="doux">
        Manipulez le modèle à la souris ou au doigt, puis ouvrez chaque pastille numérotée.
        Depuis un téléphone Android, le bouton <em>Voir en réalité augmentée</em> pose la pompe
        dans votre atelier, à sa taille réelle.
    </p>

    {{-- Étape 7.1 — le jeton est émis par le SERVEUR, jamais par le navigateur. --}}
    <rarv-viewer
        objet="{{ $objet->slug }}"
        jeton="{{ $jeton }}"
        base="{{ $viewerUrl }}"
        hauteur="620"
        id="viewer"></rarv-viewer>

    <h2>Suivi de votre progression</h2>
    <div class="carte">
        <p id="etat-progression">En attente du chargement du modèle…</p>
        <p class="doux" id="etat-detail"></p>
    </div>

    {{-- Gabarit inerte : l'icône de complétion, prête à être insérée par le
         script d'écoute du composant. --}}
    <template id="gabarit-termine">
        <span class="puce puce--ok"><x-icone nom="valide" :taille="15"/> Activité terminée</span>
    </template>

    <h2>Pour aller plus loin</h2>
    <ul>
        @foreach ($objet->annotations as $annotation)
            <li>{{ $annotation->order ?? $annotation->sort_order }}. <strong>{{ $annotation->title }}</strong></li>
        @endforeach
    </ul>
    <p class="doux">
        Cette liste est aussi le parcours alternatif accessible : le contenu reste consultable
        sans 3D, au clavier seul (étape 9.4).
    </p>
@endsection

@push('scripts')
<script>
    /**
     * Étape 7.2 — La leçon écoute le composant.
     *
     * Aucune connaissance du fonctionnement interne du viewer : uniquement
     * des événements DOM standards. C'est ce qui rend le composant
     * intégrable dans un LMS tiers sans adaptation.
     */
    const viewer = document.getElementById('viewer')
    const etat = document.getElementById('etat-progression')
    const detail = document.getElementById('etat-detail')

    viewer.addEventListener('rarv:ready', (e) => {
        etat.textContent = `Modèle chargé — ${e.detail.annotations} annotations à consulter.`
    })

    viewer.addEventListener('rarv:progress', (e) => {
        const { consultees, total } = e.detail
        etat.textContent = `${consultees} / ${total} annotations consultées.`
    })

    viewer.addEventListener('rarv:ar', (e) => {
        detail.textContent = e.detail.actif ? 'Session de réalité augmentée en cours.' : ''
    })

    viewer.addEventListener('rarv:completed', () => {
        // L'icône est injectée depuis un gabarit rendu par Blade : même jeu
        // Lucide que le reste du site, sans dupliquer les tracés en JavaScript.
        etat.innerHTML = document.getElementById('gabarit-termine').innerHTML
        detail.textContent =
            "Votre consultation a été enregistrée et transmise au Learning Record Store."
    })
</script>
@endpush
