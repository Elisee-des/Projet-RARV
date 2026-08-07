# Contenu pédagogique — Atelier de maintenance industrielle

> **Étape 0.2 du Lot 0.** Contenu réel, rédigé **avant** le code. Alimente directement le seeder
> du Lot 2 (étape 2.2) et l'affichage des activités du Lot 6.
> Scénario de référence : [`scenario-pedagogique.md`](scenario-pedagogique.md)

> 🔒 **Ce fichier contient les bonnes réponses.** Il est la source du seeder, jamais du front.
> Le champ `is_correct` ne sort **jamais** de l'API — décision **D5**, prouvée par un test à
> l'étape 2.11.

---

## Sommaire

| § | Contenu | Poste |
|:--:|---|:--:|
| 1 | Panneau d'accueil | P01 |
| 2 | Vidéo — consignation électrique | P02 |
| 3 | Panneau — les EPI | P03 |
| 4 | Panneau — la pompe centrifuge | P04 |
| 5 | Document — couples de serrage | P05 |
| 6 | Vidéo — analyse vibratoire | P06 |
| 7 | Document — stockage des lubrifiants | P07 |
| 8 | **Quiz noté — 10 questions** | P08 |
| 9 | Récapitulatif pour le seeder | — |

---

# 1. P01 — Panneau d'accueil

**Type** : `panel` · **Déclenchement** : proximité 2,0 m · **Requis** · Consulté après 8 s ou défilement complet

### Titre

> **Intervention de maintenance de premier niveau sur une pompe centrifuge**

### Corps

Bienvenue dans l'atelier de maintenance.

Ce parcours dure **15 à 20 minutes**. Vous allez vous déplacer librement dans l'atelier et
consulter **8 postes de travail**. Chaque poste vous apprend quelque chose qui sera évalué au
poste final.

**À l'issue de ce parcours, vous saurez :**

1. Identifier les EPI obligatoires en atelier de maintenance
2. Énoncer les 5 étapes de la consignation électrique dans l'ordre
3. Nommer les 5 organes principaux d'une pompe centrifuge et leur fonction
4. Appliquer un couple de serrage conforme à la fiche technique
5. Reconnaître les 3 signatures vibratoires de défaut les plus courantes
6. Appliquer les règles de stockage et de rétention des lubrifiants

**Pour valider la formation**, vous devez consulter les **6 postes obligatoires** et obtenir
**au moins 70 %** au quiz du poste d'évaluation. Deux postes sont facultatifs — mais deux
questions du quiz portent dessus.

### Encadré — Comment se déplacer

| Action | Ordinateur | Téléphone |
|---|---|---|
| Avancer | `Z` `Q` `S` `D` ou flèches | joystick en bas à gauche |
| Regarder | souris | glisser un doigt |
| Interagir | clic ou `E` | toucher le poste |
| Quitter une activité | `Échap` | bouton ✕ |

> 💡 Perdu ? Le bouton **« Aller au poste suivant »** vous y emmène automatiquement.
> Vous pouvez aussi suivre tout le parcours **sans 3D** via le lien *Version accessible*.

---

# 2. P02 — Vidéo : la consignation électrique

**Type** : `video` · **Déclenchement** : clic · **Requis** · Durée **2 min 30** · Terminé à ≥ 90 %
**Objectif** : **O2** · **Évalué par** : Q3, Q4, Q5

### Synopsis et script

