$ErrorActionPreference = 'Stop'
$projektordner = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$clientordner = Join-Path $projektordner 'src\PlauderBox.UI.Client'

pnpm --dir $clientordner run typecheck
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-TypeScript-Prüfung fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run test
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendtests fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run build
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendbuild fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet build (Join-Path $projektordner 'src\PlauderBox.sln') -c Release
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Build fehlgeschlagen (Exitcode $LASTEXITCODE)." }

$html = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\wwwroot\index.html')
if ($html -notmatch '<div id="app"></div>') { throw 'Vue-Einstiegspunkt fehlt im Produktionsbuild.' }

Write-Host 'PlauderBox-Prüfung bestanden: TypeScript, IndexedDB-Tests, Vue-Build und .NET-Solution.' -ForegroundColor Green
