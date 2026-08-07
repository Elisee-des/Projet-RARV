import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { AudioListener, PositionalAudio } from 'three'
import { bourdonnementAtelier } from './ambiance'

interface Props {
  /** Où se trouve la source, en coordonnées monde. */
  position: [number, number, number]
  active: boolean
  volume?: number
  /** Distance à partir de laquelle le son commence à décroître, en mètres. */
  distanceReference?: number
}

/**
 * Étape 3.6 — Source sonore spatialisée.
 *
 * ⚠️ **Le piège des politiques d'autoplay.** Un `AudioContext` créé sans geste
 * utilisateur naît `suspended` sur tous les navigateurs modernes, et le son ne
 * démarre jamais — sans aucune erreur. C'est exactement la même famille de
 * piège que la `VideoTexture` de l'étape 6.7.
 *
 * La parade est structurelle : ce composant ne joue rien tant que `active` est
 * faux, et `active` ne passe à vrai que sur un clic. Il tente en plus un
 * `resume()` explicite, car un contexte peut aussi se suspendre quand l'onglet
 * passe en arrière-plan.
 */
export default function AmbianceSonore({
  position,
  active,
  volume = 0.35,
  distanceReference = 4,
}: Props) {
  const camera = useThree((etat) => etat.camera)
  const sourceRef = useRef<PositionalAudio | null>(null)
  const ecouteurRef = useRef<AudioListener | null>(null)

  useEffect(() => {
    if (!active) return

    const ecouteur = new AudioListener()
    camera.add(ecouteur)
    ecouteurRef.current = ecouteur

    const source = new PositionalAudio(ecouteur)
    source.position.set(...position)
    source.setBuffer(bourdonnementAtelier(ecouteur.context))
    source.setLoop(true)
    source.setVolume(volume)

    // Atténuation linéaire bornée plutôt que le modèle inverse par défaut :
    // dans une pièce de 10 m, l'atténuation inverse rend la source inaudible
    // dès trois mètres, ce qui donne l'impression d'un son cassé.
    source.setDistanceModel('linear')
    source.setRefDistance(distanceReference)
    source.setMaxDistance(14)
    source.setRolloffFactor(0.9)

    camera.parent?.add(source)
    sourceRef.current = source

    const demarrer = async () => {
      if (ecouteur.context.state === 'suspended') {
        await ecouteur.context.resume()
      }
      if (!source.isPlaying) source.play()
    }

    void demarrer()

    // Un onglet remis au premier plan retrouve un contexte suspendu.
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') void demarrer()
    }
    document.addEventListener('visibilitychange', surVisibilite)

    return () => {
      document.removeEventListener('visibilitychange', surVisibilite)
      if (source.isPlaying) source.stop()
      source.disconnect()
      source.removeFromParent()
      ecouteur.removeFromParent()
      void ecouteur.context.close()
      sourceRef.current = null
      ecouteurRef.current = null
    }
  }, [active, camera, distanceReference, position, volume])

  useEffect(() => {
    sourceRef.current?.setVolume(volume)
  }, [volume])

  return null
}
