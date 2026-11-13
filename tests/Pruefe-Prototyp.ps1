$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$projektordner = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$clientordner = Join-Path $projektordner 'src\PlauderBox.UI.Client'

$paket = Get-Content -Raw -LiteralPath (Join-Path $clientordner 'package.json') | ConvertFrom-Json
[xml]$uiProjekt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\PlauderBox.UI.csproj')
$serverVersion = [string]$uiProjekt.Project.PropertyGroup.Version
if ([string]::IsNullOrWhiteSpace($paket.version) -or $paket.version -ne $serverVersion) {
  throw "Frontend- und Serverversion stimmen nicht überein: '$($paket.version)' / '$serverVersion'."
}

& (Join-Path $projektordner 'tests\Test-DockerBuildkontext.ps1')

pnpm --dir $clientordner run lint
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Lintprüfung fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run typecheck
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-TypeScript-Prüfung fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run test
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendtests fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run build
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendbuild fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run test:browser
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Browsertests fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet build (Join-Path $projektordner 'src\PlauderBox.sln') -c Release
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Build fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet test (Join-Path $projektordner 'tests\PlauderBox.Integrationstests\PlauderBox.Integrationstests.csproj') -c Release --no-build
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Integrationstests fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet test (Join-Path $projektordner 'tests\PlauderBox.Vertragstests\PlauderBox.Vertragstests.csproj') -c Release --no-build
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Vertragstests fehlgeschlagen (Exitcode $LASTEXITCODE)." }

$html = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\wwwroot\index.html')
if ($html -notmatch '<div id="app"></div>') { throw 'Vue-Einstiegspunkt fehlt im Produktionsbuild.' }
if ($html -notmatch 'manifest\.webmanifest') { throw 'PWA-Manifest fehlt im Produktionsbuild.' }

$serviceWorker = Join-Path $projektordner 'src\wwwroot\service-worker.js'
$manifest = Join-Path $projektordner 'src\wwwroot\manifest.webmanifest'
$icon = Join-Path $projektordner 'src\wwwroot\icon.svg'
if (-not (Test-Path -LiteralPath $serviceWorker)) { throw 'Service Worker fehlt im Produktionsbuild.' }
if (-not (Test-Path -LiteralPath $manifest)) { throw 'PWA-Manifestdatei fehlt im Produktionsbuild.' }
if (-not (Test-Path -LiteralPath $icon)) { throw 'PWA-Icon fehlt im Produktionsbuild.' }

$manifestDaten = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
if ($manifestDaten.display -ne 'standalone' -or $manifestDaten.start_url -ne '/') { throw 'PWA-Manifest enthält nicht den erwarteten Standalone-Start.' }

$markenKomponente = Get-Content -Raw -LiteralPath (Join-Path $clientordner 'src\components\PlauderBoxMarke.vue')
if ($markenKomponente -notmatch "iconPfad\s*=\s*'/icon\.svg'" -or $markenKomponente -notmatch '__PLAUDERBOX_VERSION__') {
  throw 'Header muss dasselbe Icon wie die PWA und die gebaute PlauderBox-Version anzeigen.'
}

$serviceWorkerInhalt = Get-Content -Raw -LiteralPath $serviceWorker
if ($serviceWorkerInhalt -notmatch "url\.pathname\.startsWith\('/api/'\)") { throw 'Service Worker muss API-Anfragen vom App-Cache ausschliessen.' }

$programInhalt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\Program.cs')
$ipv4Inhalt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\Sicherheit\Ipv4Netz.cs')
$happyHourEndpunkteInhalt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\Endpunkte\HappyHourEndpunkte.cs')
$optionenInhalt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\PlauderBoxOptionen.cs')
if ($programInhalt -notmatch '\.RemoveAllLoggers\(\)') { throw 'HappyHour-HttpClient-Logger sind nicht vollständig entfernt.' }
if ($programInhalt -notmatch 'Microsoft\.AspNetCore\.Hosting\.Diagnostics.+LogLevel\.Warning') { throw 'Hosting-Requestlogs sind nicht token-sicher begrenzt.' }
if ($ipv4Inhalt -notmatch 'praefixLaenge < 0[\s\S]+praefixLaenge > 32') { throw 'Proxy-Netzpräfix wird nicht begrenzt validiert.' }
if (($programInhalt -split "`n").Count -ge 120 -or $programInhalt.TrimEnd() -notmatch 'public partial class Program;$') { throw 'Program.cs ist nicht der geforderte Composition Root unter 120 Zeilen.' }
if ($programInhalt -match 'app\.Map(Get|Post)' -or $programInhalt -match 'catch \(HappyHour') { throw 'Program.cs enthält weiterhin Endpunkt- oder HappyHour-Fehlerlogik.' }
if ($optionenInhalt -notmatch 'MaximaleAudiodateigroesseBytes.+20L \* 1024 \* 1024' -or $optionenInhalt -notmatch 'MaximaleBilddateigroesseBytes.+15L \* 1024 \* 1024' -or $optionenInhalt -notmatch 'TranskriptionsanfragenProStunde.+60' -or $optionenInhalt -notmatch 'BildanfragenProStunde.+1000' -or $optionenInhalt -notmatch 'FreigabeabrufeProStunde.+60' -or $optionenInhalt -notmatch 'PunktuebergabenProStunde.+30' -or $optionenInhalt -notmatch 'TranskriptionenJeFreigabe.+20' -or $optionenInhalt -notmatch 'BilderJeFreigabe.+500' -or $optionenInhalt -notmatch 'MaximaleProtokollpunkteJeUebergabe.+200') { throw 'Benannte PlauderBox-Grenzwerte fehlen oder wurden verändert.' }

