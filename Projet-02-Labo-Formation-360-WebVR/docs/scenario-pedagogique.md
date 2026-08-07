# Scénario pédagogique — Atelier de maintenance industrielle

> **Étape 0.1 du Lot 0.** Document de référence : il fige *ce qu'on apprend* avant que la moindre
> ligne de code ou le moindre polygone soit produit. Toute la scène 3D, l'API et le quiz en
> découlent.

---

## 1. Cadre

| | |
|---|---|
| **Intitulé de la formation** | Intervention de maintenance de premier niveau sur une pompe centrifuge |
| **Environnement** | Atelier technique / salle de maintenance industrielle — une pièce de **10 × 8 m** |
| **Public visé** | Technicien de maintenance débutant, apprenti en maintenance industrielle, salarié en reconversion |
| **Prérequis** | Aucun. Le parcours part des consignes de sécurité. |
| **Durée cible** | **15 à 20 minutes** en une session |
| **Modalité** | Autoformation en ligne, navigateur seul, sans installation ni casque |
| **Évaluation** | Quiz noté de 10 questions, corrigé côté serveur, seuil de réussite **70 %** |

### Choix de l'environnement

Retenu conformément à la recommandation du §1.4 du plan : **atelier technique / salle de
maintenance**. Trois raisons :

1. Il prolonge le fil conducteur des trois projets (formation professionnelle industrielle).
2. Il permet de **poser la pompe centrifuge du Projet 01 dans la salle**, comme équipement réel —
   cohérence de portfolio immédiate, et un poste entier du parcours porte dessus.
3. Le vocabulaire de sécurité (consignation, EPI, VAT) donne des questions de quiz crédibles,
   ce qui désamorce le risque **R8** (contenu bidon).

---

## 2. Objectifs pédagogiques

À l'issue du parcours, l'apprenant est capable de :

| # | Objectif | Poste porteur | Vérifié par |
|:--:|---|:--:|---|
| **O1** | Identifier les EPI obligatoires en atelier de maintenance | P03 | Q1, Q2 |
| **O2** | Énoncer les 5 étapes de la consignation électrique dans l'ordre | P02 | Q3, Q4, Q5 |
| **O3** | Nommer les 5 organes principaux d'une pompe centrifuge et leur fonction | P04 | Q6, Q7 |
| **O4** | Appliquer un couple de serrage conforme à la fiche technique | P05 | Q8 |
| **O5** | Reconnaître les 3 signatures vibratoires de défaut les plus courantes | P06 | Q9 |
| **O6** | Appliquer les règles de stockage et de rétention des lubrifiants | P07 | Q10 |

> Chaque objectif est adossé à **au moins une question du quiz final**. Un poste sans objectif
> vérifié serait décoratif : il n'y en a aucun.

---

## 3. Les 8 postes

| # | Code | Poste | Activité | Déclenchement | Requis | Durée |
|:--:|---|---|:--:|:--:|:--:|:--:|
| 1 | `POI_01` | Panneau d'accueil | **Panneau** | proximité (2,0 m) | ✅ | 1 min |
| 2 | `POI_02` | Tableau électrique — consignation | **Vidéo** | clic | ✅ | 3 min |
| 3 | `POI_03` | Armoire à EPI | **Panneau** | proximité (1,5 m) | ⬜ | 1 min |
| 4 | `POI_04` | Pompe centrifuge | **Panneau** | clic | ✅ | 3 min |
| 5 | `POI_05` | Établi et outillage | **Document** | clic | ✅ | 2 min |
| 6 | `POI_06` | Banc d'analyse vibratoire | **Vidéo** | clic | ✅ | 3 min |
| 7 | `POI_07` | Stockage des lubrifiants | **Document** | proximité (1,8 m) | ⬜ | 1 min |
| 8 | `POI_08` | Poste d'évaluation | **Quiz noté** | clic | ✅ | 5 min |

**Répartition des 4 types** : 3 panneaux · 2 vidéos · 2 documents · 1 quiz noté.
**Requis** : 6 postes sur 8. Les postes 3 et 7 sont des approfondissements facultatifs — ils
servent aussi de démonstration pour le tableau de bord formateur (« les postes optionnels sont-ils
visités ? »).

---

### P01 — Panneau d'accueil · *panneau* · requis

Mur d'entrée, face au point d'apparition. C'est le premier élément vu.

**Contenu** : intitulé de la formation, durée, les 6 objectifs pédagogiques, la règle de
complétion, et la consigne de navigation (« ZQSD pour se déplacer, clic pour interagir »).

**Rôle** : contrat pédagogique + tutoriel de navigation. Marqué consulté après **8 s** ou
défilement complet.

