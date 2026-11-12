$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$projektordner = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$clientordner = Join-Path $projektordner 'src\PlauderBox.UI.Client'

& (Join-Path $projektordner 'tests\Test-DockerBuildkontext.ps1')

pnpm --dir $clientordner run typecheck
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-TypeScript-Prüfung fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run test
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendtests fehlgeschlagen (Exitcode $LASTEXITCODE)." }
pnpm --dir $clientordner run build
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Frontendbuild fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet build (Join-Path $projektordner 'src\PlauderBox.sln') -c Release
if ($LASTEXITCODE -ne 0) { throw "PlauderBox-Build fehlgeschlagen (Exitcode $LASTEXITCODE)." }

dotnet run --project (Join-Path $projektordner 'tests\PlauderBox.Vertragstests\PlauderBox.Vertragstests.csproj') -c Release --no-build
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

$serviceWorkerInhalt = Get-Content -Raw -LiteralPath $serviceWorker
if ($serviceWorkerInhalt -notmatch "url\.pathname\.startsWith\('/api/'\)") { throw 'Service Worker muss API-Anfragen vom App-Cache ausschliessen.' }

$programInhalt = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'src\Program.cs')
if ($programInhalt -notmatch '\.RemoveAllLoggers\(\)') { throw 'HappyHour-HttpClient-Logger sind nicht vollständig entfernt.' }
if ($programInhalt -notmatch 'Microsoft\.AspNetCore\.Hosting\.Diagnostics.+LogLevel\.Warning') { throw 'Hosting-Requestlogs sind nicht token-sicher begrenzt.' }
if ($programInhalt -notmatch 'IstAdresseInIpv4Netz\(context\.Connection\.RemoteIpAddress!?, erlaubtesProxyNetz\)') { throw 'Produktiver Proxyzugriff ist nicht auf das konfigurierte IPv4-Netz begrenzt.' }
if ($programInhalt -notmatch 'praefixLaenge < 0 \|\| praefixLaenge > 32') { throw 'Proxy-Netzpräfix wird nicht begrenzt validiert.' }

$liveCompose = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'deploy\olymp01-live\compose.yaml')
if ($liveCompose -match '(?m)^\s*ports:') { throw 'PlauderBox-Livecompose darf keinen Hostport veröffentlichen.' }
if ($liveCompose -notmatch 'PlauderBox__ErlaubtesProxyNetz: 172\.22\.0\.0/24') { throw 'PlauderBox-Livecompose begrenzt das Caddy-Proxy-Netz nicht korrekt.' }
if ($liveCompose -notmatch 'PlauderBox__ErlaubterUrsprung: https://plauderbox\.routil\.ch') { throw 'PlauderBox-Liveursprung fehlt.' }
if ($liveCompose -notmatch 'PlauderBox__HappyHour__Basisadresse: https://test\.siwako\.ch') { throw 'HappyHour-Basisadresse für die produktionsnahe Integrationsprüfung fehlt.' }
if ($liveCompose -notmatch 'name: plauderbox_proxy' -or $liveCompose -notmatch 'internal: true') { throw 'PlauderBox-Livecompose besitzt kein dediziertes internes Caddy-Netz.' }
if ($liveCompose -notmatch 'gw_priority: 1') { throw 'Das PlauderBox-Egress-Netz ist nicht als Standardgateway festgelegt.' }

$caddySnippet = Get-Content -Raw -LiteralPath (Join-Path $projektordner 'deploy\olymp01-live\Caddyfile.snippet')
if ($caddySnippet -notmatch 'plauderbox\.routil\.ch') { throw 'Öffentliche PlauderBox-Caddy-Site fehlt.' }
if ($caddySnippet -match '(?m)^\s*log\s*\{') { throw 'PlauderBox-Caddy darf Freigabeheader nicht im Accesslog erfassen.' }
if ($caddySnippet -notmatch 'disable_http_challenge') { throw 'Caddy-Site ist nicht auf TLS-ALPN ohne Port 80 vorbereitet.' }
if ($caddySnippet -notmatch 'reverse_proxy plauderbox:5187') { throw 'Caddy-Site verwendet nicht den internen PlauderBox-Netzalias.' }
if ($caddySnippet -notmatch 'max_size 24MB') { throw 'Caddy lässt nicht genügend Multipart-Overhead für 20-MiB-Audio zu.' }
if ($programInhalt -notmatch 'X-PlauderBox-Freigabe') { throw 'Öffentliche KI- und Bildaufrufe sind nicht an den Freigabeheader gebunden.' }
if ($programInhalt -notmatch 'await freigabeQuelle\.LadeAsync\(freigabe\.Wert, token\)') { throw 'Die Transkription validiert die Rundgangsfreigabe nicht serverseitig gegen HappyHour.' }
if ($programInhalt -notmatch '!istLoopbackQuelle && !istKonfigurierterUrsprung') { throw 'Öffentliche POST-Aufrufe ohne passenden Origin werden nicht abgewiesen.' }
if ($programInhalt -notmatch 'LadeQuellPartition\(context, erlaubtesProxyNetz\)') { throw 'Vorgelagerte Ratenlimits sind nicht an die von Caddy bestätigte Clientquelle gebunden.' }
if ($programInhalt -notmatch 'ReserviereFreigabeKontingent\(freigabeKontingente, freigabeKontingentSperre') { throw 'Nachgelagerte Kontingente für bestätigte Rundgangsfreigaben fehlen.' }
if ($programInhalt.IndexOf('await freigabeQuelle.LadeAsync(headerFreigabe.Wert, token)') -gt $programInhalt.IndexOf('formular = await request.ReadFormAsync(token)')) { throw 'Die Bildfreigabe wird erst nach dem Einlesen des Multipart-Bodys validiert.' }
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
