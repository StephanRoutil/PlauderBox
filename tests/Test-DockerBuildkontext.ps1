$ErrorActionPreference = 'Stop'
$projektordner = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dockerfilePfad = Join-Path $projektordner 'Dockerfile'
$dockerignorePfad = Join-Path $projektordner '.dockerignore'
$clientLogikPfad = Join-Path $projektordner 'src\PlauderBox.Logik\Client'

$dockerfile = Get-Content -Raw -LiteralPath $dockerfilePfad
$logikCopy = 'COPY src/PlauderBox.Logik/Client/ /quelle/src/PlauderBox.Logik/Client/'
$copyPosition = $dockerfile.IndexOf($logikCopy, [StringComparison]::Ordinal)
$buildPosition = $dockerfile.IndexOf('RUN pnpm run build', [StringComparison]::Ordinal)
if ($copyPosition -lt 0) { throw 'Docker-Frontendstage kopiert die externe TypeScript-Logikschicht nicht an den von @logik erwarteten Pfad.' }
if ($buildPosition -lt 0 -or $copyPosition -gt $buildPosition) { throw 'Die TypeScript-Logikschicht muss vor dem Frontendbuild im Docker-Stage verfügbar sein.' }

$logikDateien = @(Get-ChildItem -LiteralPath $clientLogikPfad -Filter '*.ts' -File)
if ($logikDateien.Count -eq 0) { throw 'Die produktive TypeScript-Logikschicht enthält keine Builddateien.' }

$dockerignore = Get-Content -Raw -LiteralPath $dockerignorePfad
if ($dockerignore -match '(?m)^\s*src/PlauderBox\.Logik(?:/Client)?/?\s*$') { throw '.dockerignore schliesst die TypeScript-Logikschicht aus dem Docker-Buildkontext aus.' }

$tsconfig = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\PlauderBox.UI.Client\tsconfig.app.json')
$vite = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\PlauderBox.UI.Client\vite.config.ts')
if ($tsconfig -notmatch '"@logik/\*"\s*:\s*\["\.\./PlauderBox\.Logik/Client/\*"\]') { throw 'TypeScript-@logik-Alias entspricht nicht dem geprüften Dockerpfad.' }
if ($vite -notmatch "new URL\('\.\./PlauderBox\.Logik/Client', import\.meta\.url\)") { throw 'Vite-@logik-Alias entspricht nicht dem geprüften Dockerpfad.' }

Write-Host "Docker-Buildkontext geprüft: $($logikDateien.Count) TypeScript-Logikdatei(en) stehen vor dem Frontendbuild bereit." -ForegroundColor Green
