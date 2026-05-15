# Wedding Access · Script de mise en ligne sur GitHub
# Exécuter APRÈS avoir installé Git et créé le dépôt GitHub

param(
  [Parameter(Mandatory=$true)]
  [string]$GitHubUsername,

  [string]$RepoName = "wedding-access"
)

$ErrorActionPreference = "Stop"
$base = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Wedding Access · Push vers GitHub    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Git
try {
  $v = & git --version 2>&1
  Write-Host "Git : $v" -ForegroundColor Green
} catch {
  Write-Host "ERREUR : Git n'est pas installe." -ForegroundColor Red
  Write-Host "Installez Git depuis : https://git-scm.com/download/win" -ForegroundColor Yellow
  exit 1
}

Set-Location $base

# Init repo si nécessaire
if (-not (Test-Path ".git")) {
  Write-Host "Initialisation du depot Git..." -ForegroundColor Yellow
  & git init
  & git branch -M main
}

# Configurer remote
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
$existing = & git remote get-url origin 2>$null
if ($existing) {
  Write-Host "Remote origin deja configure : $existing" -ForegroundColor Gray
} else {
  Write-Host "Ajout du remote : $remoteUrl" -ForegroundColor Yellow
  & git remote add origin $remoteUrl
}

# Commit
Write-Host "Creation du commit initial..." -ForegroundColor Yellow
& git add -A
& git commit -m "Initial commit: Wedding Access"

# Push
Write-Host "Envoi vers GitHub..." -ForegroundColor Yellow
Write-Host "(Une fenetre d'authentification GitHub peut s'ouvrir)" -ForegroundColor Gray
& git push -u origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Code envoye sur GitHub !             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Votre depot : https://github.com/$GitHubUsername/$RepoName" -ForegroundColor White
Write-Host ""
Write-Host "  Prochaine etape : deployez sur Railway" -ForegroundColor Yellow
Write-Host "  Suivez le guide : DEPLOY-RAILWAY.md"   -ForegroundColor White
Write-Host ""
