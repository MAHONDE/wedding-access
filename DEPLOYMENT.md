# Wedding Access — Guide de déploiement

## Démarrage rapide (Windows)

```powershell
# Dans le dossier Wedding Access :
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Le script vérifie Docker, configure l'environnement, construit les images et démarre tout automatiquement.

---

## Démarrage rapide (manuel)

```bash
# 1. Copier et vérifier les variables d'environnement
#    (le fichier .env est déjà pré-rempli avec des secrets générés)
cp .env.example .env   # seulement si .env n'existe pas

# 2. Lancer tous les services
#    Les migrations et le seed sont exécutés automatiquement au démarrage
docker compose up -d --build

# 3. Accéder à l'application
# http://localhost:8080
```

**Comptes par défaut** (à changer immédiatement) :
| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@wedding.local` | `Admin1234!` | Super Admin |
| `vin@wedding.local`   | `Admin1234!` | Admin Vin d'honneur |
| `diner@wedding.local` | `Admin1234!` | Agent Dîner |

---

## Prérequis

- **Docker Desktop** (Windows/Mac) ou Docker Engine + Compose v2 (Linux)
- 2 Go de RAM disponible
- Port 8080 libre (configurable via `FRONTEND_PORT` dans `.env`)

**Installer Docker Desktop :** https://www.docker.com/products/docker-desktop/

---

## Architecture

```
Navigateur → http://localhost:8080
    └── nginx (frontend)
         ├── /       → HTML/JS statique (React Babel)
         ├── /api/*  → backend NestJS :3000
         └── /stats  → WebSocket Socket.io

Backend NestJS :3000
    ├── PostgreSQL :5432 (base de données)
    └── /app/storage/ (QR codes, PDFs, monogrammes)
```

---

## Démarrage automatique au boot

```bash
# Les services ont restart: unless-stopped
# Ils redémarrent automatiquement si le serveur reboot
# Pour désactiver :
docker compose stop
```

---

## Variables d'environnement importantes

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `JWT_SECRET` | Secret JWT (96 hex chars générés) |
| `QR_SECRET` | Secret HMAC QR codes (96 hex chars générés) |
| `FRONTEND_PORT` | Port d'accès (défaut : 8080) |

---

## Sauvegardes

```bash
# Base de données
docker compose exec db pg_dump -U wa_user wedding_access > backup-$(date +%Y%m%d).sql

# Restaurer
docker compose exec -T db psql -U wa_user wedding_access < backup-20260704.sql

# Fichiers générés (QR codes, invitations PDF)
docker run --rm \
  -v wedding-access_storage_data:/data \
  -v "$(pwd):/backup" \
  alpine tar czf /backup/storage-$(date +%Y%m%d).tar.gz /data
```

---

## Mise à jour de l'application

```bash
# Tirer les dernières modifications
git pull

# Rebuild et redémarrer (les migrations s'appliquent automatiquement)
docker compose up -d --build backend
```

---

## Logs et dépannage

```bash
# Voir les logs en direct
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# État des conteneurs
docker compose ps

# Shell dans le backend
docker compose exec backend sh

# Redémarrer un service
docker compose restart backend
```

---

## HTTPS (production)

Utilisez un reverse proxy devant le frontend :

**Nginx Proxy Manager** (recommandé) : pointez vers `localhost:8080`

**Traefik** : ajoutez les labels dans `docker-compose.yml` :
```yaml
frontend:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.wa.rule=Host(`votre-domaine.com`)"
    - "traefik.http.routers.wa.tls.certresolver=letsencrypt"
```

---

## Réinitialisation complète (ATTENTION : données perdues)

```bash
docker compose down -v   # Supprime les volumes (base + fichiers)
docker compose up -d --build
```
