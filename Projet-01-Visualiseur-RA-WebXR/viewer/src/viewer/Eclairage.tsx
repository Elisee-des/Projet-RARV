import { ContactShadows, Environment, Lightformer } from '@react-three/drei'

type Props = {
  rayon: number
}

/**
 * Étape 3.4 — Éclairage.
 *
 * L'environnement est construit avec des Lightformer plutôt qu'avec un preset
 * de drei : les presets téléchargent un HDRI depuis un dépôt distant, ce qui
 * casserait la démonstration hors ligne et serait bloqué par la politique de
 * sécurité de contenu de l'étape 10.2.
 *
 * L'ombre de contact est ce qui « pose » visuellement l'objet au sol — c'est
 * aussi ce qui rendra le placement crédible en RA au Lot 5.
 */
export function Eclairage({ rayon }: Props) {
  const portee = Math.max(rayon * 2.5, 1)

  return (
    <>
      <ambientLight intensity={0.4} />

      <directionalLight
        position={[rayon * 2, rayon * 3, rayon * 1.5]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-portee}
        shadow-camera-right={portee}
        shadow-camera-top={portee}
        shadow-camera-bottom={-portee}
        shadow-camera-near={0.1}
        shadow-camera-far={portee * 6}
      />

      {/* Lumière d'appoint froide, côté opposé : détache la silhouette du fond */}
      <directionalLight position={[-rayon * 2, rayon, -rayon * 2]} intensity={0.6} color="#9fc7e8" />

      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 4, 2]} scale={[8, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.1} position={[-4, 1, 2]} scale={[4, 6, 1]} color="#cfe3f5" />
        <Lightformer intensity={0.9} position={[4, 1, -2]} scale={[4, 6, 1]} color="#ffe9cc" />
        <Lightformer intensity={0.5} position={[0, -3, 0]} scale={[10, 10, 1]} color="#3a4450" />
      </Environment>

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.55}
        scale={portee * 2}
        blur={2.4}
        far={rayon * 2}
        resolution={512}
        color="#000000"
      />
    </>
  )
}