| Temps | Image | Voix off / texte à l'écran |
|:--:|---|---|
| 0:00 | Armoire électrique fermée, pancarte rouge | « Toute intervention sur une machine commence par la même chose : mettre l'installation hors d'état de démarrer. C'est la consignation. Elle comporte quatre étapes, dans un ordre qui n'est pas négociable. » |
| 0:15 | Manœuvre du sectionneur | **1 — SÉPARATION.** « On sépare l'installation de toutes ses sources d'énergie. Le sectionneur est ouvert, la coupure est visible ou matérialisée. » |
| 0:45 | Pose du cadenas + étiquette nominative | **2 — CONDAMNATION.** « On bloque l'organe de séparation en position ouverte, avec un dispositif qui ne peut être retiré que volontairement, et on appose une pancarte nominative. Le cadenas est personnel : personne d'autre ne le retire. » |
| 1:15 | Lecture du schéma, repérage du départ | **3 — IDENTIFICATION.** « On s'assure que l'ouvrage consigné est bien celui sur lequel on va travailler. Sur une armoire à vingt départs, cette étape évite d'intervenir sur la mauvaise machine. » |
| 1:45 | VAT testé sur source connue, puis sur les bornes, puis retesté | **4 — VÉRIFICATION D'ABSENCE DE TENSION.** « La VAT est la seule preuve que l'installation est réellement hors tension. Elle se fait au plus près du point de travail, sur tous les conducteurs. Et le vérificateur se teste avant **et** après usage : un appareil tombé en panne entre-temps aurait affiché "hors tension" sur une installation encore alimentée. » |
| 2:15 | Attestation de consignation signée | « La consignation est terminée. L'attestation est remise au chargé de travaux. L'intervention peut commencer. » |

### Moyen mnémotechnique affiché en fin de vidéo

> **S · C · I · V** — **S**éparer, **C**ondamner, **I**dentifier, **V**érifier.

### Sous-titres

Fichier `p02-consignation.vtt` — **obligatoire** (étape 6.9). Transcription intégrale du script
ci-dessus, en français.

> ⚠️ **Production** : vidéo à sourcer ou à produire — point **B6** du suivi. À défaut, une
> animation en motion design sur les 4 étapes fait le travail et coûte moins cher qu'un tournage.

---

# 3. P03 — Panneau : les équipements de protection individuelle

**Type** : `panel` · **Déclenchement** : proximité 1,5 m · **Facultatif**
**Objectif** : **O1** · **Évalué par** : Q1, Q2

### Titre

> **Les 5 EPI de l'atelier de maintenance**

### Corps

Un EPI ne se choisit pas par habitude : il se choisit **contre un risque identifié**. Chaque
norme couvre une famille de risques et une seule.

| EPI | Norme | Protège contre | Quand |
|---|---|---|---|
| **Chaussures de sécurité S3** | EN ISO 20345 | Écrasement (coque 200 J), perforation de la semelle, glissade, eau | **En permanence** dans l'atelier |
| **Lunettes de protection** | EN 166 | Projection de particules, d'huile, de liquide sous pression | **En permanence** dans l'atelier |
| **Gants de manutention** | EN 388 | Risque **mécanique** : abrasion, coupure, déchirure, perforation | Manipulation de pièces, outillage |
| **Protection auditive** | EN 352 | Bruit | **À partir de 80 dB(A)** d'exposition quotidienne (port obligatoire à 85 dB(A)) |
| **Gants chimiques** | EN ISO 374 | Produits chimiques, huiles, solvants | Manipulation de lubrifiants et solvants |

### Encadré — Lire le marquage EN 388

Un gant marqué **EN 388 — 4X42C** annonce ses performances dans l'ordre :

```
4  X  4  2  C
│  │  │  │  └── coupure (méthode ISO 13997) : A à F
│  │  │  └───── perforation : 1 à 4
│  │  └──────── déchirure : 1 à 4
│  └─────────── coupure (méthode coupe-circulaire) : X = non applicable
└────────────── abrasion : 1 à 4
```

> ⚠️ **Le piège.** EN 388 ne protège **que** du risque mécanique. Un gant de manutention n'arrête
> ni une projection d'huile chaude (→ EN 407, thermique), ni un contact avec un solvant
> (→ EN ISO 374, chimique), ni le courant électrique (→ EN 60903). Prendre le mauvais gant, c'est
> croire être protégé alors qu'on ne l'est pas.

### Encadré — Ce qui n'est pas un EPI

Un carter de protection, un protecteur d'accouplement ou un capot de machine sont des
**protections collectives**. Elles passent **avant** l'EPI dans les principes généraux de
prévention : on supprime le risque à la source avant de protéger la personne.

---

# 4. P04 — Panneau : la pompe centrifuge 🔗

