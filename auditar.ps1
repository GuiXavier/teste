# Read-only source audit. Docs, logs, credentials and backups are not build proof.
param([string]$Raiz = $PSScriptRoot)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "scripts/native-tools.ps1")
try {
    $resolved = (Resolve-Path -LiteralPath $Raiz).Path
    Invoke-Checked -Command "node" -Arguments @((Join-Path $resolved "scripts/verify-project.cjs"), "--check")
    Write-Host "Content matches manifest. Static checks passed."
    Write-Host "This does not certify codecs, playback, TV installation or documentation claims."
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