$liveCompose = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'deploy\olymp01-live\compose.yaml')
if ($liveCompose -notmatch 'image: plauderbox:olymp01-live-1\.1\.0-59ae459') { throw 'PlauderBox-Livecompose verweist nicht auf das dokumentierte aktive Image.' }
$testCompose = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'deploy\delphi01-test\compose.yaml')
if ($testCompose -notmatch 'ASPNETCORE_ENVIRONMENT:\s*Production') { throw 'PlauderBox-Testcompose muss produktionsnah mit ASPNETCORE_ENVIRONMENT=Production laufen.' }
if ($testCompose -match 'ASPNETCORE_ENVIRONMENT:\s*Development') { throw 'PlauderBox-Testcompose darf nicht im Development-Modus laufen.' }
if ($liveCompose -match '(?m)^\s*ports:') { throw 'PlauderBox-Livecompose darf keinen Hostport veröffentlichen.' }
if ($liveCompose -notmatch 'PlauderBox__ErlaubtesProxyNetz: 172\.22\.0\.0/24') { throw 'PlauderBox-Livecompose begrenzt das Caddy-Proxy-Netz nicht korrekt.' }
if ($liveCompose -notmatch 'PlauderBox__ErlaubterUrsprung: https://plauderbox\.routil\.ch') { throw 'PlauderBox-Liveursprung fehlt.' }
if ($liveCompose -notmatch 'PlauderBox__HappyHour__Basisadresse: https://happyhour\.siwako\.ch') { throw 'Produktive HappyHour-Basisadresse fehlt.' }
if ($liveCompose -notmatch 'name: plauderbox_proxy' -or $liveCompose -notmatch 'internal: true') { throw 'PlauderBox-Livecompose besitzt kein dediziertes internes Caddy-Netz.' }
if ($liveCompose -notmatch 'gw_priority: 1') { throw 'Das PlauderBox-Egress-Netz ist nicht als Standardgateway festgelegt.' }

$caddySnippet = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'deploy\olymp01-live\Caddyfile.snippet')
if ($caddySnippet -notmatch 'plauderbox\.routil\.ch') { throw 'Öffentliche PlauderBox-Caddy-Site fehlt.' }
if ($caddySnippet -match '(?m)^\s*log\s*\{') { throw 'PlauderBox-Caddy darf Freigabeheader nicht im Accesslog erfassen.' }
if ($caddySnippet -notmatch 'disable_http_challenge') { throw 'Caddy-Site ist nicht auf TLS-ALPN ohne Port 80 vorbereitet.' }
if ($caddySnippet -notmatch 'reverse_proxy plauderbox:5187') { throw 'Caddy-Site verwendet nicht den internen PlauderBox-Netzalias.' }
if ($caddySnippet -notmatch 'max_size 24MB') { throw 'Caddy lässt nicht genügend Multipart-Overhead für 20-MiB-Audio zu.' }
if (([regex]::Matches($happyHourEndpunkteInhalt, 'catch \(Exception ausnahme\) when \(IstHappyHourAusnahme\(ausnahme\)\)')).Count -ne 1 -or $happyHourEndpunkteInhalt -match 'catch \(HappyHour[A-Za-z]+Exception') { throw 'Die HappyHour-Ausnahmen werden nicht genau einmal zentral über den Ausnahmefilter abgebildet.' }
if ($caddySnippet -notmatch 'header_up X-Forwarded-For \{remote_host\}') { throw 'Caddy überschreibt die weitergeleitete Clientadresse nicht vertrauenswürdig.' }
if (-not (Test-Path -LiteralPath (Join-Path $projektordner 'deploy\olymp01-live\n8n-compose.plauderbox.patch'))) { throw 'Die bestandssichere Caddy-Netzanbindung ist nicht versioniert.' }

node (Join-Path $projektordner 'tests\Test-ServiceWorkerOffline.mjs')
if ($LASTEXITCODE -ne 0) { throw "Offline-App-Shell-Test fehlgeschlagen (Exitcode $LASTEXITCODE)." }

