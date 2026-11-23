param([string]$GameData = '')
$ErrorActionPreference = 'Stop'
if ($GameData) { $env:SC4_DATA = (Resolve-Path -LiteralPath $GameData).Path }
$taskServer = Join-Path $PSScriptRoot 'server.mjs'
Start-Process -FilePath 'node' -ArgumentList ('"' + $taskServer + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Sleep -Seconds 3
Start-Process 'http://127.0.0.1:4174'
