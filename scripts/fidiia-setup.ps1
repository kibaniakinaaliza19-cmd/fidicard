# FidiIA - configuration OpenAI sous Windows (PowerShell)
#
#   1. liste les modeles auxquels VOTRE cle donne acces
#   2. vous en choisissez un
#   3. ecrit .env.local
#
# La cle n'est jamais affichee a l'ecran ni enregistree dans l'historique
# PowerShell : elle est saisie masquee. .env.local est gitignore.
#
#   Utilisation :  .\scripts\fidiia-setup.ps1
#
# Si Windows refuse d'executer le script :
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# On se place a la racine du projet, quel que soit le dossier courant.
$racine = Split-Path -Parent $PSScriptRoot
Set-Location $racine
Write-Host "Projet : $racine`n" -ForegroundColor DarkGray

# --- verifications minimales ------------------------------------------------

if (-not (Test-Path "package.json")) {
    throw "package.json introuvable. Ce script doit vivre dans le dossier scripts\ du projet."
}

$noeud = (node --version) 2>$null
if (-not $noeud) { throw "Node n'est pas installe, ou pas dans le PATH." }

# Le type-stripping natif utilise ici demande Node 22 ou plus.
$majeur = [int](($noeud -replace '^v', '') -split '\.')[0]
if ($majeur -lt 22) {
    throw "Node $noeud detecte. Il en faut au moins la version 22."
}
Write-Host "Node $noeud" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules absent - installation..." -ForegroundColor Yellow
    npm install
}

# --- la cle -----------------------------------------------------------------

$secure = Read-Host "Votre cle OpenAI (saisie masquee)" -AsSecureString
$cle = [System.Net.NetworkCredential]::new("", $secure).Password

if ([string]::IsNullOrWhiteSpace($cle)) { throw "Aucune cle saisie." }

# Pour cette session PowerShell uniquement : rien n'est encore ecrit sur le
# disque. Si vous fermez la fenetre maintenant, il ne reste aucune trace.
$env:OPENAI_API_KEY = $cle

# --- 1. lister les modeles reellement accessibles ---------------------------

Write-Host "`nModeles accessibles avec cette cle :`n" -ForegroundColor Cyan
npm run --silent fidiia:modeles
if ($LASTEXITCODE -ne 0) { throw "L'appel a echoue. Cle invalide, ou pas d'acces reseau." }

# --- 2. choisir ------------------------------------------------------------

Write-Host ""
$modele = Read-Host "Identifiant EXACT du modele a utiliser (copie depuis la liste ci-dessus)"
if ([string]::IsNullOrWhiteSpace($modele)) {
    Write-Host "Aucun modele choisi. Rien n'a ete ecrit." -ForegroundColor Yellow
    return
}
$modele = $modele.Trim()

# --- 3. ecrire .env.local ---------------------------------------------------

$chemin = Join-Path $racine ".env.local"

# On conserve les lignes deja presentes qui ne concernent pas FidiIA/OpenAI,
# pour ne pas effacer une configuration Supabase existante.
$gardees = @()
if (Test-Path $chemin) {
    $copie = "$chemin.sauvegarde"
    Copy-Item $chemin $copie -Force
    Write-Host "Sauvegarde de l'ancien fichier : $copie" -ForegroundColor DarkGray
    $gardees = Get-Content $chemin | Where-Object {
        $_ -notmatch '^\s*(OPENAI_API_KEY|FIDIIA_PROVIDER|FIDIIA_OPENAI_MODEL)\s*='
    }
}

$lignes = @()
$lignes += $gardees
$lignes += ""
$lignes += "FIDIIA_PROVIDER=openai"
$lignes += "OPENAI_API_KEY=$cle"
$lignes += "FIDIIA_OPENAI_MODEL=$modele"

# UTF-8 SANS BOM, et fins de ligne Unix : c'est ce qu'attend un fichier .env.
# Set-Content -Encoding utf8 ajoute un BOM sous Windows PowerShell 5.1.
$utf8SansBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($chemin, (($lignes -join "`n").Trim() + "`n"), $utf8SansBom)

Write-Host "`n.env.local ecrit." -ForegroundColor Green
Write-Host "Contenu (cle masquee) :" -ForegroundColor DarkGray
Get-Content $chemin | ForEach-Object {
    if ($_ -match '^\s*OPENAI_API_KEY\s*=') { "  OPENAI_API_KEY=***masquee***" } else { "  $_" }
}

# --- verification -----------------------------------------------------------

Write-Host "`nVerification : .env.local est-il bien ignore par git ?" -ForegroundColor Cyan

# Un code de sortie non nul est ici une reponse, pas une panne : on desactive
# l'arret automatique le temps de ces deux appels.
$avant = $ErrorActionPreference
$ErrorActionPreference = "Continue"

git check-ignore -q .env.local 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  oui, .env.local est ignore par git." -ForegroundColor Green
} else {
    Write-Host "  ATTENTION : .env.local n'est PAS ignore par git." -ForegroundColor Red
    Write-Host "  Ne commitez rien avant d'avoir corrige .gitignore." -ForegroundColor Red
}

Write-Host "`nTests :" -ForegroundColor Cyan
npm test --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "Des tests echouent. La configuration est ecrite, mais verifiez avant d'aller plus loin." -ForegroundColor Yellow
}

$ErrorActionPreference = $avant

Write-Host "`nTermine. FidiIA est branche sur $modele." -ForegroundColor Green
Write-Host "Lancez l'application avec :  npm run dev" -ForegroundColor DarkGray