**Type** : `panel` · **Déclenchement** : clic · **Requis**
**Objectif** : **O3** · **Évalué par** : Q6, Q7

> 🔗 **Contenu repris intégralement du Projet 01** —
> [`docs/contenu-pedagogique.md`](../../Projet-01-Visualiseur-RA-WebXR/docs/contenu-pedagogique.md).
> Le modèle 3D posé sur le socle est le même `.glb`. Rien à réécrire.

### Titre

> **Pompe centrifuge — les 5 organes et leurs points de contrôle**

### Introduction

Une pompe centrifuge transforme l'énergie mécanique d'un moteur en énergie hydraulique. C'est la
machine tournante la plus répandue en industrie — et donc celle qui génère le plus d'interventions.

La grande majorité des pannes ne vient pas du corps de la pompe, mais de **cinq organes** bien
identifiés.

### Les 5 organes

| # | Organe | Rôle en une phrase | Défaillance emblématique |
|:--:|---|---|---|
| ① | **Corps de pompe (volute)** | Convertit la vitesse du fluide en pression | Érosion, corrosion |
| ② | **Roue à aubes** | **Seule pièce qui apporte de l'énergie au fluide** | **Cavitation** |
| ③ | **Garniture mécanique** | Étanchéité au passage de l'arbre | **Marche à sec** |
| ④ | **Paliers et roulements** | Guident l'arbre, reprennent les efforts | Sur-graissage, fatigue |
| ⑤ | **Accouplement** | Transmet le couple en tolérant un léger défaut d'alignement | **Défaut d'alignement** |

### Les 3 points clés à retenir

1. **La volute ne pompe pas.** Elle ralentit le fluide et convertit sa vitesse en pression. Seule
   la roue à aubes lui apporte de l'énergie.
2. **La cavitation ne se répare pas sur la roue.** Un bruit de gravier et des vibrations signalent
   que des bulles de vapeur implosent sur les aubes. Remplacer la roue ne change rien : la
   nouvelle sera piquée à son tour. La cause est **toujours au circuit d'aspiration**.
3. **Un défaut d'alignement se paie ailleurs.** Il ne détruit pas l'accouplement en premier : il
   tue les roulements et la garniture mécanique. C'est la cause racine la plus fréquente, et la
   plus souvent traitée par son symptôme.

### ⚠️ Sécurité

Ne jamais faire tourner une pompe sans protecteur d'accouplement. Toute intervention impose la
consignation électrique complète — voir le poste **P02**.

---

# 5. P05 — Document : couples de serrage

**Type** : `document` · **Déclenchement** : clic · **Requis** · Marqué consulté **au téléchargement**
**Objectif** : **O4** · **Évalué par** : Q8
**Fichier** : `fiche-couples-serrage.pdf` — servi par **URL signée** (étape 6.11)

### Titre du document

> **Fiche technique — Couples de serrage et méthode de serrage des brides**

### Contenu

**Tableau des couples (vis acier, filetage sec, classe de qualité)**

| Diamètre | Classe 8.8 | Classe 10.9 | Classe 12.9 |
|:--:|:--:|:--:|:--:|
| M6 | 10 N·m | 14 N·m | 17 N·m |
| M8 | 25 N·m | 35 N·m | 41 N·m |
| M10 | 49 N·m | 69 N·m | 83 N·m |
| M12 | 85 N·m | 120 N·m | 145 N·m |
| M16 | 210 N·m | 295 N·m | 355 N·m |
| M20 | 410 N·m | 580 N·m | 690 N·m |

> Valeurs indicatives à filetage sec. Un filetage lubrifié réduit le couple d'environ **20 %** à
> précontrainte égale — appliquer un couple « sec » sur un filetage huilé, c'est risquer la
> rupture de la vis.

**Méthode de serrage d'une bride — la règle des 3 passes**

1. Serrer **en croix**, jamais dans l'ordre circulaire
2. **Passe 1** — 30 % du couple final, sur tous les boulons
3. **Passe 2** — 60 % du couple final, sur tous les boulons
4. **Passe 3** — 100 % du couple final, sur tous les boulons
5. **Passe de contrôle** — refaire un tour complet au couple final ; aucun boulon ne doit tourner

