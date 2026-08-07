# Déploiement — rarv.kodemeet.com

> Hébergement mutualisé (cPanel/Plesk) · MySQL · un domaine, deux modules par
> chemins. Plateforme mutualisée : **un backend, une base, deux fronts**.

---

## 0. Ce qu'il faut vérifier chez l'hébergeur AVANT tout

Cinq points. Si l'un manque, le déploiement est bloqué — autant le savoir maintenant.

| # | À vérifier | Pourquoi | Où |
|:--:|---|---|---|
| 1 | **PHP ≥ 8.3** | Exigé par `composer.json` | *Sélecteur de version PHP* |
| 2 | **Terminal ou SSH** | Sans lui, impossible de lancer les migrations — voir §7 | *Terminal* / *Accès SSH* |
| 3 | **Racine de document modifiable** | Le `.env` doit rester hors du web | *Sous-domaines* |
| 4 | **Tâches cron** | Rejeu des déclarations xAPI en échec | *Tâches Cron* |
| 5 | **SSL / Let's Encrypt** | ⚠️ **Sans HTTPS valide, la RA ne démarre pas** | *SSL/TLS Status* |

**Extensions PHP requises** : `pdo_mysql` · `mbstring` · `openssl` · `tokenizer`
`xml` · `dom` · `ctype` · `curl` · `fileinfo` · `zip` · `bcmath`

> Le point 5 n'est pas négociable. WebXR exige un contexte sécurisé, et le
> navigateur refuse sans dérogation possible — pas d'avertissement à accepter,
> pas de mode développeur. Un certificat auto-signé ou expiré tue la RA.

---

## 1. Architecture cible

```
/home/<compte>/
├── rarv-app/                    ← application, HORS du web
│   ├── .env                     ← secrets : jamais accessibles par URL
│   ├── app/  bootstrap/  config/  database/
│   ├── resources/  routes/  vendor/
│   ├── storage/
│   │   └── app/assets3d/        ← modèles 3D, servis par contrôleur
│   └── public/                  ← RACINE du sous-domaine
│       ├── index.php  .htaccess
│       ├── viewer/              ← module « viewer-ra »   (Projet 01)
│       └── labo/                ← module « labo-formation » (Projet 02)
└── public_html/                 ← inchangé, autre site
```

**Le point important** : la racine du sous-domaine pointe sur `rarv-app/public`,
pas sur `rarv-app`. Sinon `.env`, `vendor/` et `storage/` deviennent
téléchargeables par n'importe qui. C'est la faute de déploiement Laravel la
plus répandue.

| URL | Sert |
|---|---|
| `https://rarv.kodemeet.com/` | Vitrine, leçons, back-office, tableau de bord, API |
| `https://rarv.kodemeet.com/viewer/` | Viewer RA |
| `https://rarv.kodemeet.com/labo/` | Labo de formation |

Tout est sur la **même origine** : aucun CORS, un seul certificat.

---

## 2. Fabriquer le paquet, sur votre machine

Node et Composer n'existent pas sur un mutualisé : tout se construit ici.

```bash
node scripts/preparer-deploiement.mjs
```

Produit `deploiement/rarv-app/` :

| Élément | Poids |
|---|--:|
| `vendor/` | 54,6 Mo |
| Viewer RA | 4,5 Mo |
| Assets 3D | 0,2 Mo |
| **Total** | **≈ 64 Mo** |

Le script écarte automatiquement **5,7 Mo** de décors de l'émulateur WebXR,
jamais chargés en production.

Compressez ensuite `rarv-app/` en ZIP : téléverser un fichier de 64 Mo est
autrement plus fiable que 15 000 fichiers en FTP.

```powershell
Compress-Archive -Path deploiement\rarv-app -DestinationPath deploiement\rarv-app.zip
```

---

## 3. Créer le sous-domaine

*cPanel → Domaines → Créer un domaine*

| Champ | Valeur |
|---|---|
| Domaine | `rarv.kodemeet.com` |
| Racine de document | `/home/<compte>/rarv-app/public` |

Décochez « Partager la racine de document avec… ».

