@if (session('succes'))
    <p class="message message--ok">
        <x-icone nom="valide"/>
        <span>{{ session('succes') }}</span>
    </p>
@endif

@if ($errors->any())
    <div class="message message--ko">
        <x-icone nom="alerte"/>
        <div>
            @foreach ($errors->all() as $erreur)
                <p style="margin:0">{{ $erreur }}</p>
            @endforeach
        </div>
    </div>
@endif
