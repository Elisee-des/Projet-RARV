/**
 * <rarv-viewer> — Étape 7.1
 *
 * Composant web embarquable dans n'importe quelle page de leçon, quel que
 * soit le LMS et son framework. Il encapsule une iframe dans un Shadow DOM :
 * ni les styles du LMS ni ceux du viewer ne peuvent se contaminer.
 *
 * Usage :
 *   <script src="/js/rarv-viewer.js" defer></script>
 *   <rarv-viewer objet="pompe-centrifuge-01" jeton="…" hauteur="620"></rarv-viewer>
 *
 * Événements émis (DOM, donc écoutables par n'importe quel code hôte) :
 *   rarv:ready · rarv:progress · rarv:completed · rarv:ar · rarv:error
 */
class RarvViewer extends HTMLElement {
  static get observedAttributes() {
    return ['objet', 'jeton', 'hauteur', 'base']
  }

  #iframe = null
  #surMessage = null

  connectedCallback() {
    if (this.shadowRoot) return

    const racine = this.attachShadow({ mode: 'open' })

    racine.innerHTML = `
      <style>
        :host { display: block; }
        .cadre {
          position: relative;
          width: 100%;
          height: var(--rarv-hauteur, 620px);
          border: 1px solid rgba(0,0,0,.12);
          border-radius: 12px;
          overflow: hidden;
          background: #11151a;
        }
        iframe { display: block; width: 100%; height: 100%; border: 0; }
        .etat {
          position: absolute; inset: auto 10px 10px auto;
          padding: 5px 10px; border-radius: 999px;
          background: rgba(10,13,17,.78); color: #fff;
          font: 12px/1 system-ui, sans-serif;
          pointer-events: none; opacity: 0; transition: opacity .2s;
        }
        .etat[data-visible] { opacity: 1; }
      </style>
      <div class="cadre">
        <iframe
          title="Visualiseur d'objet pédagogique en réalité augmentée"
          allow="xr-spatial-tracking; camera; fullscreen"
          allowfullscreen
          referrerpolicy="origin"></iframe>
        <span class="etat" part="etat"></span>
      </div>
    `

    this.#iframe = racine.querySelector('iframe')
    this.etatNoeud = racine.querySelector('.etat')

    this.#appliquerHauteur()
    this.#chargerIframe()

    // Filtrage strict : seule l'origine du viewer est acceptée, et seuls les
    // messages estampillés par lui sont traités.
    this.#surMessage = (evenement) => {
      if (evenement.origin !== this.#origineViewer()) return
      const donnees = evenement.data
      if (!donnees || donnees.source !== 'rarv-viewer') return

      this.#afficherEtat(donnees)
      this.dispatchEvent(
        new CustomEvent(`rarv:${donnees.type}`, { detail: donnees, bubbles: true, composed: true })
      )
    }

    window.addEventListener('message', this.#surMessage)
  }

  disconnectedCallback() {
    if (this.#surMessage) window.removeEventListener('message', this.#surMessage)
  }

  attributeChangedCallback() {
    if (!this.shadowRoot) return
    this.#appliquerHauteur()
    this.#chargerIframe()
  }

  #base() {
    return (this.getAttribute('base') || '').replace(/\/$/, '')
  }

  #origineViewer() {
    try {
      return new URL(this.#base(), window.location.href).origin
    } catch {
      return window.location.origin
    }
  }

  #appliquerHauteur() {
    const hauteur = this.getAttribute('hauteur')
    if (hauteur) this.style.setProperty('--rarv-hauteur', `${parseInt(hauteur, 10)}px`)
  }

  #chargerIframe() {
    if (!this.#iframe) return

    const objet = this.getAttribute('objet')
    if (!objet) return

    const url = new URL(this.#base() || window.location.origin, window.location.href)
    url.searchParams.set('objet', objet)

    const jeton = this.getAttribute('jeton')
    if (jeton) url.searchParams.set('t', jeton)

    // Permet au viewer de cibler précisément l'origine de sa réponse.
    url.searchParams.set('parentOrigin', window.location.origin)

    if (this.#iframe.src !== url.toString()) this.#iframe.src = url.toString()
  }

  #afficherEtat(donnees) {
    if (!this.etatNoeud) return

    const texte = {
      ready: 'Modèle chargé',
      progress: `${donnees.consultees} / ${donnees.total} annotations`,
      completed: '✓ Activité terminée',
      ar: donnees.actif ? 'Réalité augmentée active' : '',
      error: 'Erreur',
    }[donnees.type]

    if (!texte) {
      this.etatNoeud.removeAttribute('data-visible')
      return
    }

    this.etatNoeud.textContent = texte
    this.etatNoeud.setAttribute('data-visible', '')
  }
}

if (!customElements.get('rarv-viewer')) {
  customElements.define('rarv-viewer', RarvViewer)
}
