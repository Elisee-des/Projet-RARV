# Pipeline des assets 3D — Lot 1

> **État** : les étapes **1.5 à 1.7 sont outillées et automatisées**.
> Les étapes 1.1 à 1.4 exigent Blender et un modèle sourcé — elles restent à
> dérouler à la main.

---

## Vue d'ensemble

```
1.1 Sourcer          →  1.2 Nettoyer     →  1.3 Exporter  →  1.4 Optimiser
    Sketchfab / CAO      Blender             .glb            gltf-transform
                                                                   ↓
                              1.7 Valider  ←  1.6 Vignette  ←  1.5 USDZ
                              (automatisé)    (automatisé)     (automatisé)
```

---

## 1.1 — Sourcer le modèle

**Le critère décisif : des pièces séparées.** Un modèle d'un seul maillage rend
les annotations inutiles — elles n'auraient rien à désigner. Le back-office
refuse d'ailleurs tout fichier de moins de deux maillages.

| Source | Pour | Contre |
|---|---|---|
| **Sketchfab** (filtre CC + téléchargeable) | Prêt à l'emploi, souvent bien découpé | Qualité variable |
| **GrabCAD** | Modèles CAO industriels précis | Très lourds, à retopologiser |
| **Poly Haven** | HDRI et matériaux libres | Peu d'équipements techniques |

**À vérifier avant de télécharger :**
- [ ] Licence compatible avec un usage portfolio — noter auteur et licence dans `docs/licences.md`
- [ ] Moins de 150 000 triangles (marge de manœuvre pour l'optimisation)
- [ ] Pièces nommées et séparées, visibles dans l'arborescence
- [ ] Format `.blend`, `.glb` ou `.fbx`

---

## 1.2 — Nettoyer sous Blender

C'est l'étape qui conditionne tout le reste en réalité augmentée.

```
1. Supprimer la géométrie invisible (intérieurs, doublons)
2. Object > Apply > All Transforms
3. Placer l'origine AU SOL de l'objet, centrée
4. Orienter +Y vers le haut
5. Mettre à l'échelle en MÈTRES RÉELS  ← le piège n°1
6. Renommer chaque pièce en français, sans accent : corps-volute, roue-a-aubes…
```

> ⚠️ **L'échelle.** En glTF, 1 unité = 1 mètre. Un modèle exporté « à l'échelle
> Blender » apparaîtra microscopique ou gigantesque dans le salon de
> l'apprenant. Se calibrer sur un objet connu : une porte fait 2 m.

> ⚠️ **Le nom des pièces se retrouve dans l'éditeur d'annotations** : cliquer sur
> une pièce pré-remplit l'étiquette avec son nom. Un `Cube.014` donne une
> étiquette `Cube 014`.

---

## 1.3 — Exporter en `.glb`

```
File > Export > glTF 2.0 (.glb)
  Format             : glTF Binary (.glb)
  Include            : Selected Objects (si nécessaire)
  Transform +Y Up    : ✅
  Data > Mesh        : Apply Modifiers ✅, Normals ✅, UVs ✅
  Data > Material    : Export ✅
  Compression        : ❌  (appliquée à l'étape suivante)
```

---

## 1.4 — Optimiser

```bash
npm install -g @gltf-transform/cli

gltf-transform optimize entree.glb sortie.glb \
  --compress draco \
  --texture-compress ktx2 \
  --texture-size 1024
```

Les décodeurs Draco et KTX2 sont **déjà servis en local** par le viewer
([ADR 006](adr/006-decodeurs-en-local.md)) : aucune configuration à ajouter.

**Budget imposé** — appliqué par le back-office, pas seulement conseillé :

| | Cible | Refus au-delà de |
|---|--:|--:|
| Triangles | 60 000 | **150 000** |
| Poids | 3 Mo | **8 Mo** |
| Pièces | ≥ 5 | **< 2** |

---

## 1.5 — Générer le `.usdz` ✅ automatisé

```bash
node scripts/glb-vers-usdz.mjs <modele.glb> <modele.usdz>
```

Convertisseur écrit pour le projet : Reality Converter d'Apple exige macOS,
`usd-from-gltf` une chaîne C++, et l'export USD de Blender… Blender.

Il produit un ZIP **non compressé** avec **alignement 64 octets**, les deux
contraintes strictes du format USDZ — qu'un zip ordinaire ne respecte pas.

**Limites** : géométrie et couleurs de matériaux. Pas de textures, pas
d'animation. À revoir si le modèle du Lot 1 est texturé.

**Vérifié structurellement** : conteneur ZIP, compression 0, alignement, en-tête
`#usda 1.0`, `upAxis = "Y"`, `metersPerUnit = 1`, 13 maillages, 6 matériaux.
**Non testé sur un appareil iOS** — risque R8.

---

## 1.6 — Vignette de chargement ✅ automatisé

```bash
node scripts/generer-poster.mjs <modele.glb> <poster.svg> "Titre de l'objet"
```

Construit une silhouette schématique à partir des **bornes réelles** de chaque
pièce, plus le titre et l'emprise en mètres. SVG : 2 Ko au lieu de 60, net à
toute résolution, et affiché flouté derrière l'écran de chargement.

Un vrai rendu de l'objet serait préférable — il demande un rendu hors écran,
donc Blender.

---

## 1.7 — Valider le budget ✅ automatisé

Deux niveaux de contrôle :

**À l'upload**, le back-office refuse le fichier — c'est l'`GlbInspector` qui
ouvre le `.glb`, lit son bloc JSON et compte les triangles sans charger la
géométrie.

**En ligne de commande** :

```bash
php artisan tinker --execute="
  print_r((new App\Support\GlbInspector)->inspecter('chemin/vers/modele.glb'));
"
```

---

## Mise en place d'un nouvel objet

```bash
# 1. Après export depuis Blender
node scripts/glb-vers-usdz.mjs   assets-src/pompe.glb  api/storage/app/assets3d/objets/<slug>/modele.usdz
node scripts/generer-poster.mjs  assets-src/pompe.glb  api/storage/app/assets3d/objets/<slug>/poster.svg "Titre"

# 2. Puis, dans le back-office
#    /admin/objets/nouveau  → téléverser le .glb (contrôlé), le .usdz, la vignette
#    /admin/objets/<slug>/annotations → poser les annotations à la souris
#    Publier
```

Aucune ligne de code à écrire.

---

## Remplacement du modèle de substitution

Le modèle actuellement en base est généré par
`scripts/generer-pompe-substitution.mjs` — 13 pièces nommées, 1 056 triangles.
Il a permis de construire et valider les Lots 3, 4 et 5.

Pour le remplacer :

1. Dérouler 1.1 à 1.4 avec le vrai modèle
2. Exécuter les scripts 1.5 et 1.6
3. Téléverser dans le back-office — `triangles` et `file_size_kb` sont relevés automatiquement
4. **Repositionner les 5 annotations** dans l'éditeur visuel : leurs coordonnées
   étaient calées sur la géométrie de substitution
5. Publier

Rien d'autre ne change.