```
   Bride 8 boulons — ordre de serrage en croix

          1
      5       7
   3             4
      8       6
          2
```

> ⚠️ **L'erreur qui fait fuir un joint** : serrer un boulon au couple final dès la première passe.
> La bride se déforme, le joint est écrasé localement et laisse passer le fluide de l'autre côté.
> Le remontage est refait, et la cause n'est jamais identifiée.

**Étalonnage de la clé dynamométrique**

- Vérification annuelle obligatoire, ou après toute chute
- **Toujours ramener la clé à sa valeur minimale après usage** — un ressort laissé comprimé se
  détend et fausse l'appareil
- Ne jamais utiliser une clé dynamométrique pour desserrer

---

# 6. P06 — Vidéo : l'analyse vibratoire

**Type** : `video` · **Déclenchement** : clic · **Requis** · Durée **2 min 00** · Terminé à ≥ 90 %
**Objectif** : **O5** · **Évalué par** : Q9

### Synopsis et script

| Temps | Image | Voix off / texte à l'écran |
|:--:|---|---|
| 0:00 | Accéléromètre posé sur un palier, écran de spectre | « Une machine tournante prévient toujours avant de casser. Sa signature vibratoire se dégrade plusieurs semaines avant la panne. Encore faut-il savoir lire le spectre. » |
| 0:20 | Spectre : pic net à 1× | **BALOURD — pic à 1×.** « Un pic dominant exactement à la fréquence de rotation, c'est un balourd : la masse tournante n'est pas répartie uniformément. Cause : usure inégale de la roue, dépôt, réparation mal équilibrée. Correction : équilibrage. » |
| 0:50 | Spectre : pic à 2×, vibration axiale | **DÉSALIGNEMENT — pic à 2×.** « Un pic à deux fois la fréquence de rotation, souvent accompagné d'une forte composante axiale, signale un défaut d'alignement entre moteur et pompe. Correction : réalignement au comparateur ou au laser. » |
| 1:20 | Spectre : forêt de raies en hautes fréquences | **DÉFAUT DE ROULEMENT — hautes fréquences.** « Un roulement dégradé produit des raies à des fréquences non entières, en haut du spectre, liées à la géométrie du roulement. Elles apparaissent bien avant tout bruit audible. » |
| 1:45 | Les 3 spectres côte à côte | « 1× : balourd. 2× : désalignement. Hautes fréquences : roulement. Ces trois signatures couvrent la majorité des diagnostics de premier niveau. » |

### Encadré affiché en fin de vidéo

| Signature | Défaut | Correction |
|:--:|---|---|
| Pic à **1×** | Balourd | Équilibrage |
| Pic à **2×** | Désalignement | Réalignement |
| **Hautes fréquences** | Roulement | Remplacement |
| **Bruit large bande**, pas de pic net | Cavitation | Agir sur l'**aspiration** |

### Sous-titres

Fichier `p06-vibratoire.vtt` — obligatoire.

> ⚠️ **Production** : point **B6**. Les spectres peuvent être générés graphiquement plutôt que
> filmés — c'est même plus lisible.

---

# 7. P07 — Document : stockage des lubrifiants

**Type** : `document` · **Déclenchement** : proximité 1,8 m · **Facultatif**
**Objectif** : **O6** · **Évalué par** : Q10
**Fichier** : `fiche-stockage-lubrifiants.pdf` — URL signée

### Titre du document

> **Fiche de sécurité simplifiée — Stockage et manipulation des huiles en atelier**

### Contenu

**Rétention**

- Le bac de rétention doit contenir **le plus grand des deux volumes suivants** :
  - 100 % du volume du plus grand contenant stocké
  - 50 % du volume total stocké
- Le bac est **maintenu vide** : un bac plein d'eau de pluie n'a plus aucune capacité de rétention
- Un **absorbant** (granulés ou feuilles) doit être disponible **à proximité immédiate**

**Compatibilité**

