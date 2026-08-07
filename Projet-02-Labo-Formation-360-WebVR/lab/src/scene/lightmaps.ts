import {
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three'

/**
 * Étape 3.4 — Application des lightmaps précalculées. **Décision D4.**
 *
 * L'éclairage de la salle est cuit sous Blender (étape 1.7) dans des textures,
 * sur un SECOND jeu d'UV non chevauchant (étape 1.6). En lecture, il ne reste
 * qu'à brancher ces textures : la scène tourne alors avec zéro ombre temps réel
 * et une seule lumière au plus, ce qui est la condition pour tenir 30 fps sur
 * un téléphone.
 *
 * Trois pièges sont traités ici, et ils sont tous silencieux :
 *
 * 1. **Le jeu d'UV.** Three.js lit la lightmap sur `uv1`. Un glTF exporté avec
 *    `TEXCOORD_1` mais un matériau qui pointe sur `uv0` affiche la lightmap
 *    étirée sur la texture de base — sans aucune erreur.
 *
 * 2. **L'espace colorimétrique.** Une lightmap est une donnée d'éclairage, pas
 *    une couleur : elle se lit en LINÉAIRE. Chargée en sRGB, la scène paraît
 *    délavée et personne ne comprend pourquoi.
 *
 * 3. **`flipY`.** Les textures glTF ont l'origine en haut à gauche, les
 *    textures Three.js en bas à gauche. Une lightmap chargée par
 *    `TextureLoader` doit être retournée, sinon l'éclairage est cuit à
 *    l'envers — et c'est très difficile à voir sur une salle symétrique.
 */

export interface OptionsLightmap {
  /** Intensité de la lightmap. 1 = telle que cuite. */
  intensite?: number
}

/**
 * Charge une lightmap et la branche sur tous les maillages de la scène qui
 * possèdent un second jeu d'UV.
 *
 * @returns le nombre de matériaux effectivement éclairés
 */
export async function appliquerLightmap(
  racine: Object3D,
  url: string,
  options: OptionsLightmap = {}
): Promise<number> {
  const texture = await new TextureLoader().loadAsync(url)

  preparerLightmap(texture)

  return brancherLightmap(racine, texture, options.intensite ?? 1)
}

/** Réglages obligatoires d'une texture d'éclairage. */
export function preparerLightmap(texture: Texture): Texture {
  // Piège n°2 — donnée d'éclairage, donc linéaire, jamais sRGB.
  texture.colorSpace = LinearSRGBColorSpace

  // Piège n°3 — convention glTF vs convention Three.js.
  texture.flipY = false

  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.needsUpdate = true

  // La lightmap est lue sur le SECOND jeu d'UV (piège n°1).
  texture.channel = 1

  return texture
}

function brancherLightmap(racine: Object3D, texture: Texture, intensite: number): number {
  let eclaires = 0

  racine.traverse((objet) => {
    if (!(objet instanceof Mesh)) return

    // Sans second jeu d'UV, brancher la lightmap l'étirerait sur les UV de
    // base : mieux vaut ne rien faire et le signaler au panneau de debug.
    if (!objet.geometry.getAttribute('uv1')) return

    const materiaux = Array.isArray(objet.material) ? objet.material : [objet.material]

    for (const materiau of materiaux) {
      if (!(materiau instanceof MeshStandardMaterial)) continue

      materiau.lightMap = texture
      materiau.lightMapIntensity = intensite
      materiau.needsUpdate = true
      eclaires++
    }
  })

  return eclaires
}

/**
 * Prépare les matériaux d'une scène glTF fraîchement chargée.
 *
 * Trois réglages, appliqués systématiquement :
 *
 * - `map.colorSpace = SRGBColorSpace` — les couleurs de base sont des couleurs.
 *   GLTFLoader le fait déjà ; on le réaffirme pour les textures branchées à la
 *   main, où l'oubli donne une scène délavée.
 * - `envMapIntensity` bas — décision D4 : la scène ne doit pas dépendre d'une
 *   carte d'environnement, elle dépend de sa lightmap.
 * - ombres désactivées — aucune ombre temps réel dans ce projet.
 */
export function preparerMateriaux(racine: Object3D): { maillages: number; avecUv1: number } {
  let maillages = 0
  let avecUv1 = 0

  racine.traverse((objet) => {
    if (!(objet instanceof Mesh)) return

    maillages++
    if (objet.geometry.getAttribute('uv1')) avecUv1++

    objet.castShadow = false
    objet.receiveShadow = false

    // La géométrie de collision et les volumes de debug ne sont jamais rendus.
    if (objet.name.startsWith('col-')) objet.visible = false

    const materiaux = Array.isArray(objet.material) ? objet.material : [objet.material]

    for (const materiau of materiaux) {
      if (!(materiau instanceof MeshStandardMaterial)) continue

      if (materiau.map) materiau.map.colorSpace = SRGBColorSpace
      materiau.envMapIntensity = 0.15
    }
  })

  return { maillages, avecUv1 }
}
