# Contenu pédagogique — Pompe centrifuge

> **Étape 0.1 du Lot 0.** Contenu de référence, rédigé **avant** le code.
> Ces textes alimenteront le seeder du Lot 2 et l'affichage des annotations du Lot 4.

---

## 1. Fiche du module

| Champ | Valeur |
|---|---|
| **Slug** | `pompe-centrifuge-01` |
| **Titre** | Pompe centrifuge — organes principaux et points de contrôle |
| **Public** | Techniciens de maintenance industrielle, Bac Pro MSPC / BTS MS |
| **Prérequis** | Notions de base en hydraulique et en mécanique |
| **Durée estimée** | 6 à 8 minutes |
| **Objectif** | Identifier les 5 organes principaux d'une pompe centrifuge et énoncer, pour chacun, le point de contrôle prioritaire en maintenance préventive |
| **Complétion** | Les 5 annotations consultées |
| **Placement RA** | Au sol (`floor`) |
| **Échelle réelle** | ~1,20 m de haut × 0,90 m de long |

---

## 2. Texte d'introduction *(affiché dans la leçon, avant le bouton 3D)*

> Une pompe centrifuge transforme l'énergie mécanique d'un moteur en énergie hydraulique : elle met un liquide en mouvement et augmente sa pression. C'est la machine tournante la plus répandue en industrie — et donc celle qui génère le plus d'interventions de maintenance.
>
> La grande majorité des pannes ne vient pas du corps de la pompe, mais de **cinq organes** bien identifiés. Explorez le modèle en 3D — ou posez-le dans votre atelier en réalité augmentée — et consultez les 5 points de contrôle.

---

## 3. Les 5 annotations

> **Note technique** : les coordonnées `position` seront relevées à l'étape **8.4** (éditeur visuel) ou saisies à la main après le Lot 1, une fois le modèle 3D calibré. Les positions ci-dessous sont **indicatives**, exprimées en mètres dans l'espace local du modèle (origine au sol, +Y vers le haut).

---

### ① Corps de pompe (volute)

| Champ | Valeur |
|---|---|
| `label` | Corps de pompe |
| `order` | 1 |
| `position` *(indicatif)* | `[0.00, 0.55, 0.20]` |

**Rôle**
La volute est l'enveloppe en spirale qui entoure la roue. Sa section s'élargit progressivement vers la sortie : cette géométrie ralentit le fluide et **convertit sa vitesse en pression**. C'est là que se joue le rendement hydraulique de la machine.

**Points de contrôle**
- Absence de fuite aux plans de joint et aux brides d'aspiration et de refoulement
- État de la peinture et traces de corrosion externe
- Absence de vibration anormale au contact
- Serrage des boulons de brides au couple prescrit

**Défaillances courantes**
- **Érosion interne** par un fluide chargé de particules abrasives
- **Corrosion** en cas de fluide incompatible avec le matériau du corps
- **Fissuration** sur choc thermique ou coup de bélier répété

**⚠️ Sécurité**
Ne jamais desserrer une bride sans avoir consigné l'installation et vérifié la **mise à pression atmosphérique** du circuit.

---

### ② Roue à aubes (impulseur)

| Champ | Valeur |
|---|---|
| `label` | Roue à aubes |
| `order` | 2 |
| `position` *(indicatif)* | `[0.00, 0.55, 0.05]` |

**Rôle**
C'est la **seule pièce qui apporte de l'énergie au fluide**. Entraînée par l'arbre, elle projette le liquide vers l'extérieur par force centrifuge. Son diamètre et sa vitesse de rotation déterminent directement la hauteur manométrique de la pompe.

**Points de contrôle**
- État et épaisseur des aubes (érosion, ébréchures)
- Jeu à la bague d'usure — un jeu excessif fait chuter le débit
- Équilibrage : un balourd se traduit par une vibration à la fréquence de rotation
- Propreté : absence de dépôts ou de corps étranger

**Défaillances courantes**
- **Cavitation** — le symptôme le plus caractéristique. Quand la pression à l'aspiration descend sous la tension de vapeur du liquide, des bulles se forment puis implosent sur les aubes. Bruit typique de *gravier dans la pompe*, vibrations, et piquage progressif du métal.
- **Érosion** par abrasifs, réduisant l'épaisseur des aubes
- **Balourd** après réparation ou usure inégale

**💡 Point clé à retenir**
La cavitation ne se répare pas sur la roue : elle se corrige **sur le circuit d'aspiration** (hauteur de charge, pertes de charge, température du fluide, ouverture de la vanne d'aspiration).

---

### ③ Garniture mécanique (étanchéité d'arbre)

| Champ | Valeur |
|---|---|
| `label` | Garniture mécanique |
| `order` | 3 |
| `position` *(indicatif)* | `[0.00, 0.55, -0.15]` |

**Rôle**
Assurer l'**étanchéité au passage de l'arbre** à travers le corps de pompe. Deux faces parfaitement planes, l'une fixe et l'autre solidaire de l'arbre, glissent l'une sur l'autre avec un film liquide de quelques microns. C'est l'organe le plus sollicité et **la première cause d'arrêt d'une pompe centrifuge**.

