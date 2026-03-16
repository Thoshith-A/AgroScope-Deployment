# AgroScope - Create clean ZIP for sharing (excludes node_modules, build, .idea, .vscode, logs, target, .git)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$exportDir = Join-Path $root "_zip_export"
$zipPath = Join-Path $root "AgroScope_Project_Final.zip"

Write-Host "Cleaning previous export..." -ForegroundColor Yellow
if (Test-Path $exportDir) { Remove-Item $exportDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }

Write-Host "Copying project (excluding node_modules, build, .git, etc.)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $exportDir | Out-Null
robocopy $root $exportDir /E /XD node_modules build .idea .vscode logs target .git _zip_export /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if (Test-Path (Join-Path $exportDir "_zip_export")) { Remove-Item (Join-Path $exportDir "_zip_export") -Recurse -Force }

Write-Host "Creating ZIP..." -ForegroundColor Yellow
Compress-Archive -Path (Join-Path $exportDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force

Write-Host "Cleaning up temp folder..." -ForegroundColor Yellow
Remove-Item $exportDir -Recurse -Force

$size = (Get-Item $zipPath).Length / 1MB
Write-Host "Done. Created: AgroScope_Project_Final.zip ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
