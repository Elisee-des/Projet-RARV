# Déploiement

> **Étapes 10.1 à 10.3.** Ce document décrit une mise en production complète.
> Il n'a pas été exécuté : aucun serveur n'était disponible pendant le
> développement. Chaque bloc est prêt à être appliqué.

---

## 1. Prérequis

| | |
|---|---|
| PHP | 8.3+ avec `openssl`, `pdo`, `mbstring`, `xml`, `curl`, `zip`, `gd` |
| Base | MySQL 8 / PostgreSQL 14 / SQLite |
| Node | 20+, pour construire le viewer uniquement |
| Serveur web | nginx + php-fpm |
| **TLS** | **Obligatoire** — WebXR et l'accès caméra exigent un contexte sécurisé |

> ⚠️ **Sans HTTPS valide, la réalité augmentée ne démarre pas.** Ce n'est pas un
> avertissement : le navigateur refuse la session, sans possibilité de dérogation.

---

## 2. Deux domaines

Le viewer et l'API sont servis séparément : le premier est un paquet statique,
le second une application PHP.

```
https://formation.exemple.fr        → Laravel (leçons, back-office, API)
https://viewer.formation.exemple.fr → viewer/dist (fichiers statiques)
```

Un domaine unique fonctionne aussi, avec le viewer sous `/viewer` — il faut
alors ajuster `RARV_VIEWER_URL` et la règle de réécriture.

---

## 3. Backend

```bash
git clone … && cd api
composer install --no-dev --optimize-autoloader

cp .env.example .env
php artisan key:generate
php artisan migrate --force

# Caches de production
php artisan config:cache
php artisan route:cache
php artisan view:cache

chown -R www-data:www-data storage bootstrap/cache
```

### Variables à renseigner

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://formation.exemple.fr

RARV_VIEWER_URL=https://viewer.formation.exemple.fr
VIEWER_ORIGINS="https://viewer.formation.exemple.fr"

# Secret partagé avec le LMS — jamais côté navigateur
RARV_LMS_SECRET=<48 caractères aléatoires>

# Traçabilité
RARV_LRS_DRIVER=http
RARV_LRS_ENDPOINT=https://votre-lrs.exemple/data/xAPI
RARV_LRS_USERNAME=<clé>
RARV_LRS_PASSWORD=<secret>
RARV_XAPI_IRI=https://formation.exemple.fr/xapi
RARV_XAPI_HOMEPAGE=https://formation.exemple.fr
```

> `APP_DEBUG=false` n'est pas cosmétique : en `true`, une exception affiche les
> variables d'environnement, **secret LMS compris**.

### Tâche planifiée

```cron
*/5 * * * * cd /var/www/api && php artisan rarv:xapi:rejouer >> /dev/null 2>&1
```

Réémet les déclarations restées en attente lorsque le LRS était injoignable.

---

## 4. Viewer

```bash
cd viewer
npm ci
VITE_LMS_URL=https://formation.exemple.fr npm run build

# Purge des modèles de l'émulateur WebXR — jamais chargés (émulateur désactivé)
rm -f dist/assets/living_room-*.js dist/assets/office_*-*.js dist/assets/meeting_room-*.js
rm -f dist/assets/emulate-*.js

rsync -av --delete dist/ /var/www/viewer/
```

> Cette purge retire **~3,9 Mo** : `@react-three/xr` embarque des modèles de
> pièces pour son émulateur, désactivé par [ADR 006](adr/006-decodeurs-en-local.md).

### QR code de la vitrine

```bash
node scripts/generer-qr-demo.mjs https://formation.exemple.fr/lecon/pompe-centrifuge-01
```

---

## 5. nginx

### API et pages Laravel

```nginx
server {
    listen 443 ssl http2;
    server_name formation.exemple.fr;

    ssl_certificate     /etc/letsencrypt/live/formation.exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/formation.exemple.fr/privkey.pem;

    root /var/www/api/public;
    index index.php;

    client_max_body_size 16M;   # téléversement des .glb (budget : 8 Mo)

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 60;
    }

    location ~ /\.(?!well-known) { deny all; }
}
```

### Viewer statique

```nginx
server {
    listen 443 ssl http2;
    server_name viewer.formation.exemple.fr;

    ssl_certificate     /etc/letsencrypt/live/viewer.formation.exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/viewer.formation.exemple.fr/privkey.pem;

    root /var/www/viewer;
    index index.html;

    # Application monopage : /ar/{token} et /editeur/{slug} doivent servir index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Fichiers hachés par Vite : immuables
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Décodeurs Draco et Basis (ADR 006)
    location ~ ^/(draco|basis)/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        types { application/wasm wasm; application/javascript js; }
    }

    # index.html ne doit JAMAIS être mis en cache : il référence les fichiers hachés
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # CSP — voir EnTetesSecurite pour les pages Laravel
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://formation.exemple.fr; frame-ancestors https://formation.exemple.fr" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

> `frame-ancestors` limite qui peut embarquer le viewer — sans quoi n'importe
> quel site pourrait l'afficher sous sa propre marque.
>
> `wasm-unsafe-eval` et `worker-src blob:` sont **indispensables** : les
> décodeurs Draco et KTX2 s'exécutent dans des workers créés depuis des `blob:`.
> Une CSP écrite sans le savoir casse l'affichage des modèles compressés,
> silencieusement.

---

## 6. Assets 3D derrière un CDN

Les `.glb` sont servis par une **URL signée stable**, donc cacheables un an
(voir `AssetController`). Pour les placer derrière un CDN :

```nginx
location /api/assets/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_cache assets_3d;
    proxy_cache_valid 200 365d;
    proxy_cache_key "$request_uri";   # la signature fait partie de la clé
}
```

La signature étant incluse dans l'URL, elle participe à la clé de cache : deux
objets différents ne peuvent pas se télescoper.

---

## 7. Recette après déploiement

- [ ] `https://formation.exemple.fr/` affiche la vitrine et son QR code
- [ ] `/lecon/pompe-centrifuge-01` charge le viewer dans son iframe
- [ ] Le certificat est **valide** (pas d'avertissement)
- [ ] Sur Android, le bouton RA ouvre la caméra
- [ ] `/admin/login` accepte le compte formateur
- [ ] `/dashboard` est **refusé** aux visiteurs non authentifiés
- [ ] Une consultation complète produit 9 déclarations xAPI
- [ ] Le LRS distant reçoit bien les déclarations
- [ ] Aucune requête vers un domaine tiers dans l'onglet Réseau
- [ ] `curl -I` confirme la CSP et `Cache-Control: immutable` sur `/assets/`
- [ ] La checklist RA de [`matrice-de-tests.md`](matrice-de-tests.md) est déroulée
