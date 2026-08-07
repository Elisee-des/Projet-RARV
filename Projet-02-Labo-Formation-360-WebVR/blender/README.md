# /blender — production de l'environnement 3D

Fichiers sources Blender du **Lot 1**. Le `.blend` reste ici ; seuls les exports
optimisés (`.glb`) partent vers le backend.

## Sorties attendues du Lot 1

| Fichier | Étape | Rôle |
|---|:--:|---|
| `atelier.blend` | 1.1 → 1.7 | Source Blender (blocking, habillage, UV2, baking) |
| `atelier.glb` | 1.8 | Géométrie visible + lightmaps, optimisée Draco/KTX2 |
| `collision.glb` | 1.5 | **Boîtes ultra-simplifiées** — jamais la géométrie visible |
| Empty nommés | 1.10 | `SPAWN`, `POI_01` … `POI_08`, exportés dans `atelier.glb` |

## Conventions non négociables

- **Échelle réelle en mètres.** Salle 10 × 8 × 3,2 m — voir [`docs/plan-salle.svg`](../docs/plan-salle.svg)
- **+Y vers le haut**, origine de la scène au **coin** de la salle : X de 0 à 10, Z de 0 à 8
- Hauteur d'œil de référence : **1,65 m**
- Allées libres **≥ 1,80 m**
- Toutes les transformations appliquées avant export (`Ctrl+A → All Transforms`)

## Budget de performance (critère de sortie du Lot 1)

| Métrique | Cible | Maximum |
|---|:--:|:--:|
| Triangles | ≤ 150 000 | 400 000 |
| Draw calls | ≤ 60 | 120 |
| Taille `.glb` | ≤ 8 Mo | 20 Mo |
| Lumières temps réel | 0 à 1 | 2 |
| Framerate | 60 fps desktop / 30 fps mobile | — |
| Chargement 4G | ≤ 8 s | 15 s |

## ⚠️ Étape 1.2 — non négociable

**Valider la navigation sur le blocking avant de détailler quoi que ce soit.** Une salle
détaillée dans laquelle on ne s'est jamais déplacé se refait. Dix minutes de test au clavier
sur des volumes gris révèlent que les couloirs sont trop étroits ou les postes mal placés.

## 🔓 Blender absent — parade

Blender n'est pas installé (point **B1** du suivi). L'étape 1.1 étant un *blocking* — des
volumes gris — elle est générable par script, comme l'a été le modèle de substitution du
Projet 01 (`scripts/generer-pompe-substitution.mjs`).

Un script `generer-salle-blocking.mjs` produisant `salle-blocking.glb`, `collision.glb` et
les Empty nommés débloque **les Lots 3, 4 et 5 en entier**, soit ~7 jours de travail, dont
les collisions BVH et tout le système d'interaction.

Ce que ça ne remplace pas et qui exige Blender : l'habillage (1.3), l'atlas de textures (1.4),
le dépliage UV2 (1.6) et le baking des lightmaps (1.7).

## Installation

```powershell
winget install BlenderFoundation.Blender
```
