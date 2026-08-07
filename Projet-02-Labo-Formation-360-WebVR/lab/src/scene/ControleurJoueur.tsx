import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, FrontSide, Line3, MathUtils, Ray, Vector3 } from 'three'
import type { MeshBVH } from 'three-mesh-bvh'

import { brancherClavier, consommerRegard, entrees, reinitialiserDeplacement } from '../entrees/entrees'
import { brancherRegard } from '../entrees/regard'
import { useNavigation } from '../etat/navigation'
import { useReglages } from '../etat/reglages'
import { etatJoueur } from './etatJoueur'
import { DECALAGE_CAMERA, HAUT_DEPUIS_PIEDS, LONGUEUR_SEGMENT, RAYON_JOUEUR } from './collision'
import type { PointResolu } from './reperes'
import type { Environnement } from '../api/types'

interface Props {
  bvh: MeshBVH
  environnement: Environnement
  points: PointResolu[]
  /** Position de départ, aux PIEDS. */
  depart: Vector3
  lacetDepart: number
  onPosteProche?: (code: string | null) => void

  /**
   * Étape 5.7 — verrouillage pendant une activité.
   *
   * Le déplacement ET le regard sont gelés : rien n'est plus déroutant qu'une
   * caméra qui pivote derrière une modale de quiz parce qu'on a bougé la souris
   * pour cliquer sur une réponse.
   */
  verrouille?: boolean
}

/* ------------------------------------------------------------------ *
 * Constantes de déplacement
 * ------------------------------------------------------------------ */

const VITESSE_MARCHE = 2.2 // m/s — une marche calme en atelier
const VITESSE_COURSE = 3.9
const GRAVITE = -22 // plus vif que 9,81 : une chute réaliste paraît molle
const RAYON_INTERACTION = 2.5 // distance de détection du poste le plus proche

/** Tangage maximal. Regarder plus haut retourne l'horizon et désoriente. */
const TANGAGE_MAX = MathUtils.degToRad(85)

/** Radians de rotation par pixel de souris, avant réglage de sensibilité. */
const RADIANS_PAR_PIXEL = 0.0022

/**
 * Hauteur de marche franchissable automatiquement (étape 4.3).
 *
 * 0,25 m est choisi contre la réalité du bâtiment : une contremarche
 * réglementaire ne dépasse pas 0,20 m et un seuil de porte fait 2 à 5 cm. Tout
 * cela passe. Le socle de la pompe, lui, fait 0,40 m — et il doit bloquer :
 * c'est du mobilier, pas un cheminement.
 *
 * Sans ce traitement, une capsule nue s'arrête net devant la moindre
 * contremarche. Le joueur croit alors à un mur invisible.
 */
const HAUTEUR_MARCHE = 0.25

/** Pas de simulation maximal. Au-delà, la capsule traverserait les murs. */
const PAS_MAX = 1 / 60

/* ------------------------------------------------------------------ *
 * Objets temporaires — alloués une fois, réutilisés à chaque image.
 * Allouer un Vector3 par image produit des dizaines de milliers d'objets
 * par minute et déclenche des pauses du ramasse-miettes, visibles comme des
 * micro-saccades.
 * ------------------------------------------------------------------ */

const boite = new Box3()
const segment = new Line3()
const vecteurA = new Vector3()
const vecteurB = new Vector3()
const direction = new Vector3()
const avant = new Vector3()
const lateral = new Vector3()
const intention = new Vector3()
const sauvegarde = new Vector3()
const sauvegardeVitesse = new Vector3()
const rayonSonde = new Ray()
const HAUT = new Vector3(0, 1, 0)

/**
 * Étapes 4.2 à 4.7 et 4.9 — Contrôleur du joueur.
 *
 * ## Résolution des collisions (4.2)
 *
 * Le joueur est une **capsule** ; la salle est un **BVH**. À chaque pas de
 * simulation, on demande au BVH les triangles proches de la capsule, et pour
 * chacun on calcule le point le plus proche du segment central. Si la distance
 * est inférieure au rayon, la capsule est repoussée le long de la normale de
 * cet écart.
 *
 * La capsule n'est pas un choix esthétique : c'est ce qui permet de glisser le
 * long d'un mur au lieu de s'y coller, et de franchir un seuil de quelques
 * centimètres sans code de « marche ». Une boîte accrocherait sur chaque arête.
 *
 * ## Sous-pas (4.2)
 *
 * L'intervalle est découpé en pas d'au plus 1/60 s. Un onglet remis au premier
 * plan après une minute livre un `delta` d'une minute : sans découpage, la
 * capsule se retrouverait de l'autre côté du mur, la collision n'ayant jamais
 * été testée entre les deux positions. C'est le bug de tunnel classique, et il
 * ne se manifeste que dans des conditions qu'on ne teste jamais.
 */