Vérifiez ensuite le DNS : un enregistrement **A** pour `rarv` vers l'IP du
serveur. La propagation prend de quelques minutes à quelques heures.

---

## 4. Créer la base de données

*cPanel → Bases de données MySQL*

1. Base : `rarv` → devient `<compte>_rarv`
2. Utilisateur : `rarv` → devient `<compte>_rarv`
3. Mot de passe : **généré, 24 caractères minimum**
4. Ajouter l'utilisateur à la base, **TOUS LES PRIVILÈGES**

> Une seule base pour les deux modules. `view_sessions`, `session_events`,
> `xapi_statements` et les jetons sont partagés — c'est ce qui permet à un
> apprenant de suivre les deux modules sous une même traçabilité.

---

## 5. Téléverser

*cPanel → Gestionnaire de fichiers*

1. Se placer dans `/home/<compte>/`
2. Téléverser `rarv-app.zip`
3. **Extraire** (le gestionnaire le fait, bien plus vite qu'un FTP)
4. Supprimer le ZIP

**Permissions** — deux dossiers doivent être inscriptibles par PHP :

```
storage/            → 755  (récursif)
bootstrap/cache/    → 755
```

Si l'hébergeur exécute PHP sous un autre utilisateur, passez-les à `775`.
Ne mettez **jamais** `777` : cela rend les fichiers modifiables par tous les
comptes du serveur mutualisé.

---

## 6. Configurer l'environnement

```bash
cd ~/rarv-app
mv .env.example .env
```

Éditez `.env` — le modèle est commenté ligne à ligne. Les valeurs à remplir :

```dotenv
APP_KEY=                # généré à l'étape suivante
DB_DATABASE=<compte>_rarv
DB_USERNAME=<compte>_rarv
DB_PASSWORD=…
RARV_LMS_SECRET=…       # php -r "echo bin2hex(random_bytes(24));"
RARV_DASHBOARD_SECRET=…
MAIL_HOST=… MAIL_USERNAME=… MAIL_PASSWORD=…
```

```bash
php artisan key:generate
```

> ⚠️ `RARV_XAPI_IRI` est **à figer définitivement** avant la première
> consultation réelle. C'est la clé qui relie les déclarations xAPI entre
> elles : la changer plus tard couperait le lien avec tout l'historique déjà
> transmis au LRS.

---

## 7. Initialiser la base

Depuis le **Terminal cPanel**, dans `~/rarv-app` :

```bash
php artisan migrate --force
php artisan db:seed --force
```

Le seeder crée les deux modules de démonstration et un compte formateur.

### Sans Terminal ni SSH

C'est le seul point réellement bloquant du mutualisé. Trois options, par ordre
de préférence :

1. **Demander l'activation de SSH** à l'hébergeur — accordé dans la journée chez la plupart
2. Utiliser le **planificateur de tâches** : créer un cron ponctuel exécutant `php ~/rarv-app/artisan migrate --force`, puis le supprimer
3. En dernier recours : générer le SQL sur une base MySQL locale et l'importer par phpMyAdmin

> N'exposez **jamais** une route web qui lance les migrations, même protégée
> par un jeton. C'est une porte d'exécution arbitraire sur votre base ; le jour
> où on oublie de la retirer, elle reste.

---

## 8. Mettre en cache la configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Divise le temps de réponse par deux sur un mutualisé, où le disque est lent.

> ⚠️ **À relancer après chaque modification du `.env`.** Une fois la
> configuration mise en cache, Laravel ignore le fichier — modifier `.env`
> sans reconstruire le cache ne produit aucun effet, et c'est très
> déroutant à diagnostiquer.

---

## 9. Programmer le rejeu xAPI

*cPanel → Tâches Cron* — toutes les 5 minutes :

```
*/5 * * * * cd /home/<compte>/rarv-app && /usr/local/bin/php artisan rarv:xapi:rejouer >> storage/logs/xapi.log 2>&1
```

Les déclarations sont **enregistrées avant d'être envoyées** : un LRS
injoignable ne fait rien perdre, cette tâche réémet ce qui a échoué.

Le chemin de PHP varie selon les hébergeurs — `which php` le donne. Vérifiez
qu'il correspond bien à PHP 8.3.

---

## 10. Activer HTTPS

*cPanel → SSL/TLS Status* → **Run AutoSSL** sur `rarv.kodemeet.com`.

Puis forcez la redirection : *Domaines → Forcer la redirection HTTPS*.

Le code force déjà le schéma `https` en production — sans quoi les URL
**signées** des modèles 3D seraient calculées en `http` puis appelées en
`https`, la signature ne correspondrait plus, et tous les modèles renverraient
403. Symptôme classique du premier déploiement.

---

## 11. Recette

À dérouler dans l'ordre. Chaque ligne échouée pointe une cause précise.

| # | Contrôle | Attendu | Si ça échoue |
|:--:|---|---|---|
| 1 | `https://rarv.kodemeet.com/api/ping` | JSON, `"env":"production"` | Racine de document ou permissions |
| 2 | Cadenas dans la barre d'adresse | Certificat valide | AutoSSL pas encore passé |
| 3 | `…/.env` dans le navigateur | **404 ou 403** | 🔴 Racine mal placée — corriger immédiatement |
| 4 | Page d'accueil | Vitrine avec QR code | Cache de vues |
| 5 | `…/lecon/pompe-centrifuge-01` | Leçon + viewer dans son cadre | `RARV_VIEWER_URL` |
| 6 | Le modèle 3D s'affiche | Pompe visible | Types MIME `.glb`, ou URL signées (§10) |
| 7 | `…/viewer/` en direct | Viewer plein écran | `.htaccess` de `public/viewer/` |
| 8 | `…/viewer/ar/test123456789012345` | Message « lien expiré », **pas un 404 Laravel** | Repli SPA du `.htaccess` |
| 9 | Les 5 annotations s'ouvrent | Fiches lisibles | API ou base |
| 10 | `…/admin/login` puis connexion | Back-office | Sessions en base |
| 11 | `…/dashboard` sans être connecté | Redirection vers la connexion | Middleware `auth` |
| 12 | **Sur Android** : bouton RA actif | Session RA démarre | HTTPS, ou WebXR indisponible |
| 13 | Fermer l'onglet puis consulter le tableau de bord | Déclarations xAPI présentes | Cron, ou pilote LRS |

> Le **contrôle 3 est le plus important**. Si `.env` est téléchargeable, vos
> identifiants de base et vos secrets sont publics. Vérifiez-le avant toute
> mise en ligne réelle.

---

## 12. Si la racine de document ne peut pas être changée

Certains hébergements imposent `public_html/rarv/`. Dans ce cas, placez
l'application dans `public_html/rarv/` et ajoutez ce `.htaccess` **à sa
racine** :

```apache
# Redirige tout vers public/ sans exposer le reste de l'application.
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>

# Ceinture et bretelles : refuse l'accès aux fichiers sensibles même si la
# règle ci-dessus est un jour désactivée.
<FilesMatch "^(\.env|composer\.(json|lock)|artisan)$">
    Require all denied
</FilesMatch>
```

C'est une solution **dégradée** : l'application reste sous la racine web, et
seule une règle Apache la protège. Préférez toujours une racine de document
dédiée.

---

## 13. Mises à jour ultérieures

```bash
# Sur votre machine
node scripts/preparer-deploiement.mjs

# Sur le serveur, avant de remplacer les fichiers
php artisan down

# … téléverser, puis :
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan up
```

**Ne remplacez jamais** `.env`, `storage/app/assets3d/` ni `storage/logs/` :
ils contiennent respectivement vos secrets, les modèles 3D téléversés par les
formateurs, et l'historique.

---

## 14. Ce qui reste à faire après la mise en ligne

- [ ] Changer le mot de passe du compte formateur de démonstration
- [ ] Régénérer le QR de la vitrine sur la vraie URL :
      `node scripts/generer-qr-demo.mjs https://rarv.kodemeet.com/lecon/pompe-centrifuge-01`
- [ ] Dérouler la checklist RA sur Android — [`matrice-de-tests.md`](matrice-de-tests.md)
- [ ] Enregistrer la vidéo de démonstration de 60 s
- [ ] Brancher un vrai LRS si besoin (`RARV_LRS_DRIVER=http`)
