$ErrorActionPreference = 'Stop'
$projektordner = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PlauderBox__Url = 'http://127.0.0.1:5187'
Write-Host 'PlauderBox startet unter http://127.0.0.1:5187' -ForegroundColor Cyan
Write-Host 'Zum Beenden Strg+C drücken.' -ForegroundColor DarkGray
dotnet run --project (Join-Path $projektordner 'src\PlauderBox.UI.csproj')