**Points de contrôle**
- Fuite : quelques gouttes par minute sont tolérées sur un presse-étoupe, mais une garniture mécanique doit rester **pratiquement sèche**
- Température du boîtier au contact
- Bruit de crissement à la mise en route
- État du circuit de quench ou de refroidissement s'il existe

**Défaillances courantes**
- **Marche à sec** — destruction en quelques secondes, cause n°1
- **Cristallisation** du produit entre les faces
- **Défaut d'alignement** transmis par l'accouplement (voir ⑤)
- Vieillissement des élastomères (O-rings)

**⚠️ Sécurité**
Une fuite de garniture sur un produit dangereux impose l'**arrêt immédiat** et le port des EPI adaptés. Ne jamais tenter de resserrer une garniture mécanique en marche — contrairement à un presse-étoupe, elle n'est pas réglable.

---

### ④ Paliers et roulements

| Champ | Valeur |
|---|---|
| `label` | Paliers et roulements |
| `order` | 4 |
| `position` *(indicatif)* | `[0.00, 0.50, -0.35]` |

**Rôle**
Guider l'arbre en rotation et reprendre les efforts **radiaux** (poids, poussée hydraulique latérale) et **axiaux** (poussée de la roue). Ils déterminent la durée de vie mécanique de la pompe.

**Points de contrôle**
- **Température** : au-delà de 70 °C sur le corps de palier, alerte. Au-delà de 80 °C, arrêt.
- **Vibration** : mesure périodique, c'est l'indicateur prédictif le plus fiable
- **Niveau et couleur de l'huile** dans le voyant — une huile laiteuse signale une entrée d'eau
- **Bruit** : un roulement dégradé émet un sifflement ou un cliquetis caractéristique
- Respect du **plan de graissage** (quantité et périodicité)

**Défaillances courantes**
- **Sur-graissage** — cause aussi fréquente que le sous-graissage, provoque un échauffement par barattage
- **Pollution** du lubrifiant (eau, poussière)
- **Fatigue** normale en fin de durée de vie (écaillage des pistes)
- **Passage de courant électrique** à travers le roulement sur les moteurs à variateur

**💡 Point clé à retenir**
Un roulement prévient toujours avant de casser. La signature vibratoire se dégrade **plusieurs semaines** avant la panne : c'est le fondement de la maintenance prédictive.

---

### ⑤ Accouplement moteur – pompe

| Champ | Valeur |
|---|---|
| `label` | Accouplement |
| `order` | 5 |
| `position` *(indicatif)* | `[0.00, 0.50, -0.55]` |

**Rôle**
Transmettre le couple du moteur à l'arbre de pompe tout en **tolérant un léger défaut d'alignement** et en amortissant les à-coups. Sur un accouplement élastique, un élément en élastomère absorbe les variations de couple.

**Points de contrôle**
- **Alignement** — parallèle et angulaire, à contrôler au comparateur ou au laser
- État de l'élément élastique : fissures, effritement, poussière noire au sol sous l'accouplement
- Serrage des vis de moyeu
- **Présence et fixation du protecteur** — obligatoire

**Défaillances courantes**
- **Défaut d'alignement** — c'est la cause racine la plus fréquente. Il ne détruit pas l'accouplement en premier : il **tue les roulements et la garniture mécanique**. Un défaut d'alignement se paie toujours ailleurs.
- Usure de l'élastomère
- Desserrage progressif des moyeux

**⚠️ Sécurité**
**Ne jamais faire tourner une pompe sans protecteur d'accouplement.** Toute intervention impose la consignation électrique complète : séparation, condamnation, identification, vérification d'absence de tension.

---

## 4. Récapitulatif pour le seeder *(Lot 2, étape 2.2)*

| # | `label` | `title` | Mot-clé de la défaillance |
|:--:|---|---|---|
| 1 | Corps de pompe | Corps de pompe (volute) | Érosion / corrosion |
| 2 | Roue à aubes | Roue à aubes (impulseur) | **Cavitation** |
| 3 | Garniture mécanique | Garniture mécanique | **Marche à sec** |
| 4 | Paliers et roulements | Paliers et roulements | Sur-graissage / vibration |
| 5 | Accouplement | Accouplement moteur–pompe | **Défaut d'alignement** |

---

## 5. Message de fin *(affiché à 5/5 annotations consultées)*

> ✅ **Module terminé.**
> Vous avez identifié les 5 organes principaux d'une pompe centrifuge.
>
> **À retenir** : trois défaillances sur quatre trouvent leur origine ailleurs que là où elles se manifestent. Une garniture qui fuit et un roulement qui chauffe sont, dans la majorité des cas, les symptômes d'un **défaut d'alignement de l'accouplement** ou d'un **problème à l'aspiration**.

---

## 6. À faire ensuite

- [ ] Relever les coordonnées réelles des 5 annotations après calibrage du modèle (Lot 1)
- [ ] Sourcer ou produire une image d'illustration par annotation (Lot 1.6)
- [ ] Faire relire le contenu par un formateur en maintenance industrielle, si possible
