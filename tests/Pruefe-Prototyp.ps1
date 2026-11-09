$ErrorActionPreference = 'Stop'
$projektordner = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

dotnet build (Join-Path $projektordner 'src\PlauderBox.sln') -c Release
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Build fehlgeschlagen (Exitcode $LASTEXITCODE)." }
node --check (Join-Path $projektordner 'src\wwwroot\app.js')
if ($LASTEXITCODE -ne 0) { throw "JavaScript-Syntaxprüfung fehlgeschlagen (Exitcode $LASTEXITCODE)." }

$html = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\wwwroot\index.html')
$javascript = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\wwwroot\app.js')
$ids = [regex]::Matches($javascript, "getElementById\('([^']+)'\)") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$fehlend = @($ids | Where-Object { $html -notmatch ('id="' + [regex]::Escape($_) + '"') })
if ($fehlend.Count -gt 0) { throw "Fehlende HTML-IDs: $($fehlend -join ', ')" }

Write-Host "PlauderBox-Prüfung bestanden: Build, JavaScript und $($ids.Count) DOM-Verweise." -ForegroundColor Green
