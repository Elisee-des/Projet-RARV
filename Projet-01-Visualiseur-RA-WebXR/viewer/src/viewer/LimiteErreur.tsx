import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Rendu de repli, recevant le message d'erreur. */
  repli: (message: string, reessayer: () => void) => ReactNode
}

type State = { erreur: Error | null }

/**
 * Étape 3.8 — Barrière d'erreur autour du rendu 3D.
 *
 * Sans elle, un .glb corrompu ou un 404 sur l'asset fait disparaître toute
 * l'application : React démonte l'arbre et l'utilisateur voit une page
 * blanche, sans le moindre indice.
 */
export class LimiteErreur extends Component<Props, State> {
  state: State = { erreur: null }

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo): void {
    console.error('[viewer] rendu 3D interrompu', erreur, info.componentStack)
  }

  private reessayer = () => {
    this.setState({ erreur: null })
  }

  render(): ReactNode {
    if (this.state.erreur) {
      return this.props.repli(this.state.erreur.message, this.reessayer)
    }

    return this.props.children
  }
}