---

### P02 — Tableau électrique · *vidéo* · requis · **O2**

Armoire électrique murale, cadenas de consignation visible, pancarte rouge.

**Contenu** : vidéo de 2 min 30 sur la **procédure de consignation** — séparation, condamnation,
identification, VAT (vérification d'absence de tension), mise à la terre. Sous-titres obligatoires.

**Rôle** : c'est le poste de sécurité central. Trois questions du quiz en dépendent, dont la
question sur l'**ordre** des étapes — celle qui est volontairement la plus ratée, et qui alimente
l'écran « questions les plus ratées » du tableau de bord (étape 9.6).

---

### P03 — Armoire à EPI · *panneau* · optionnel · **O1**

Armoire vitrée, casque, gants, lunettes, chaussures, protections auditives.

**Contenu** : les 5 EPI, leur norme, et pour chacun le risque couvert. Une image par EPI.

**Rôle** : approfondissement. Optionnel, mais deux questions du quiz s'appuient dessus — un
apprenant qui le saute perd des points. C'est exactement le comportement que le tableau de bord
doit rendre visible.

---

### P04 — Pompe centrifuge · *panneau* · requis · **O3** 🔗

**Le pont avec le Projet 01.** Le modèle `.glb` de la motopompe est posé sur un socle au centre de
l'atelier, à l'échelle réelle.

**Contenu** : les 5 organes — corps de volute, roue à aubes, garniture mécanique, palier avant,
accouplement — avec la fonction de chacun et le mode de défaillance associé. Le texte est repris
de [`docs/contenu-pedagogique.md`](../../Projet-01-Visualiseur-RA-WebXR/docs/contenu-pedagogique.md)
du Projet 01 : **le contenu est déjà écrit et validé**.

**Rôle** : cohérence de portfolio. En entretien, c'est le poste qui permet de dire « le même objet
pédagogique est consultable en RA sur téléphone dans le module 1, et posé dans l'atelier du
module 2 ».

> **Évolution possible (hors périmètre v1)** : un bouton « Examiner en RA » qui bascule vers le
> viewer du Projet 01. À noter, pas à faire maintenant.

---

### P05 — Établi et outillage · *document* · requis · **O4**

Établi avec clé dynamométrique, jeu de clés, chiffons, bac de récupération.

**Contenu** : **fiche technique PDF** téléchargeable — tableau des couples de serrage par
diamètre de vis et classe de qualité, procédure d'étalonnage de la clé dynamométrique.

**Rôle** : démontrer le type d'activité « document » et la **URL signée** côté serveur
(étape 6.11). Marqué consulté au téléchargement.

---

### P06 — Banc d'analyse vibratoire · *vidéo* · requis · **O5**

Poste avec écran affichant un spectre, capteur accéléromètre, pompe d'essai.

**Contenu** : vidéo de 2 min sur les 3 signatures de défaut — **balourd** (pic à 1×),
**désalignement** (pic à 2×), **défaut de roulement** (hautes fréquences). Le spectre est montré à
l'écran pendant l'explication.

**Rôle** : le poste « technique » du parcours, celui qui donne de la crédibilité métier. Marqué
terminé à **≥ 90 % de lecture** (étape 6.8).

---

### P07 — Stockage des lubrifiants · *document* · optionnel · **O6**

Étagère avec bidons d'huile, bac de rétention, pictogrammes de danger.

**Contenu** : **fiche de données de sécurité (FDS) PDF** simplifiée — compatibilité des huiles,
volume de rétention réglementaire, conduite à tenir en cas de déversement.

**Rôle** : second poste optionnel, second type « document ». Placé volontairement à l'écart du
parcours naturel pour que le tableau de bord puisse montrer qu'il est peu visité.

---

### P08 — Poste d'évaluation · *quiz noté* · requis

Pupitre avec écran, isolé du reste de la salle, en fin de parcours.

**Contenu** : **10 questions**, mélange de choix unique, choix multiple et vrai/faux.
Rédigées à l'étape 0.2 → [`docs/contenu.md`](contenu.md).

| Paramètre | Valeur |
|---|---|
| `pass_score` | **70 %** (14 points sur 20) |
| `max_attempts` | **2** |
| `shuffle_questions` | `true` |
| `time_limit_s` | **600** (10 min) |

**Rôle** : c'est le poste qui porte la **décision D5** — correction côté serveur, `is_correct`
jamais exposé. Une explication est renvoyée par question après soumission, jamais avant.

---

## 4. Plan de la salle — 10 × 8 m

Repère : origine au coin, **X** de 0 à 10 m (largeur), **Z** de 0 à 8 m (profondeur).
Hauteur sous plafond **3,2 m**, hauteur d'œil **1,65 m**.

```
        X=0                      X=5                     X=10
   Z=0  ┌───────────────────────────────────────────────────┐
        │              ▣ P05  Établi                        │
        │                 (5,0 · 0,6)                       │
        │                                                   │
   Z=2  │  ▣ P04                          ▣ P06             │
        │  Pompe centrifuge               Banc vibratoire   │
        │  (2,5 · 2,0)  ← Projet 01       (7,5 · 2,0)       │
        │                                                   │
   Z=4  │                  · · · · · · ·                    │
        │              parcours conseillé                   │
   Z=5  │▣ P02                                    ▣ P07     │
        │ Tableau élec.                     Stockage huiles │
        │ (0,5 · 5,5)                          (9,5 · 5,0)  │
   Z=6.5│                   ○ SPAWN         ▣ P08           │
        │                  (5,0 · 6,5)      Évaluation      │
   Z=7  │▣ P03                                 (7,5 · 6,5)  │
        │ EPI (0,5 · 7,0)                                   │
   Z=8  └──────────── ▣ P01 ────────────── ▯ PORTE ─────────┘
                    Accueil (5,0 · 7,6)
```

**Point d'apparition** `SPAWN` : (5,0 · 1,65 · 6,5), orienté vers **−Z** — l'apprenant fait face à
la salle, le panneau d'accueil P01 est dans son dos et se déclenche par proximité dès qu'il se
retourne.

**Parcours conseillé** (sens horaire, indiqué par les repères hors champ de l'étape 5.5) :

```
SPAWN → P01 Accueil → P03 EPI → P02 Consignation → P04 Pompe
      → P05 Établi → P06 Vibratoire → P07 Lubrifiants → P08 Évaluation
```

**Circulation** : allées de **1,8 m minimum** entre les postes. Le point 1.2 du Lot 1 (validation
de la navigation sur le blocking) vérifie cette largeur avant tout habillage — c'est précisément
le genre de valeur qu'on ne peut pas juger sur un plan.

---

## 5. Règle de complétion

Le parcours est déclaré **terminé** quand les deux conditions sont réunies :

1. Les **6 postes requis** sont marqués complétés (P01, P02, P04, P05, P06, P08)
2. Le score au quiz du poste P08 est **≥ 70 %**

Les postes P03 et P07 comptent dans le pourcentage de progression affiché au HUD (`x / 8`) mais
**pas** dans la condition de complétion.

La règle est **revérifiée côté serveur** avant toute émission de l'attestation PDF (étape 7.6) et
de la déclaration xAPI `completed` — un front modifié ne doit pas pouvoir se déclarer reçu
(étape 10.9).

---

## 6. Traduction vers le modèle de données

Ce que ce document produit directement dans le seeder du Lot 2 (étape 2.2) :

```
environments        1 ligne   slug = "atelier-maintenance-01"
                              spawn_position = (5.0, 1.65, 6.5), spawn_rotation = 180°
                              bounds = 10 × 3.2 × 8

interaction_points  8 lignes  codes POI_01 … POI_08
                              position lue depuis les Empty Blender (étape 1.10),
                              JAMAIS codée en dur ici
                              trigger_type : proximity ×3, click ×5
                              required : true ×6, false ×2

quizzes             1 ligne   pass_score = 70, max_attempts = 2,
                              shuffle_questions = true, time_limit_s = 600

questions          10 lignes  → étape 0.2
choices          ~35 lignes   → étape 0.2, is_correct JAMAIS exposé (D5)
```

> ⚠️ Les coordonnées du §4 sont un **plan d'intention**, pas la source de vérité. La source de
> vérité au runtime est constituée des Empty nommés `SPAWN` et `POI_01`…`POI_08` exportés dans le
> `.glb` (étape 1.10). Le plan sert à modéliser ; le `.glb` sert à positionner.

---

## 7. Ce que ce scénario désamorce

| Risque | Comment |
|:--:|---|
| **R1** — production 3D qui déborde | 8 postes figés, une pièce, un plan chiffré. Rien à inventer pendant la modélisation. |
| **R6** — effet tunnel sur la 3D | Chaque poste a un objectif pédagogique et une question de quiz. Le contenu existe avant la scène. |
| **R8** — contenu bidon | Sujet métier réel, vocabulaire normé, et le contenu de P04 est déjà rédigé côté Projet 01. |

---

## 8. Suite

- **Étape 0.2** — rédiger les 10 questions avec explications et les textes des 3 panneaux
  → `docs/contenu.md`
- **Étape 0.3** — mettre le plan du §4 au propre → `docs/plan-salle.png`
