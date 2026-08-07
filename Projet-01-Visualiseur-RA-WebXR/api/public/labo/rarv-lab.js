//#region src/lms/protocole.ts
var e = "rarv-lab";
function t(e) {
	let t = (t) => {
		let n = t.data;
		!n || typeof n != "object" || n.source !== "rarv-lab" || e(n);
	};
	return window.addEventListener("message", t), () => window.removeEventListener("message", t);
}
//#endregion
//#region src/lms/rarv-lab.ts
var n = class extends HTMLElement {
	static get observedAttributes() {
		return [
			"environment",
			"src",
			"height",
			"user-ref"
		];
	}
	cadre = null;
	detacher = null;
	connectedCallback() {
		this.shadowRoot || this.attachShadow({ mode: "open" }), this.rendre(), this.brancherEcoute();
	}
	disconnectedCallback() {
		this.detacher?.(), this.detacher = null;
	}
	attributeChangedCallback() {
		this.shadowRoot && this.rendre();
	}
	get urlIframe() {
		let e = this.getAttribute("src");
		if (e) return e;
		let t = this.getAttribute("environment") ?? "atelier-maintenance-01", n = this.getAttribute("user-ref"), r = new URLSearchParams({
			environment: t,
			embed: "1"
		});
		return n && r.set("userRef", n), `${new URL(".", "" + import.meta.url).origin}/atelier?${r}`;
	}
	rendre() {
		let e = this.shadowRoot;
		if (!e) return;
		let t = this.getAttribute("height") ?? "620";
		e.innerHTML = `
      <style>
        :host { display: block; }
        .cadre {
          width: 100%;
          height: ${Number(t)}px;
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
    `, this.cadre = e.querySelector("iframe");
	}
	brancherEcoute() {
		let e = (e) => {
			let t = e.data;
			!t || typeof t != "object" || t.source !== "rarv-lab" || this.cadre && e.source !== this.cadre.contentWindow || this.dispatchEvent(new CustomEvent(`rarv:${t.type}`, {
				detail: t,
				bubbles: !0,
				composed: !0
			}));
		};
		window.addEventListener("message", e), this.detacher = () => window.removeEventListener("message", e);
	}
};
function r() {
	customElements.get("rarv-lab") || customElements.define("rarv-lab", n);
}
//#endregion
//#region src/lms/rarv-lab-autonome.ts
r();
//#endregion
export { n as RarvLab, e as SOURCE, r as definirRarvLab, t as ecouter };
