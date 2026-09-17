# Build/deploy with content manifest. -CheckOnly never packages or contacts TV.
param([switch]$Launch, [switch]$PackageOnly, [switch]$CheckOnly, [string]$Device = "tv")
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "scripts/native-tools.ps1")
Push-Location $PSScriptRoot
try {
    if ($CheckOnly) {
        Invoke-Checked -Command "node" -Arguments @("scripts/verify-project.cjs", "--check")
        Write-Host "Static checks passed. TV execution not verified."
        exit 0
    }
    Invoke-Checked -Command "node" -Arguments @("scripts/verify-project.cjs", "--write")
    $testFiles = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "tests") -Filter "*.test.cjs" | ForEach-Object { $_.FullName })
    Invoke-Checked -Command "node" -Arguments (@("--test") + $testFiles)
    $manifest = Get-Content -LiteralPath "build-manifest.json" -Raw | ConvertFrom-Json
    $outDir = Join-Path $PSScriptRoot (".artifacts/" + $manifest.id + "-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Invoke-Checked -Command "ares-package" -Arguments @("app", "services", "-o", $outDir)
    $info = Get-Content -LiteralPath "app/appinfo.json" -Raw | ConvertFrom-Json
    $ipks = @(Get-ChildItem -LiteralPath $outDir -Filter ($info.id + "_" + $info.version + "_*.ipk"))
    if ($ipks.Count -ne 1) { throw "Expected exactly one new package for current app version" }
    $result = @{ build=$manifest.id; package=$ipks[0].FullName; sha256=(Get-FileHash -LiteralPath $ipks[0].FullName -Algorithm SHA256).Hash; installed=$false; launched=$false }
    if (-not $PackageOnly) {
        Invoke-Checked -Command "ares-install" -Arguments @("-d", $Device, $ipks[0].FullName)
        $result.installed = $true
        if ($Launch) {
            Invoke-Checked -Command "ares-launch" -Arguments @("-d", $Device, $info.id)
            $result.launched = $true
        }
    } elseif ($Launch) { throw "Use -Launch without -PackageOnly" }
    $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outDir "result.json") -Encoding UTF8
    Write-Host ("Completed requested steps. Build: " + $manifest.id)
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
} finally { Pop-Location }
