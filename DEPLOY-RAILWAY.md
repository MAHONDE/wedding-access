# Déploiement Railway — Guide complet

Durée estimée : **20 à 30 minutes**

---

## Vue d'ensemble

```
Votre code  →  GitHub  →  Railway (backend + PostgreSQL)
                              ↕
                     index.html sur Netlify
```

---

## ÉTAPE 1 — Installer Git

1. Ouvrez : **https://git-scm.com/download/win**
2. Téléchargez et installez (options par défaut, cliquez "Next" partout)
3. Fermez et rouvrez PowerShell

---

## ÉTAPE 2 — Créer un compte GitHub

1. Ouvrez : **https://github.com/signup**
2. Créez un compte (gratuit)
3. Vérifiez votre e-mail

---

## ÉTAPE 3 — Créer le dépôt GitHub

1. Connecté sur GitHub, cliquez **"New repository"** (bouton vert)
2. Nom : `wedding-access`
3. Visibilité : **Private** (recommandé)
4. **Ne cochez rien** (pas de README, pas de .gitignore)
5. Cliquez **"Create repository"**

---

## ÉTAPE 4 — Envoyer le code sur GitHub

Ouvrez PowerShell dans le dossier `Wedding Access`, puis :

```powershell
powershell -ExecutionPolicy Bypass -File push-to-github.ps1 -GitHubUsername VOTRE_USERNAME
```

Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub.

> Une fenêtre d'authentification GitHub peut s'ouvrir — connectez-vous.

---

## ÉTAPE 5 — Créer un compte Railway

1. Ouvrez : **https://railway.app**
2. Cliquez **"Login"** → **"Login with GitHub"**
3. Autorisez Railway à accéder à GitHub

---

## ÉTAPE 6 — Créer le projet Railway

1. Sur Railway, cliquez **"New Project"**
2. Choisissez **"Deploy from GitHub repo"**
3. Sélectionnez `wedding-access`
4. Railway demande le dossier racine → tapez : **`backend`**
5. Cliquez **"Deploy Now"**

---

## ÉTAPE 7 — Ajouter PostgreSQL

Dans votre projet Railway :
1. Cliquez **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway crée automatiquement la base et injecte `DATABASE_URL`

---

## ÉTAPE 8 — Configurer les variables d'environnement

Dans le service `backend` → onglet **"Variables"**, ajoutez :

| Variable | Valeur |
|---|---|
| `JWT_SECRET` | *(copiez la valeur depuis votre fichier `.env`)* |
| `QR_SECRET` | *(copiez la valeur depuis votre fichier `.env`)* |
| `JWT_EXPIRES_IN` | `8h` |
| `STORAGE_PATH` | `/app/storage` |

> `DATABASE_URL` est injecté automatiquement par le plugin PostgreSQL — ne le touchez pas.

**Pour trouver vos secrets** : ouvrez `.env` dans le dossier `Wedding Access`.

---

## ÉTAPE 9 — Récupérer l'URL du backend

1. Dans Railway, cliquez sur le service `backend`
2. Onglet **"Settings"** → section **"Networking"**
3. Cliquez **"Generate Domain"**
4. Copiez l'URL (ex: `https://wedding-access-production.up.railway.app`)

---

## ÉTAPE 10 — Connecter le frontend au backend

Ouvrez `index.html` et modifiez les lignes 130–131 :

```javascript
window.WA_CONFIG = {
  demoMode: false,
  apiBase:  'https://wedding-access-production.up.railway.app/api'
//                   ↑ collez votre URL Railway ici
};
```

---

## ÉTAPE 11 — Redéployer sur Netlify

1. Ouvrez **https://app.netlify.com/drop**
2. Glissez-déposez le fichier `index.html` mis à jour
3. Netlify vous donne une nouvelle URL

---

## Résultat final

```
Frontend : https://votre-site.netlify.app
Backend  : https://wedding-access-production.up.railway.app
```

Connectez-vous avec :
- `admin@wedding.local` / `Admin1234!`
- `vin@wedding.local`   / `Admin1234!`
- `diner@wedding.local` / `Admin1234!`

> **Changez ces mots de passe immédiatement après la première connexion !**

---

## En cas de problème

- **Build échoue** : vérifiez les logs dans Railway → service backend → onglet "Deployments"
- **Login impossible** : vérifiez que `JWT_SECRET` et `QR_SECRET` sont bien renseignés dans Railway
- **Base vide** : le seed s'exécute automatiquement au premier démarrage via `entrypoint.sh`
