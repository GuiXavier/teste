# =====================================================================
#  corrigir.ps1 - poe cada arquivo no seu lugar
#
#  Baseado na auditoria de 09/09. Cinco arquivos foram baixados e
#  ficaram SOLTOS na raiz do projeto em vez de irem para as subpastas.
#
#  O que faz:
#    1. move os soltos para o destino correto
#    2. guarda o que for substituido em _backup\AAAAMMDD-HHMM\
#    3. remove duplicado que ja esta no lugar certo
#    4. desbloqueia tudo (mark-of-the-web)
#    5. roda a auditoria no fim
#
#  Uso:  .\corrigir.ps1              faz de verdade
#        .\corrigir.ps1 -Simular     so mostra o que faria
#
#  ASCII puro de proposito (PowerShell 5.1 le .ps1 como ANSI).
# =====================================================================
param(
  [string]$Raiz = "C:\dev\iptv\projeto",
  [switch]$Simular
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Raiz)) {
  Write-Host "Pasta nao encontrada: $Raiz" -ForegroundColor Red
  exit 1
}

$carimbo = Get-Date -Format "yyyyMMdd-HHmm"
$backup  = Join-Path $Raiz ("_backup\" + $carimbo)

# arquivo solto na raiz  ->  destino relativo
$Mover = @(
  @{ de = "ChannelList.js";  para = "app\js\ui\ChannelList.js" },
  @{ de = "Settings.js";     para = "app\js\ui\Settings.js" },
  @{ de = "tv.css";          para = "app\css\tv.css" },
  @{ de = "sourceStore.js";  para = "server\lib\sourceStore.js" },
  @{ de = "package.json";    para = "server\package.json" },
  @{ de = "api.js";          para = "app\js\api.js" },
  @{ de = "index.html";      para = "app\index.html" },
  @{ de = "server.js";       para = "server\server.js" },
  @{ de = "sources.js";      para = "server\lib\sources.js" },
  @{ de = "README.md";       para = "README.md" },
  @{ de = "app.js";          para = "app\js\app.js" },
  @{ de = "Player.js";       para = "app\js\player\Player.js" },
  @{ de = "HealthMonitor.js";para = "app\js\player\HealthMonitor.js" },
  @{ de = "probe.js";        para = "server\lib\probe.js" },
  @{ de = "enrich.js";       para = "server\lib\enrich.js" },
  @{ de = "diag.js";         para = "server\lib\diag.js" },
  @{ de = "playlist.js";     para = "server\lib\playlist.js" },
  @{ de = "config.js";       para = "server\lib\config.js" },
  @{ de = "proxy.js";        para = "server\lib\proxy.js" },
  @{ de = "validator.js";    para = "server\lib\validator.js" },
  @{ de = "tokens.css";      para = "app\css\tokens.css" },
  @{ de = "keys.js";         para = "app\js\platform\keys.js" },
  @{ de = "Log.js";          para = "app\js\platform\Log.js" },
  @{ de = "luna.js";         para = "app\js\platform\luna.js" },
  @{ de = "store.js";        para = "app\js\platform\store.js" },
  @{ de = "Spatial.js";      para = "app\js\nav\Spatial.js" },
  @{ de = "appinfo.json";    para = "app\appinfo.json" },
  @{ de = "service.js";      para = "services\service.js" },
  @{ de = "db.js";           para = "app\js\platform\db.js" },
  @{ de = "sync.js";         para = "app\js\platform\sync.js" },
  @{ de = "catalog.js";      para = "app\js\catalog.js" },
  @{ de = "services.json";   para = "services\services.json" }
)

function Titulo($t) {
  Write-Host ""
  Write-Host ("-" * 68) -ForegroundColor DarkGray
  Write-Host "  $t" -ForegroundColor Cyan
  Write-Host ("-" * 68) -ForegroundColor DarkGray
}

if ($Simular) {
  Write-Host ""
  Write-Host "  MODO SIMULACAO - nada sera alterado" -ForegroundColor Yellow
}

Titulo "MOVENDO ARQUIVOS SOLTOS"

$movidos = 0
$duplicados = 0
$ignorados = 0

foreach ($m in $Mover) {
  $origem  = Join-Path $Raiz $m.de
  if (-not (Test-Path $origem)) { continue }

  # ignora se o "solto" for na verdade o proprio destino (raiz)
  $destino = Join-Path $Raiz $m.para
  if ((Resolve-Path $origem).Path -eq $destino) { continue }

  $existe = Test-Path $destino
  $iguais = $false
  if ($existe) {
    $h1 = (Get-FileHash $origem -Algorithm MD5).Hash
    $h2 = (Get-FileHash $destino -Algorithm MD5).Hash
    $iguais = ($h1 -eq $h2)
  }

  if ($iguais) {
    Write-Host ("  duplicado  " + $m.de + "  ja identico em " + $m.para) -ForegroundColor DarkGray
    if (-not $Simular) { Remove-Item $origem -Force }
    $duplicados++
    continue
  }

  if ($existe) {
    $destBk = Join-Path $backup $m.para
    Write-Host ("  SUBSTITUI  " + $m.de.PadRight(20) + " -> " + $m.para) -ForegroundColor Yellow
    if (-not $Simular) {
      New-Item -ItemType Directory -Force -Path (Split-Path $destBk) | Out-Null
      Copy-Item $destino $destBk -Force
    }
  } else {
    Write-Host ("  novo       " + $m.de.PadRight(20) + " -> " + $m.para) -ForegroundColor Green
  }

  if (-not $Simular) {
    New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
    Move-Item $origem $destino -Force
  }
  $movidos++
}

if ($movidos -eq 0 -and $duplicados -eq 0) {
  Write-Host "  nenhum arquivo solto na raiz" -ForegroundColor DarkGray
}

# ------------------------------------------------------------------
Titulo "PASTAS OBRIGATORIAS"

$pastas = @("app\css","app\js\platform","app\js\player","app\js\nav","app\js\ui","server\lib","services\lib")
foreach ($p in $pastas) {
  $full = Join-Path $Raiz $p
  if (-not (Test-Path $full)) {
    Write-Host ("  criando   " + $p) -ForegroundColor Green
    if (-not $Simular) { New-Item -ItemType Directory -Force -Path $full | Out-Null }
  }
}
Write-Host "  ok" -ForegroundColor DarkGray

# ------------------------------------------------------------------
Titulo "MARK-OF-THE-WEB"

if (-not $Simular) {
  Get-ChildItem $Raiz -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
  Write-Host "  todos os arquivos desbloqueados" -ForegroundColor Green
} else {
  Write-Host "  (seria desbloqueado)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------------
Titulo "RESUMO"
Write-Host ("  movidos    : " + $movidos)
Write-Host ("  duplicados removidos : " + $duplicados)
if ($movidos -gt 0 -and -not $Simular) {
  Write-Host ("  backup em  : _backup\" + $carimbo) -ForegroundColor DarkGray
}

Write-Host ""
if ($Simular) {
  Write-Host "  Rode sem -Simular para aplicar." -ForegroundColor Yellow
} else {
  Write-Host "  Rodando a auditoria..." -ForegroundColor Cyan
  $aud = Join-Path $Raiz "auditar.ps1"
  if (Test-Path $aud) { & $aud -Raiz $Raiz }
  else { Write-Host "  auditar.ps1 nao encontrado nesta pasta." -ForegroundColor Yellow }
}
