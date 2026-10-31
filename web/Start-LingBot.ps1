$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $studioRoot
$runtimeDir = Join-Path $studioRoot 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    $node = (Get-Command node -ErrorAction Stop).Source
    $process = Start-Process -FilePath $node -ArgumentList 'server.mjs' -WorkingDirectory $studioRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $runtimeDir 'server.pid')
}
Start-Process 'http://127.0.0.1:8787'
