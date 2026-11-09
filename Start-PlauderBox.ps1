$ErrorActionPreference = 'Stop'
$projektordner = Split-Path -Parent $MyInvocation.MyCommand.Path
$paperTrapSchluesseldatei = 'D:\Codex\Privates Beleg-Archiv\runtime\test-anmeldung-AI-Api.json'

if ([string]::IsNullOrWhiteSpace($env:PlauderBox__KI__ApiKey) -and
    [string]::IsNullOrWhiteSpace($env:PlauderBox__KI__Schluesseldatei) -and
    (Test-Path -LiteralPath $paperTrapSchluesseldatei -PathType Leaf)) {
    $env:PlauderBox__KI__Schluesseldatei = $paperTrapSchluesseldatei
}

$env:PlauderBox__Url = 'http://127.0.0.1:5187'
Write-Host 'PlauderBox startet unter http://127.0.0.1:5187' -ForegroundColor Cyan
Write-Host 'Zum Beenden Strg+C drücken.' -ForegroundColor DarkGray
dotnet run --project (Join-Path $projektordner 'src\PlauderBox.UI.csproj')

