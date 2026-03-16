# Recreate ML virtual environment and install dependencies.
# Run from server\ml: .\setup_venv.ps1
# Use this if you see "No module named 'pandas'" or the venv points to a missing Python.

$ErrorActionPreference = "Stop"
$mlDir = $PSScriptRoot
if (-not $mlDir) { $mlDir = Get-Location }

Set-Location $mlDir

# Find Python 3: prefer py -3 on Windows, then python3, then python
$pythonExe = $null
try {
    $v = & py -3 -c "import sys; print(sys.executable)" 2>$null
    if ($v) { $pythonExe = $v.Trim() }
} catch {}
if (-not $pythonExe) {
    try {
        $v = & python3 -c "import sys; print(sys.executable)" 2>$null
        if ($v) { $pythonExe = $v.Trim() }
    } catch {}
}
if (-not $pythonExe) {
    try {
        $v = & python -c "import sys; print(sys.executable)" 2>$null
        if ($v) { $pythonExe = $v.Trim() }
    } catch {}
}
if (-not $pythonExe) {
    Write-Host "Python 3 not found. Install Python 3.10+ from https://www.python.org/ and ensure 'python' or 'py' is on PATH."
    exit 1
}

Write-Host "Using: $pythonExe"
Write-Host "Removing old .venv if present..."
if (Test-Path ".venv") {
    Remove-Item -Recurse -Force .venv
}

Write-Host "Creating new virtual environment..."
& $pythonExe -m venv .venv
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$pip = Join-Path $mlDir ".venv\Scripts\pip.exe"
if (-not (Test-Path $pip)) {
    Write-Host "venv created but pip not found at $pip"
    exit 1
}

Write-Host "Installing dependencies from requirements.txt..."
& $pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Activate with: .\.venv\Scripts\Activate.ps1"
Write-Host "Then run: uvicorn app:app --host 127.0.0.1 --port 8000"
