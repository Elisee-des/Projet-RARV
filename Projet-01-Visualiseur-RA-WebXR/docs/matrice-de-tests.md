# Matrice de tests — Projet 01

> **Étapes 9.1 et 9.6.** Ce qui s'automatise est automatisé ; le reste est ici,
> sous forme de contrôles manuels reproductibles. La réalité augmentée ne
> s'automatise pas : aucun pilote de navigateur ne simule un sol réel.

---

## 1. Ce qui est couvert automatiquement

| Suite | Portée | Commande |
|---|---|---|
| PHPUnit | API, jetons, xAPI, bascule, back-office, purification | `php artisan test` |
| Vitest | Détection RA, analyse des URL, purification client | `npm run test` |
| Playwright | Parcours desktop de bout en bout | `npm run e2e` ⚠️ *voir §4* |
| TypeScript | Typage de l'ensemble du front | `npm run typecheck` |

---

## 2. Matrice navigateurs — à remplir sur matériel réel

Légende : ✅ conforme · ⚠️ écart acceptable · ❌ défaut · ⬜ non testé

| # | Contrôle | Chrome desktop | Firefox | Safari macOS | Chrome Android | Samsung Internet | Safari iOS |
|:--:|---|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | La leçon se charge, le viewer apparaît dans son cadre | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Le modèle 3D s'affiche et se manipule | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Les 5 pastilles s'ouvrent, le suivi de la leçon avance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | La pastille disparaît derrière la géométrie | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Le bouton RA affiche l'état correct de l'appareil | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | La version texte s'ouvre et journalise | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Navigation complète au clavier | ⬜ | ⬜ | ⬜ | — | — | — |
| 8 | Le QR de bascule s'affiche et se scanne | ⬜ | ⬜ | ⬜ | — | — | — |
| 9 | Fermer l'onglet clôture la session (xAPI émis) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Chargement < 8 s en 4G simulée | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Matériel disponible** : ✅ Android · ❌ iPhone *(risque R8)* · ✅ Windows desktop

---

## 3. Checklist de réalité augmentée — manuelle, sur Android

> À dérouler dans l'ordre. Un seul ❌ invalide la démonstration.

### Entrée en session
- [ ] Le bouton affiche « 📱 Voir en réalité augmentée »
- [ ] Le navigateur demande l'autorisation caméra
- [ ] **Refuser** l'autorisation affiche un message clair, pas un écran figé
- [ ] Accepter ouvre le flux caméra en plein écran

### Détection de surface
- [ ] Le message « Recherche d'une surface… » s'affiche
- [ ] Un anneau blanc apparaît sur le sol en balayant lentement
- [ ] Le message passe à « Surface détectée »
- [ ] L'anneau suit le sol quand on bouge le téléphone

### Placement
- [ ] Toucher l'écran pose la pompe à l'emplacement de l'anneau
- [ ] L'anneau disparaît après placement
- [ ] **La taille paraît réaliste** (≈ 1 m de haut, comparer à une chaise)
- [ ] Une ombre est visible au sol sous l'objet

### Stabilité — le contrôle décisif
- [ ] Faire trois pas en arrière : l'objet **reste au même endroit**
- [ ] Tourner autour à 360° : il ne dérive pas
- [ ] S'accroupir : on voit bien le dessous
- [ ] Masquer la caméra 2 s puis redécouvrir : il se retrouve

### Interaction
- [ ] Les 5 pastilles numérotées sont visibles sur l'objet
- [ ] Une pastille passe derrière une pièce quand elle est masquée
- [ ] Toucher une pastille ouvre sa fiche par-dessus la caméra
- [ ] Le compteur en haut à droite avance
- [ ] Boutons − / + : la taille change entre 50 % et 200 %
- [ ] Boutons ↺ / ↻ : l'objet pivote par crans de 15°
- [ ] « Repositionner » ramène l'anneau et permet de reposer l'objet

### Sortie
- [ ] « ✕ Quitter la RA » revient au viewer 3D
- [ ] La progression est conservée au retour
- [ ] Les événements `ar_entered` / `ar_exited` figurent au tableau de bord

---

## 4. Tests de bout en bout — état

Les spécifications Playwright sont écrites dans `viewer/e2e/`. **Les navigateurs
ne sont pas installés** : leur téléchargement dépasse 150 Mo, et la connexion de
la machine de développement a déjà fait échouer un téléchargement de 23 Mo lors
de l'installation de Composer.

Pour les exécuter :

```bash
cd viewer
npx playwright install chromium   # ~150 Mo, une seule fois
npm run e2e
```

---

## 5. Contrôles de performance

| Mesure | Cible | Où la lire |
|---|---|---|
| FPS | ≥ 55 desktop, ≥ 30 mobile | `?debug` sur le viewer |
| Draw calls | ≤ 30 | idem |
| Triangles | ≤ 60 000 | idem, et back-office |
| Poids du `.glb` | ≤ 3 Mo | back-office |
| Bundle initial | sans Three.js | `npm run build` |

Le panneau de profilage s'ouvre en ajoutant `?debug` à l'URL du viewer :
`https://192.168.1.75:5173/?debug`

---

## 6. Contrôles d'accessibilité

- [ ] `Tab` parcourt toute l'interface, sans piège de focus
- [ ] Chaque élément focalisé a un contour visible
- [ ] `Échap` ferme la fiche ouverte
- [ ] `←` `→` naviguent entre les annotations
- [ ] La version texte est utilisable **sans souris**
- [ ] Un lecteur d'écran annonce le titre et le contenu de chaque fiche
- [ ] `prefers-reduced-motion` supprime les mouvements de caméra
- [ ] Avec WebGL désactivé, la version texte s'affiche **automatiquement**

> Pour tester sans WebGL sous Chrome : `chrome://settings` → désactiver
> « Utiliser l'accélération graphique », puis redémarrer.
