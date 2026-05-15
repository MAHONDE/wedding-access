# Wedding Access · Script de déploiement Windows
# Exécuter avec : powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"
$base = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Wedding Access · Déploiement         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Vérifier Docker ──────────────────────────────────────
Write-Host "[1/5] Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = & docker --version 2>&1
    $composeVersion = & docker compose version 2>&1
    Write-Host "  Docker    : $dockerVersion" -ForegroundColor Green
    Write-Host "  Compose   : $composeVersion" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "  ERREUR : Docker n'est pas installe ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Installez Docker Desktop depuis :" -ForegroundColor Yellow
    Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host ""
    Write-Host "  Apres installation :" -ForegroundColor Yellow
    Write-Host "  1. Lancez Docker Desktop et attendez qu'il soit pret (icone verte)"
    Write-Host "  2. Relancez ce script"
    Write-Host ""
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

# ── 2. Vérifier le fichier .env ─────────────────────────────
Write-Host ""
Write-Host "[2/5] Vérification du fichier .env..." -ForegroundColor Yellow
$envFile = Join-Path $base ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "  Fichier .env introuvable, creation depuis .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $base ".env.example") $envFile
    Write-Host "  ATTENTION : Modifiez .env avec vos propres mots de passe avant de continuer !" -ForegroundColor Red
    Write-Host "  Fichier : $envFile" -ForegroundColor White
    Read-Host "  Appuyez sur Entree une fois le fichier .env configure"
}
Write-Host "  .env trouve." -ForegroundColor Green

# ── 3. Build et démarrage ───────────────────────────────────
Write-Host ""
Write-Host "[3/5] Construction et demarrage des conteneurs..." -ForegroundColor Yellow
Write-Host "  (Cela peut prendre 5-10 minutes au premier lancement)" -ForegroundColor Gray
Set-Location $base
& docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERREUR lors du demarrage des conteneurs." -ForegroundColor Red
    Write-Host "  Consultez les logs : docker compose logs" -ForegroundColor Yellow
    exit 1
}

# ── 4. Attendre que le backend soit prêt ────────────────────
Write-Host ""
Write-Host "[4/5] Attente du demarrage du backend..." -ForegroundColor Yellow
$maxWait = 90
$waited  = 0
$ready   = $false
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    try {
        $status = & docker compose ps --format json 2>$null | ConvertFrom-Json
        $backend = $status | Where-Object { $_.Service -eq "backend" }
        if ($backend -and $backend.Health -eq "healthy") {
            $ready = $true
            break
        }
    } catch {}
    Write-Host "  En attente... ($waited/$maxWait secondes)" -ForegroundColor Gray
}

if (-not $ready) {
    Write-Host "  Le backend met plus de temps que prevu. Verifiez les logs :" -ForegroundColor Yellow
    Write-Host "  docker compose logs backend" -ForegroundColor White
} else {
    Write-Host "  Backend pret !" -ForegroundColor Green
}

# ── 5. Résumé ───────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Deploiement termine !                " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Application : http://localhost:8080" -ForegroundColor Green
Write-Host ""
Write-Host "  Comptes par defaut :" -ForegroundColor Yellow
Write-Host "    admin@wedding.local  /  Admin1234!  (Super Admin)" -ForegroundColor White
Write-Host "    vin@wedding.local    /  Admin1234!  (Vin d'honneur)" -ForegroundColor White
Write-Host "    diner@wedding.local  /  Admin1234!  (Diner)" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANT : Changez ces mots de passe apres la premiere connexion !" -ForegroundColor Red
Write-Host ""
Write-Host "  Commandes utiles :" -ForegroundColor Yellow
Write-Host "    docker compose logs -f backend   # Voir les logs"
Write-Host "    docker compose restart backend   # Redemarrer"
Write-Host "    docker compose down              # Arreter"
Write-Host ""