> ⚠️ **Ne jamais mélanger deux huiles**, même de viscosité identique et même usage. Les additifs
> — anti-usure, antioxydants, détergents — peuvent être chimiquement incompatibles et former des
> boues qui bouchent les filtres et les canaux de graissage. En cas de changement de référence, le
> circuit se **vidange et se rince**.

**Étiquetage et contenants**

- Tout bidon entamé est **refermé** et **étiqueté** : référence de l'huile, date d'ouverture
- Jamais de transvasement dans un contenant alimentaire ou non étiqueté
- Les huiles usagées sont un **déchet dangereux** : bidon dédié, jamais mélangé aux solvants,
  éliminé par une filière agréée avec bordereau de suivi

**Conduite à tenir en cas de déversement**

1. Sécuriser la zone, supprimer les sources d'ignition
2. Endiguer avec l'absorbant, du bord vers le centre
3. Collecter dans le bac à déchets dangereux
4. Signaler — un déversement récurrent est le symptôme d'une fuite à traiter

---

# 8. P08 — Quiz noté : 10 questions

**Type** : `quiz` · **Déclenchement** : clic · **Requis**

| Paramètre | Valeur |
|---|---|
| `pass_score` | **70** (soit **14 / 20**) |
| `max_attempts` | **2** |
| `shuffle_questions` | `true` |
| `time_limit_s` | **600** |
| Total | **10 questions × 2 points = 20 points** |

**Répartition par type** : 7 choix unique · 2 choix multiple · 1 vrai/faux
**Couverture** : chacun des 6 objectifs est évalué par au moins une question.

> 🔒 La colonne **✅** ci-dessous correspond au champ `is_correct` de la table `choices`.
> Elle est **exclue de l'API Resource** de l'étape 2.4 et le test de l'étape 2.11 échoue si elle
> apparaît dans une réponse HTTP.

> ⚠️ **L'ordre des propositions est celui du seeder, et il compte.** Rédigées dans l'ordre
> naturel, les bonnes réponses se retrouvaient presque toutes en première position : cocher
> systématiquement la première case donnait **14/20**, soit exactement le seuil de réussite.
> Elles sont donc délibérément dispersées, et deux tests
> (`test_cocher_systematiquement_la_premiere_proposition_echoue` et son pendant pour la dernière)
> empêchent la régression si ce contenu est réécrit.

---

### Q1 — EPI obligatoires · `multiple` · 2 pts · **O1**

> Vous intervenez en atelier sur une pompe consignée. Quels EPI sont obligatoires ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Chaussures de sécurité S3 | ✅ |
| B | Protection auditive, en toutes circonstances | ❌ |
| C | Lunettes de protection | ✅ |
| D | Gants de manutention adaptés au risque mécanique | ✅ |

**Explication**
La protection auditive n'est obligatoire qu'à partir d'un seuil d'exposition : 80 dB(A) déclenche
la mise à disposition, 85 dB(A) le port obligatoire. Sur une machine consignée, donc à l'arrêt, ce
seuil n'est pas atteint. Les trois autres EPI sont exigés dès l'entrée en zone, machine à l'arrêt
ou non.

---

### Q2 — Marquage des gants · `single` · 2 pts · **O1**

> Vos gants portent le marquage **EN 388 — 4X42C**. Contre quelle famille de risques cette norme
> vous protège-t-elle ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Risque chimique : solvants, huiles, acides | ❌ |
| B | Risque thermique : chaleur de contact, projections de métal fondu | ❌ |
| C | Risque mécanique : abrasion, coupure, déchirure, perforation | ✅ |
| D | Risque électrique : contact avec des pièces sous tension | ❌ |

**Explication**
EN 388 couvre exclusivement le risque mécanique. Le chimique relève de l'EN ISO 374, le thermique
de l'EN 407, l'électrique de l'EN 60903. Un gant de manutention n'arrête ni une projection d'huile
chaude ni un solvant — et c'est précisément parce qu'on le porte qu'on se croit protégé.

---

### Q3 — Ordre de la consignation · `single` · 2 pts · **O2** 🎯