$protokollordner = Join-Path $projektordner 'tests\.temp'
New-Item -ItemType Directory -Force -Path $protokollordner | Out-Null
$stdout = Join-Path $protokollordner 'tokenlog-stdout.txt'
$stderr = Join-Path $protokollordner 'tokenlog-stderr.txt'
$freigabeToken = 'TokenLogTest_0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
$env:PlauderBox__Url = 'http://127.0.0.1:5195'
$env:PlauderBox__KI__ApiKey = 'lokaler-vertragstest'
$prozess = Start-Process dotnet -ArgumentList 'bin/Release/net10.0/PlauderBox.UI.dll' -WorkingDirectory (Join-Path $projektordner 'src') -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
try {
  Start-Sleep -Seconds 2
  try { Invoke-WebRequest "http://127.0.0.1:5195/api/happyhour/freigaben/$freigabeToken" -UseBasicParsing | Out-Null } catch { if ([int]$_.Exception.Response.StatusCode -ne 503) { throw } }
  try { Invoke-WebRequest 'http://127.0.0.1:5195/api/happyhour/freigaben/zu-kurz' -UseBasicParsing | Out-Null } catch { if ([int]$_.Exception.Response.StatusCode -ne 410) { throw } }
  $httpClient = [System.Net.Http.HttpClient]::new()
  $multipart = [System.Net.Http.MultipartFormDataContent]::new()
  $audioInhalt = [System.Net.Http.ByteArrayContent]::new([byte[]](1,2,3))
  $audioInhalt.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('audio/webm')
  $multipart.Add($audioInhalt, 'audio', 'test.webm')
  $transkriptAntwort = $httpClient.PostAsync('http://127.0.0.1:5195/api/transkribieren', $multipart).GetAwaiter().GetResult()
  if ([int]$transkriptAntwort.StatusCode -ne 401) { throw "Transkriptionsgrenze akzeptiert einen Aufruf ohne Rundgangsfreigabe: $([int]$transkriptAntwort.StatusCode)" }
  $uebergabeJson = @{
    freigabeToken = $freigabeToken
    begehungStatus = 'lokal_abgeschlossen'
    eintraege = @(@{
      erfassungsId = '00000000-0000-4000-8000-000000000123'
      vorbereiteterProtokollpunktId = $null
      protokollpunktArtId = 1
      projektAnsprechpartnerId = 77
      gruppe = 'Test'
      thema = 'Test'
      inhalt = 'Test'
      rechtsverweis = $null
    })
  } | ConvertTo-Json -Depth 5 -Compress
  $uebergabeInhalt = [System.Net.Http.StringContent]::new($uebergabeJson, [System.Text.Encoding]::UTF8, 'application/json')
  $uebergabeAntwort = $httpClient.PostAsync('http://127.0.0.1:5195/api/happyhour/protokollpunkte/uebergeben', $uebergabeInhalt).GetAwaiter().GetResult()
  if ([int]$uebergabeAntwort.StatusCode -ne 503) { throw "Schreibgrenze lieferte ohne HappyHour-Konfiguration nicht 503: $([int]$uebergabeAntwort.StatusCode)" }
  $bildMultipart = [System.Net.Http.MultipartFormDataContent]::new()
  $bildMultipart.Add([System.Net.Http.StringContent]::new($freigabeToken), 'freigabeToken')
  $bildInhalt = [System.Net.Http.ByteArrayContent]::new([byte[]](0xFF,0xD8,0xFF,0xD9))
  $bildInhalt.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('image/jpeg')
  $bildMultipart.Add($bildInhalt, 'bild', 'test.jpg')
  $bildAnfrage = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, 'http://127.0.0.1:5195/api/happyhour/protokollpunkte/41/bilder/10000000-0000-4000-8000-000000000001')
  $bildAnfrage.Headers.Add('X-PlauderBox-Freigabe', $freigabeToken)
  $bildAnfrage.Content = $bildMultipart
  $bildAntwort = $httpClient.SendAsync($bildAnfrage).GetAwaiter().GetResult()
  if ([int]$bildAntwort.StatusCode -ne 503) { throw "Bildgrenze lieferte ohne HappyHour-Konfiguration nicht 503: $([int]$bildAntwort.StatusCode)" }
  $uebergabeInhalt.Dispose()
  $multipart.Dispose()
  $httpClient.Dispose()
} finally {
  Stop-Process -Id $prozess.Id -Force -ErrorAction SilentlyContinue
  $prozess.WaitForExit()
}
$protokollinhalt = (Get-Content -Raw -LiteralPath $stdout -ErrorAction SilentlyContinue) + (Get-Content -Raw -LiteralPath $stderr -ErrorAction SilentlyContinue)
if ($protokollinhalt -match [regex]::Escape($freigabeToken)) { throw 'Freigabe-Token wurde in PlauderBox-Hosting-/HttpClient-Logs gefunden.' }
Remove-Item Env:PlauderBox__KI__ApiKey -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue
if (-not (Get-ChildItem -LiteralPath $protokollordner -Force)) { Remove-Item -LiteralPath $protokollordner -Force }

Write-Host 'PlauderBox-Prüfung bestanden: TypeScript, IndexedDB-/Vertragstests, Offline-PWA, Token-Logschutz, Vue-Build und .NET-Solution.' -ForegroundColor Green
