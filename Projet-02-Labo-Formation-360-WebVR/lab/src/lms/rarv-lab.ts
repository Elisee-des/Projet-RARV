import { SOURCE, type MessageRarv } from './protocole'

/**
 * Étape 9.1 — Web Component `<rarv-lab>`.
 *
 * ```html
 * <script type="module" src="/rarv-lab.js"></script>
 * <rarv-lab environment="atelier-maintenance-01" height="640"></rarv-lab>
 * ```
 *
 * ## Pourquoi un Web Component plutôt qu'une simple `<iframe>`
 *
 * Un LMS est écrit dans la technologie de son éditeur — PHP pour Moodle, Java
 * pour Blackboard, React pour un LXP récent. Un composant natif s'intègre dans
 * tous, sans build ni dépendance, et **encapsule le contrat** : l'intégrateur
 * écrit une balise et écoute des événements DOM, il n'a rien à savoir de
 * `postMessage`, des origines ni du format des messages.
 *
 * ## Shadow DOM
 *
 * Il isole les styles dans les deux sens : la feuille de style du LMS ne peut
 * pas déformer le composant, et le composant ne peut pas déteindre sur la page
 * de leçon. Sur une plateforme dont on ne maîtrise pas le CSS, c'est la seule
 * garantie qui tienne.
 *
 * ## Événements émis
 *
 * `rarv:ready` · `rarv:progress` · `rarv:score` · `rarv:completed`
 * — le détail de l'événement est le message reçu de l'iframe.
 */
export class RarvLab extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['environment', 'src', 'height', 'user-ref']
  }

  private cadre: HTMLIFrameElement | null = null

  private detacher: (() => void) | null = null

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' })

    this.rendre()
    this.brancherEcoute()
  }

  disconnectedCallback(): void {
    this.detacher?.()
    this.detacher = null
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot) this.rendre()
  }

  private get urlIframe(): string {
    const explicite = this.getAttribute('src')
    if (explicite) return explicite

    const environnement = this.getAttribute('environment') ?? 'atelier-maintenance-01'
    const userRef = this.getAttribute('user-ref')

    const parametres = new URLSearchParams({ environment: environnement, embed: '1' })
    if (userRef) parametres.set('userRef', userRef)

    return `${new URL('.', import.meta.url).origin}/atelier?${parametres}`
  }

  private rendre(): void {
    const racine = this.shadowRoot
    if (!racine) return

    const hauteur = this.getAttribute('height') ?? '620'

    racine.innerHTML = `
      <style>
        :host { display: block; }
        .cadre {
          width: 100%;
          height: ${Number(hauteur)}px;
          border: 1px solid rgb(148 163 184 / 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: #0b1220;
        }
        iframe { width: 100%; height: 100%; border: 0; display: block; }
      </style>
      <div class="cadre">
        <iframe
          title="Laboratoire de formation 3D"
          src="${this.urlIframe}"
          allow="fullscreen; xr-spatial-tracking; autoplay"
          allowfullscreen
        ></iframe>
      </div>
    `

    this.cadre = racine.querySelector('iframe')
  }

  /**
   * Retransmet les messages de l'iframe en événements DOM.
   *
   * ⚠️ On vérifie que le message vient bien de NOTRE iframe
   * (`evenement.source === contentWindow`). Le marqueur de source suffirait à
   * écarter les autres widgets, mais pas une seconde instance de `<rarv-lab>`
   * sur la même page — un LMS peut très bien afficher deux modules côte à côte,
   * et chacun doit n'émettre que ses propres événements.
   */
  private brancherEcoute(): void {
    const gestionnaire = (evenement: MessageEvent) => {
      const donnees = evenement.data as MessageRarv | undefined

      if (!donnees || typeof donnees !== 'object' || donnees.source !== SOURCE) return
      if (this.cadre && evenement.source !== this.cadre.contentWindow) return

      this.dispatchEvent(
        new CustomEvent(`rarv:${donnees.type}`, {
          detail: donnees,
          bubbles: true,
          composed: true,
        })
      )
    }

    window.addEventListener('message', gestionnaire)
    this.detacher = () => window.removeEventListener('message', gestionnaire)
  }
}

/** Enregistrement idempotent : un double import ne doit pas lever. */
export function definirRarvLab(): void {
  if (!customElements.get('rarv-lab')) {
    customElements.define('rarv-lab', RarvLab)
  }
}
