import { Component, type ErrorInfo, type ReactNode } from 'react'
import EcranErreur from './EcranErreur'

interface Props {
  children: ReactNode
}

interface State {
  erreur: Error | null
}

/**
 * Étape 3.8 — Barrière React.
 *
 * Sans elle, une exception levée pendant le rendu de la scène démonte tout
 * l'arbre React et laisse une page BLANCHE : pas de message, pas de recours,
 * et un utilisateur qui croit que le site est cassé. C'est le comportement par
 * défaut de React depuis la v16, et il surprend encore.
 *
 * Une barrière ne capture que les erreurs de rendu. Les rejets de promesse —
 * un `fetch` qui échoue, un `.glb` introuvable — sont traités là où ils se
 * produisent.
 */
export default class LimiteErreur extends Component<Props, State> {
  state: State = { erreur: null }

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur }
  }

  componentDidCatch(erreur: Error, infos: ErrorInfo): void {
    // En production, ce point d'accroche remonterait vers la supervision.
    console.error('Erreur de rendu de la salle 3D', erreur, infos.componentStack)
  }

  render(): ReactNode {
    if (this.state.erreur) {
      return (
        <EcranErreur
          titre="La salle 3D n'a pas pu s'afficher"
          message="Une erreur inattendue est survenue pendant le rendu. La formation reste
                   accessible dans sa version sans 3D, au clavier seul."
          detail={this.state.erreur.message}
          onReessayer={() => window.location.reload()}
        />
      )
    }

    return this.props.children
  }
}