> Dans quel ordre s'enchaînent les étapes d'une consignation électrique ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Identification → Séparation → Condamnation → Vérification d'absence de tension | ❌ |
| B | Séparation → Condamnation → Identification → Vérification d'absence de tension | ✅ |
| C | Séparation → Identification → Condamnation → Vérification d'absence de tension | ❌ |
| D | Condamnation → Séparation → Identification → Vérification d'absence de tension | ❌ |

**Explication**
**S · C · I · V.** On sépare d'abord — l'installation cesse d'être alimentée. On condamne ensuite,
pour que personne ne puisse la réalimenter. On identifie alors l'ouvrage sur lequel on va
travailler. Et on termine par la VAT, seule preuve matérielle de l'absence de tension.
Identifier avant de séparer (proposition B) est l'erreur la plus courante : elle paraît logique,
mais elle laisse l'installation sous tension pendant toute la phase de repérage.

> 🎯 **Question volontairement difficile.** C'est elle qui doit remonter en tête de l'écran
> « questions les plus ratées » du tableau de bord formateur (étape 9.6). Les trois distracteurs
> sont des permutations plausibles, pas des réponses absurdes.

---

### Q4 — Le vérificateur d'absence de tension · `single` · 2 pts · **O2**

> Vous venez de réaliser la VAT et l'appareil indique une absence de tension. Que faites-vous
> **immédiatement après** ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Poser le cadenas de condamnation | ❌ |
| B | Commencer l'intervention | ❌ |
| C | Signer l'attestation de consignation | ❌ |
| D | Retester le vérificateur sur une source connue sous tension | ✅ |

**Explication**
Le vérificateur se teste **avant et après** chaque usage. Un appareil tombé en panne entre les
deux mesures aurait affiché « absence de tension » sur une installation encore alimentée — et rien
ne l'aurait signalé. La proposition B est déjà faite : la condamnation précède la VAT dans l'ordre
S·C·I·V.

---

### Q5 — Le cadenas de condamnation · `truefalse` · 2 pts · **O2**

> Un collègue peut retirer votre cadenas de condamnation s'il doit remettre l'installation en
> service et que vous êtes absent.

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Vrai | ❌ |
| B | Faux | ✅ |

**Explication**
Le cadenas est **personnel et nominatif**. Seul celui qui l'a posé le retire — c'est la seule
garantie que personne ne remet sous tension pendant qu'un intervenant a les mains dans la machine.
La levée d'un cadenas en l'absence de son porteur existe, mais c'est une **procédure
exceptionnelle**, écrite, tracée, et validée par le chargé de consignation. Jamais une décision
individuelle.

---

### Q6 — Organe moteur de la pompe · `single` · 2 pts · **O3**

> Quel organe de la pompe centrifuge apporte l'énergie au fluide ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Le corps de pompe (volute) | ❌ |
| B | La roue à aubes | ✅ |
| C | La garniture mécanique | ❌ |
| D | L'accouplement | ❌ |

**Explication**
Seule la roue à aubes transmet de l'énergie au liquide, en le projetant vers l'extérieur par force
centrifuge. La volute ne « pompe » pas : sa section s'élargit vers le refoulement, ce qui ralentit
le fluide et convertit sa vitesse en pression. La garniture assure l'étanchéité, l'accouplement
transmet le couple du moteur.

---

### Q7 — Diagnostic d'un bruit de gravier · `single` · 2 pts · **O3**

> La pompe émet un bruit de gravier et vibre. De quoi s'agit-il, et où corrige-t-on le problème ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Cavitation — se corrige en remplaçant la roue à aubes | ❌ |
| B | Balourd — se corrige par équilibrage de la roue | ❌ |
| C | Cavitation — se corrige sur le circuit d'**aspiration** | ✅ |
| D | Défaut d'alignement — se corrige au comparateur | ❌ |

**Explication**
Le bruit de gravier est la signature de la **cavitation** : la pression à l'aspiration descend
sous la tension de vapeur du liquide, des bulles se forment puis implosent sur les aubes.
Remplacer la roue (proposition B) ne règle rien — la nouvelle sera piquée à son tour. La cause est
toujours à l'aspiration : hauteur de charge insuffisante, pertes de charge, vanne d'aspiration
partiellement fermée, ou fluide trop chaud.

