# Déploiement — Lot 11

---

## 1. Variables d'environnement

```dotenv
# --- Socle ------------------------------------------------------------
APP_ENV=production
APP_DEBUG=false
APP_URL=https://exemple.fr
APP_KEY=                      # php artisan key:generate

# --- Mode démonstration (étape 11.5) ---------------------------------
# true  : tableau de bord et traçabilité ouverts, apprenants pseudonymisés,
#         jeton invité délivré à la demande. Pour un portfolio.
# false : accès par secret partagé, identités réelles. Pour un vrai déploiement.
RARV_DEMO_PUBLIC=true
RARV_DASHBOARD_SECRET=        # obligatoire si RARV_DEMO_PUBLIC=false

# --- Intégration LMS --------------------------------------------------
RARV_LMS_SECRET=              # secret partagé avec le serveur du LMS
RARV_LAB_URL=https://exemple.fr
RARV_TOKEN_TTL=120

# --- Traçabilité ------------------------------------------------------
RARV_LRS_DRIVER=local         # ou « http » pour un vrai LRS
RARV_LRS_ENDPOINT=
RARV_LRS_USERNAME=
RARV_LRS_PASSWORD=
RARV_XAPI_IRI=https://exemple.fr/xapi
RARV_XAPI_HOMEPAGE=https://exemple.fr

# --- Attestation ------------------------------------------------------
RARV_ORGANISATION=Nom de l'organisme de formation
```

> ⚠️ **`RARV_DEMO_PUBLIC=true` ouvre des écrans qui exposent des scores.** C'est acceptable pour
> une démonstration de portfolio sur des données fictives, pas pour un déploiement réel. La
> pseudonymisation limite la casse, elle ne la remplace pas.

---

## 2. Politique de sécurité de contenu — étape 11.2

⚠️ **`blob:` et `worker-src` sont obligatoires.** Les décodeurs Draco et KTX2 s'exécutent dans des
*workers* instanciés depuis des blobs. Une CSP sans eux produit une scène **vide et silencieuse** :
aucune erreur visible, juste un modèle qui n'apparaît pas. C'est la première chose à vérifier
quand « rien ne s'affiche en production alors que ça marche en local ».

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src  'self' 'wasm-unsafe-eval' blob:;
  worker-src  'self' blob:;
  child-src   'self' blob:;
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: blob:;
  media-src   'self' blob:;
  connect-src 'self' blob:;
  font-src    'self';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  frame-ancestors https://votre-lms.exemple.fr;
" always;
```

| Directive | Pourquoi elle est là |
|---|---|
| `'wasm-unsafe-eval'` | Draco et Basis sont du WebAssembly. Sans elle, les décodeurs ne démarrent pas |
| `worker-src blob:` | Les décodeurs tournent dans des workers créés depuis des blobs |
| `media-src blob:` | Les `VideoTexture` et les blobs de téléchargement d'attestation |
| `style-src 'unsafe-inline'` | Les styles sont écrits en objets React. À supprimer si l'on passe aux CSS Modules |
| **`frame-ancestors`** | **Restreindre aux LMS autorisés.** Sans cette directive, n'importe quel site peut embarquer la formation |

### Le `postMessage` doit être restreint aussi

En développement, l'origine cible est `'*'` — le contenu est public et aucun message ne porte de
donnée personnelle. **En production LMS**, la transmettre à l'iframe au lancement et la vérifier :
sans quoi une page tierce peut embarquer la formation et lire la progression.

---

## 3. En-têtes des assets

Déjà appliqués par `EnvironmentAssetController` :

| Asset | `Content-Type` | Cache |
|---|---|---|
| `.glb` | `model/gltf-binary` | 1 an, immuable |
| `.ktx2` | `image/ktx2` | 1 an, immuable |
| `.vtt` | `text/vtt` | 1 an, immuable |
| `.pdf` | `application/pdf` | 1 an, immuable |
| Attestation | `application/pdf` | **`no-store`** |

> Un `.glb` servi en `application/octet-stream` échoue **silencieusement** dans Three.js. À
> vérifier dans l'onglet Réseau avant toute autre hypothèse.
>
> L'attestation, elle, ne doit jamais sortir d'un cache : elle refléterait un score périmé.

---

## 4. Mise en production

```bash
# Backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache
php artisan db:seed --class=AtelierMaintenanceSeeder --force

# Assets de la formation
node scripts/generer-salle-blocking.mjs      <storage>/environnements/atelier-maintenance-01
node scripts/generer-assets-pedagogiques.mjs <storage>/environnements/atelier-maintenance-01

# Front
cd lab && npm ci && npm run build            # dist/ + public/rarv-lab.js
```

### Réécriture SPA

Le routage est côté client : toute URL inconnue doit servir `index.html`, sinon un rechargement
sur `/formateur` renvoie un 404.

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### ⚠️ `artisan serve` n'est pas un serveur de production

Il est **mono-thread**. Le front émettant la fiche, le `.glb` et les décodeurs en parallèle, une
requête lente fige tout le serveur. Piège rencontré au Lot 3 du Projet 01. En production :
nginx + php-fpm.

---

## 5. Vidéo de démonstration — étape 11.4, à tourner

90 secondes. **Elle doit finir sur le tableau de bord formateur, pas sur la 3D** : c'est ce plan
qui montre que le projet est Fullstack et pas seulement graphique.

| Temps | Plan | Ce qu'on montre |
|:--:|---|---|
| 0:00-0:08 | Page de présentation | Le sujet en une phrase, et « aucun compte » |
| 0:08-0:22 | Entrée dans l'atelier | Déplacement, mini-carte, indicateurs hors champ |
| 0:22-0:32 | Approche d'un poste | Surbrillance, étiquette, ouverture par proximité |
| 0:32-0:45 | Panneau de la pompe | 🔗 « c'est l'objet du module 1, posé ici » |
| 0:45-1:05 | Quiz | Chronomètre, soumission, **écran de résultat avec explications** |
| 1:05-1:12 | Attestation | Téléchargement du PDF |
| 1:12-1:20 | Version accessible | La même formation au clavier, sans 3D |
| 1:20-1:30 | **Tableau de bord** | *« 67 % ratent la question sur les EPI, et l'armoire à EPI est le poste le moins visité »* |

> Le dernier plan est le seul qui compte vraiment. Tout le reste sert à y amener.

---

## 6. Liste de contrôle avant publication

- [ ] `APP_DEBUG=false` et `APP_KEY` généré
- [ ] HTTPS valide (Let's Encrypt) — WebXR l'exige
- [ ] CSP posée, **`blob:` et `worker-src` inclus**
- [ ] `frame-ancestors` restreint aux LMS autorisés
- [ ] `try_files` pour la réécriture SPA
- [ ] Assets 3D et documents présents dans le stockage
- [ ] `RARV_DEMO_PUBLIC` conscient et assumé
- [ ] `RARV_XAPI_IRI` **stable** — c'est la clé qui relie les déclarations dans le temps
- [ ] Test réel sur Android
- [ ] Vidéo de 90 s tournée et publiée