export default function ControleurJoueur({
  bvh,
  environnement,
  points,
  depart,
  lacetDepart,
  onPosteProche,
  verrouille = false,
}: Props) {
  const camera = useThree((etat) => etat.camera)
  const gl = useThree((etat) => etat.gl)

  const reglages = useReglages()
  const navigation = useNavigation()

  // Position du HAUT de la capsule — convention de three-mesh-bvh.
  const position = useRef(new Vector3())
  const vitesse = useRef(new Vector3())
  const lacet = useRef(MathUtils.degToRad(lacetDepart))
  const tangage = useRef(0)
  const auSol = useRef(false)
  const initialise = useRef(false)

  /* -------------------------------------------------------------- *
   * Placement initial
   * -------------------------------------------------------------- */
  useEffect(() => {
    position.current.set(depart.x, depart.y + HAUT_DEPUIS_PIEDS, depart.z)
    vitesse.current.set(0, 0, 0)
    lacet.current = MathUtils.degToRad(lacetDepart)
    tangage.current = 0
    initialise.current = true
  }, [depart, lacetDepart])

  /* -------------------------------------------------------------- *
   * Branchement des entrées
   * -------------------------------------------------------------- */
  useEffect(() => {
    const debrancherClavier = brancherClavier()
    const debrancherRegard = brancherRegard({ cible: gl.domElement })

    return () => {
      debrancherClavier()
      debrancherRegard()
      reinitialiserDeplacement()
    }
  }, [gl])

  /* -------------------------------------------------------------- *
   * Champ de vision (4.7)
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!('fov' in camera)) return

    camera.fov = reglages.fov
    camera.updateProjectionMatrix()
  }, [camera, reglages.fov])

  /* -------------------------------------------------------------- *
   * Boucle de simulation
   * -------------------------------------------------------------- */
  /* -------------------------------------------------------------- *
   * Étape 5.7 — verrouillage à l'ouverture d'une activité
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!verrouille) return

    // Les touches enfoncées au moment de l'ouverture ne recevront jamais leur
    // `keyup` utile : sans cette remise à zéro, l'apprenant repart en marche
    // avant à la fermeture de la modale.
    reinitialiserDeplacement()
    consommerRegard()

    if (document.pointerLockElement) document.exitPointerLock()
  }, [verrouille])

  useFrame((_, delta) => {
    if (!initialise.current) return

    if (verrouille) {
      // On continue de publier l'état — la mini-carte et le HUD restent justes —
      // mais plus rien ne bouge.
      consommerRegard()
      publierEtat(position.current, vitesse.current, lacet.current, auSol.current)
      return
    }

    // Regard — appliqué une fois par image, pas par sous-pas : c'est une
    // entrée utilisateur, pas une grandeur physique.
    appliquerRegard(reglages.sensibilite, lacet, tangage)

    const cible = navigation.cible ? points.find((p) => p.code === navigation.cible) : undefined

    // 4.9 — toute entrée manuelle reprend la main sur le guidage.
    if (cible && (entrees.avant !== 0 || entrees.droite !== 0)) {
      navigation.annuler()
    }

    // Découpage en sous-pas bornés (voir la note sur le tunnel).
    const total = Math.min(delta, 0.25)
    const pas = Math.max(1, Math.ceil(total / PAS_MAX))
    const dt = total / pas

    for (let i = 0; i < pas; i++) {
      simuler(dt, {
        bvh,
        position: position.current,
        vitesse: vitesse.current,
        lacet: lacet.current,
        auSol,
        cible: navigation.enRoute ? cible : undefined,
        surArrivee: navigation.arriver,
        teleporter: reglages.mouvementReduit,
      })
    }

    // 4.6 — bornes de la scène, en dernier recours.
    borner(position.current, environnement, depart)

    // Caméra : la position vient de la simulation, l'orientation du regard.
    camera.position.set(
      position.current.x,
      position.current.y + DECALAGE_CAMERA,
      position.current.z
    )
    camera.rotation.set(tangage.current, lacet.current, 0, 'YXZ')

    // 4.7 — aucun head bob : la caméra suit exactement la capsule, sans
    // oscillation ajoutée. C'est délibéré, pas un oubli.

    publierEtat(position.current, vitesse.current, lacet.current, auSol.current)
    detecterPosteProche(position.current, points, onPosteProche)
  })

  return null
}

/* ------------------------------------------------------------------ *
 * Regard (4.4 / 4.5)
 * ------------------------------------------------------------------ */

function appliquerRegard(
  sensibilite: number,
  lacet: React.RefObject<number>,
  tangage: React.RefObject<number>
): void {
  const { dx, dy } = consommerRegard()

  if (dx === 0 && dy === 0) return

  lacet.current -= dx * RADIANS_PAR_PIXEL * sensibilite
  tangage.current -= dy * RADIANS_PAR_PIXEL * sensibilite

  // Bornage du tangage. Le lacet, lui, tourne librement : le borner ferait
  // buter la vue contre une limite invisible.
  tangage.current = MathUtils.clamp(tangage.current, -TANGAGE_MAX, TANGAGE_MAX)
}

/* ------------------------------------------------------------------ *
 * Un pas de simulation (4.2 / 4.3 / 4.9)
 * ------------------------------------------------------------------ */

interface ContexteSimulation {
  bvh: MeshBVH
  position: Vector3
  vitesse: Vector3
  lacet: number
  auSol: React.RefObject<boolean>
  cible?: PointResolu
  surArrivee: () => void
  teleporter: boolean
}

function simuler(dt: number, ctx: ContexteSimulation): void {
  const { bvh, position, vitesse, lacet, auSol, cible } = ctx

  /* --- Gravité (4.3) ------------------------------------------------ */
  // Au sol, la vitesse verticale est remise à une petite valeur négative
  // plutôt qu'à zéro : cela maintient le contact et évite que la détection
  // de sol clignote d'une image à l'autre sur un plancher parfaitement plat.
  vitesse.y = auSol.current ? dt * GRAVITE : vitesse.y + dt * GRAVITE
  position.addScaledVector(vitesse, dt)

  /* --- Déplacement horizontal --------------------------------------- */
  let entreeAvant = entrees.avant
  let entreeDroite = entrees.droite
  let vitesseCible = entrees.courir ? VITESSE_COURSE : VITESSE_MARCHE

  // 4.9 — déplacement guidé : le contrôleur fabrique lui-même l'entrée.
  if (cible) {
    const versCible = vecteurA.set(
      cible.position3d.x - position.x,
      0,
      cible.position3d.z - position.z
    )
    const distance = versCible.length()

    if (distance < 1.3) {
      ctx.surArrivee()
      return
    }

    if (ctx.teleporter) {
      // `prefers-reduced-motion` : on se pose près du poste au lieu d'y
      // faire glisser la caméra. Un mouvement automatique subi est
      // exactement ce qui déclenche le mal des transports.
      versCible.normalize().multiplyScalar(distance - 1.2)
      position.add(versCible)
      ctx.surArrivee()
      return
    }

    versCible.normalize()

    // Projection de la direction monde dans le repère du joueur : le guidage
    // passe par les mêmes entrées que le clavier, donc par la même résolution
    // de collision. Il ne peut pas traverser un mur.
    avant.set(0, 0, -1).applyAxisAngle(HAUT, lacet)
    lateral.set(1, 0, 0).applyAxisAngle(HAUT, lacet)

    entreeAvant = versCible.dot(avant)
    entreeDroite = versCible.dot(lateral)
    vitesseCible = VITESSE_MARCHE
  }

  let seDeplace = false

  if (entreeAvant !== 0 || entreeDroite !== 0) {
    avant.set(0, 0, -1).applyAxisAngle(HAUT, lacet)
    lateral.set(1, 0, 0).applyAxisAngle(HAUT, lacet)

    direction.set(0, 0, 0).addScaledVector(avant, entreeAvant).addScaledVector(lateral, entreeDroite)

    // Normalisation : sans elle, avancer en diagonale serait 41 % plus rapide
    // que tout droit — un grand classique.
    if (direction.lengthSq() > 1) direction.normalize()

    position.addScaledVector(direction, vitesseCible * dt)
    seDeplace = true
  }

  /* --- Résolution de collision (4.2) -------------------------------- */
  const auSolAvant = auSol.current
  intention.copy(position)

  resoudreCollision(bvh, position, vitesse, auSol)

  /* --- Montée de marche (4.3) --------------------------------------- */
  if (seDeplace && auSolAvant) {
    tenterMarche(bvh, position, vitesse, auSol)
  }
}

/**
 * Étape 4.3 — Franchissement des marches basses et des seuils.
 *
 * Une capsule seule ne monte rien : une face verticale l'arrête net, qu'elle
 * fasse 2 cm ou 2 m. Le joueur ressent alors un mur invisible devant un simple
 * seuil de porte.
 *
 * La parade **mesure** au lieu de tâtonner : quand on constate un blocage
 * horizontal, on lance un rayon vers le bas à l'endroit où l'on voulait aller,
 * depuis une hauteur légèrement supérieure à la marche maximale. Le rayon
 * répond à la seule question qui compte : *à quelle hauteur est le sol devant
 * moi ?*
 *
 * - pas de sol du tout → c'est le vide, on ne monte pas
 * - sol plus haut que `HAUTEUR_MARCHE` → c'est un obstacle, il doit bloquer
 * - sinon → on pose la capsule dessus
 *
 * ⚠️ Une première version tentait de soulever la capsule puis de juger au
 * résultat. Elle a été abandonnée : soulevée de 25 cm, la calotte inférieure
 * passe *au-dessus* d'un obstacle de 40 cm, et la résolution la repousse alors
 * vers le HAUT au lieu de vers l'arrière. Le joueur escaladait le socle de la
 * pompe — comportement observé en recette, invisible à la lecture du code.
 *
 * ⚠️ La tentative appelle `resoudreCollision`, qui écrit dans `auSol` et
 * `vitesse`. En cas d'échec il faut rétablir les TROIS. Ne rétablir que la
 * position laisse le joueur considéré comme en l'air alors qu'il est debout
 * contre un meuble, et la détection de sol se met à clignoter.
 */
function tenterMarche(
  bvh: MeshBVH,
  position: Vector3,
  vitesse: Vector3,
  auSol: React.RefObject<boolean>
): void {
  // De combien la collision nous a-t-elle repoussés horizontalement ?
  const recul = Math.hypot(position.x - intention.x, position.z - intention.z)

  // Seuil : en dessous, on frôlait une surface sans être bloqué.
  if (recul < 0.004) return

  const piedsActuels = position.y - HAUT_DEPUIS_PIEDS

  // Sonde verticale à l'endroit visé, partant juste au-dessus de la marche max.
  rayonSonde.origin.set(intention.x, piedsActuels + HAUTEUR_MARCHE + 0.05, intention.z)
  rayonSonde.direction.set(0, -1, 0)

  const impact = bvh.raycastFirst(rayonSonde, FrontSide, 0, HAUTEUR_MARCHE + 0.35)

  // Pas de sol devant : on avancerait dans le vide. Ne rien faire.
  if (!impact) return

  const hauteurMarche = impact.point.y - piedsActuels

  // Trop haut pour une marche, ou vers le bas — la gravité s'en charge.
  if (hauteurMarche > HAUTEUR_MARCHE || hauteurMarche < 0.01) return

  sauvegarde.copy(position)
  sauvegardeVitesse.copy(vitesse)
  const auSolAvant = auSol.current

  // Pose de la capsule sur la marche, avec un jeu d'un millimètre.
  position.set(intention.x, impact.point.y + HAUT_DEPUIS_PIEDS + 0.001, intention.z)

  resoudreCollision(bvh, position, vitesse, auSol)

  // Toujours bloqué à la même hauteur : la marche existait, mais quelque chose
  // d'autre barre le passage (un montant, un angle rentrant).
  if (Math.hypot(position.x - intention.x, position.z - intention.z) > recul * 0.5) {
    position.copy(sauvegarde)
    vitesse.copy(sauvegardeVitesse)
    auSol.current = auSolAvant
  }
}

/**
 * Repousse la capsule hors de la géométrie et détermine si elle touche le sol.
 *
 * Le collider est en coordonnées MONDE (`construireCollider` a cuit les
 * transformations), donc aucun changement de repère n'est nécessaire — d'où la
 * matrice identité.
 */
function resoudreCollision(
  bvh: MeshBVH,
  position: Vector3,
  vitesse: Vector3,
  auSol: React.RefObject<boolean>
): void {
  // Segment central de la capsule : du haut vers le bas.
  segment.start.copy(position)
  segment.end.set(position.x, position.y - LONGUEUR_SEGMENT, position.z)

  boite.makeEmpty()
  boite.expandByPoint(segment.start)
  boite.expandByPoint(segment.end)
  boite.min.addScalar(-RAYON_JOUEUR)
  boite.max.addScalar(RAYON_JOUEUR)

  const avantResolution = vecteurA.copy(segment.start)

  bvh.shapecast({
    intersectsBounds: (bornes) => bornes.intersectsBox(boite),

    intersectsTriangle: (triangle) => {
      const pointTriangle = vecteurB
      const pointCapsule = direction

      const distance = triangle.closestPointToSegment(segment, pointTriangle, pointCapsule)

      if (distance < RAYON_JOUEUR) {
        const profondeur = RAYON_JOUEUR - distance
        const normale = pointCapsule.sub(pointTriangle).normalize()

        // Le segment ENTIER est déplacé : repousser une seule extrémité
        // inclinerait la capsule, ce qui n'a pas de sens pour un personnage
        // debout et produirait des remontées le long des murs.
        segment.start.addScaledVector(normale, profondeur)
        segment.end.addScaledVector(normale, profondeur)
      }

      return false
    },
  })

  const deplacement = vecteurB.subVectors(segment.start, avantResolution)

  // Sol détecté quand la correction est majoritairement VERS LE HAUT et
  // qu'elle compense la chute en cours. Comparer à la vitesse verticale plutôt
  // qu'à un seuil fixe évite de se croire au sol en frôlant un plafond.
  auSol.current = deplacement.y > Math.abs(vitesse.y) * 0.016

  // Marge de 1e-5 : sans elle, la capsule reste en contact permanent avec le
  // sol et la résolution s'exécute inutilement à chaque image.
  const longueur = Math.max(0, deplacement.length() - 1e-5)

  if (longueur > 0) {
    deplacement.normalize().multiplyScalar(longueur)
    position.add(deplacement)
  }

  if (auSol.current) {
    vitesse.set(0, 0, 0)
    return
  }

  // En l'air : on retire la composante de la vitesse dirigée vers la surface
  // heurtée. C'est ce qui fait GLISSER le long d'un mur au lieu de s'y coller.
  if (longueur > 0) {
    deplacement.normalize()
    vitesse.addScaledVector(deplacement, -deplacement.dot(vitesse))
  }
}

/* ------------------------------------------------------------------ *
 * Bornes de la scène (4.6)
 * ------------------------------------------------------------------ */

function borner(position: Vector3, environnement: Environnement, depart: Vector3): void {
  const bornes = environnement.bounds

  if (!bornes) return

  const marge = RAYON_JOUEUR * 0.5

  position.x = MathUtils.clamp(position.x, marge, bornes.largeur - marge)
  position.z = MathUtils.clamp(position.z, marge, bornes.profondeur - marge)

  // Filet de sécurité : si le joueur passe malgré tout sous le sol — trou dans
  // le mesh de collision, sous-pas manqué — on le repose au point de départ
  // plutôt que de le laisser tomber indéfiniment dans le vide.
  if (position.y < -2) {
    position.set(depart.x, depart.y + HAUT_DEPUIS_PIEDS, depart.z)
  }

  // Plafond : la capsule ne doit pas dépasser la hauteur de la salle.
  position.y = Math.min(position.y, bornes.hauteur - RAYON_JOUEUR)
}

/* ------------------------------------------------------------------ *
 * Publication de l'état, hors de React
 * ------------------------------------------------------------------ */

function publierEtat(position: Vector3, vitesse: Vector3, lacet: number, auSol: boolean): void {
  etatJoueur.pieds.set(position.x, position.y - HAUT_DEPUIS_PIEDS, position.z)
  etatJoueur.lacet = MathUtils.radToDeg(lacet)
  etatJoueur.vitesse = Math.hypot(vitesse.x, vitesse.z)
  etatJoueur.auSol = auSol
}

function detecterPosteProche(
  position: Vector3,
  points: PointResolu[],
  onPosteProche?: (code: string | null) => void
): void {
  let plusProche: string | null = null
  let meilleure = RAYON_INTERACTION

  for (const poste of points) {
    // Distance HORIZONTALE : un panneau mural à 1,60 m de haut est « proche »
    // dès qu'on est devant, quelle que soit la hauteur d'œil.
    const distance = Math.hypot(
      poste.position3d.x - position.x,
      poste.position3d.z - position.z
    )

    const portee = poste.trigger.radius ?? RAYON_INTERACTION

    if (distance < Math.min(portee, meilleure)) {
      meilleure = distance
      plusProche = poste.code
    }
  }

  if (plusProche !== etatJoueur.posteProche) {
    etatJoueur.posteProche = plusProche
    onPosteProche?.(plusProche)
  }
}