---

### Q8 — Serrage d'une bride · `single` · 2 pts · **O4**

> Vous devez serrer les 8 boulons d'une bride. Quelle méthode appliquez-vous ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | En croix, en trois passes progressives (30 %, 60 %, 100 % du couple prescrit) | ✅ |
| B | En croix, au couple final dès la première passe | ❌ |
| C | Dans le sens horaire, au couple final dès la première passe | ❌ |
| D | À la clé plate jusqu'au blocage, puis un quart de tour supplémentaire | ❌ |

**Explication**
Le serrage en croix **et** par passes progressives répartit uniformément la charge sur le joint.
Serrer un boulon au couple final d'emblée — même en croix — déforme la bride et écrase le joint
localement : c'est la cause de fuite la plus fréquente après remontage, et elle est rarement
identifiée. La proposition D ignore le couple prescrit et n'a aucune reproductibilité.

---

### Q9 — Lecture d'un spectre vibratoire · `single` · 2 pts · **O5**

> Le spectre vibratoire d'une pompe montre un pic dominant à **2 × la fréquence de rotation**,
> avec une forte composante axiale. Quel défaut suspectez-vous ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Un balourd de la roue à aubes | ❌ |
| B | Un défaut de roulement | ❌ |
| C | De la cavitation | ❌ |
| D | Un défaut d'alignement entre le moteur et la pompe | ✅ |

**Explication**
**1× = balourd. 2× = désalignement.** La composante axiale marquée confirme le désalignement. Un
défaut de roulement se lit en **hautes fréquences**, à des fréquences non entières liées à la
géométrie du roulement. La cavitation, elle, produit un **bruit large bande** sans pic net. Ces
trois signatures couvrent l'essentiel du diagnostic de premier niveau.

---

### Q10 — Stockage des lubrifiants · `multiple` · 2 pts · **O6**

> Concernant le stockage des huiles en atelier, quelles affirmations sont exactes ?

| | Proposition | ✅ |
|:--:|---|:--:|
| A | Deux huiles de marques différentes peuvent être mélangées si leur viscosité est identique | ❌ |
| B | Le bac de rétention doit contenir au moins le volume du plus grand contenant stocké | ✅ |
| C | Tout bidon entamé doit être refermé et étiqueté (référence, date d'ouverture) | ✅ |
| D | Un absorbant doit être disponible à proximité immédiate du stockage | ✅ |

**Explication**
On ne mélange **jamais** deux huiles, même de viscosité identique : leurs additifs — anti-usure,
antioxydants, détergents — peuvent être incompatibles et former des boues qui obstruent filtres et
canaux de graissage. Sur la rétention, la règle retient la **plus élevée** des deux valeurs : 100 %
du plus grand contenant, ou 50 % du volume total stocké.

---

## Message de fin de parcours *(étape 7.5)*

> ✅ **Formation validée.**
> Vous avez parcouru l'atelier et obtenu **{score} / 20** au quiz d'évaluation.
>
> **Les trois réflexes à emporter :**
> 1. **S·C·I·V** — aucune intervention ne commence avant la vérification d'absence de tension.
> 2. **Un symptôme n'est pas une cause.** Une garniture qui fuit et un roulement qui chauffe sont,
>    le plus souvent, les conséquences d'un défaut d'alignement ou d'un problème à l'aspiration.
> 3. **Un couple se respecte, et se répartit.** En croix, en trois passes.

*(Message d'échec, sous le seuil de 70 %)*

> Vous avez obtenu **{score} / 20**, le seuil de réussite est de **14 / 20**.
> Voici les postes correspondant aux questions manquées : **{liste}**.
> Il vous reste **{tentatives}** tentative(s).

---

# 9. Récapitulatif pour le seeder *(Lot 2, étape 2.2)*

### `environments` — 1 ligne

| Champ | Valeur |
|---|---|
| `slug` | `atelier-maintenance-01` |
| `title` | Intervention de maintenance de premier niveau sur une pompe centrifuge |
| `spawn_position` | `[5.0, 1.65, 6.5]` |
| `spawn_rotation` | `180°` (regarde vers −Z) |
| `bounds` | `10 × 3.2 × 8` m |
| `status` | `published` |

### `interaction_points` — 8 lignes

| `order` | `code` | `label` | `activity_type` | `trigger_type` | `trigger_radius` | `required` |
|:--:|---|---|:--:|:--:|:--:|:--:|
| 1 | `POI_01` | Panneau d'accueil | `panel` | `proximity` | 2,0 | ✅ |
| 2 | `POI_02` | Tableau électrique — consignation | `video` | `click` | — | ✅ |
| 3 | `POI_03` | Armoire à EPI | `panel` | `proximity` | 1,5 | ⬜ |
| 4 | `POI_04` | Pompe centrifuge | `panel` | `click` | — | ✅ |
| 5 | `POI_05` | Établi et outillage | `document` | `click` | — | ✅ |
| 6 | `POI_06` | Banc d'analyse vibratoire | `video` | `click` | — | ✅ |
| 7 | `POI_07` | Stockage des lubrifiants | `document` | `proximity` | 1,8 | ⬜ |
| 8 | `POI_08` | Poste d'évaluation | `quiz` | `click` | — | ✅ |

> ⚠️ `position_x/y/z` et `look_at_*` **ne sont pas saisis ici**. Ils sont lus depuis les Empty
> nommés du `.glb` à l'étape **1.10**. Le seeder les laisse à `null` ; le chargeur de scène les
> renseigne au runtime. C'est la parade au piège n°1 du projet : repositionner 8 points à la main
> à chaque itération de la salle.

### `quizzes` — 1 ligne

| Champ | Valeur |
|---|---|
| `title` | Évaluation — maintenance de premier niveau |
| `pass_score` | `70` |
| `max_attempts` | `2` |
| `shuffle_questions` | `true` |
| `time_limit_s` | `600` |

### `questions` — 10 lignes · `choices` — 38 lignes

| `order` | `type` | `points` | Objectif | Poste source | Bonnes réponses |
|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | `multiple` | 2 | O1 | P03 | 3 sur 4 |
| 2 | `single` | 2 | O1 | P03 | 1 sur 4 |
| 3 | `single` | 2 | O2 | P02 | 1 sur 4 🎯 |
| 4 | `single` | 2 | O2 | P02 | 1 sur 4 |
| 5 | `truefalse` | 2 | O2 | P02 | 1 sur 2 |
| 6 | `single` | 2 | O3 | P04 | 1 sur 4 |
| 7 | `single` | 2 | O3 | P04 | 1 sur 4 |
| 8 | `single` | 2 | O4 | P05 | 1 sur 4 |
| 9 | `single` | 2 | O5 | P06 | 1 sur 4 |
| 10 | `multiple` | 2 | O6 | P07 | 3 sur 4 |

**Total** : 20 points · **Seuil** : 14 points (70 %)

> **Règle de notation des `multiple`** (à implémenter à l'étape 2.6) : tout ou rien. La question
> rapporte ses 2 points si et seulement si l'ensemble des cases cochées correspond exactement à
> l'ensemble des bonnes réponses. Un barème partiel serait plus doux mais rendrait le score
> difficile à expliquer à l'apprenant.

---

## Assets à produire

| # | Asset | Poste | Statut |
|:--:|---|:--:|:--:|
| A1 | `p02-consignation.mp4` + `.vtt` (2 min 30) | P02 | ⏳ **B6** |
| A2 | `p06-vibratoire.mp4` + `.vtt` (2 min 00) | P06 | ⏳ **B6** |
| A3 | `fiche-couples-serrage.pdf` | P05 | ⏳ |
| A4 | `fiche-stockage-lubrifiants.pdf` | P07 | ⏳ |
| A5 | 5 images d'EPI | P03 | ⏳ |
| A6 | Illustration des 3 spectres vibratoires | P06 | ⏳ |
| A7 | `pompe-centrifuge.glb` | P04 | ♻️ **Existe** — Projet 01 |

> Les fiches A3 et A4 peuvent être générées en PDF depuis ce document — leur contenu est déjà
> intégralement rédigé ci-dessus.
