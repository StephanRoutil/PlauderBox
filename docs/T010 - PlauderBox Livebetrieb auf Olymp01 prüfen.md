# T010 – PlauderBox-Livebetrieb auf Olymp01 prüfen

## Prüfziel

Nachweis der isolierten, öffentlich vertrauenswürdigen Live-Bereitstellung, ohne Delphi01, n8n, FileBox oder deren Datenbanken zu beeinträchtigen.

## Prüfschritte

1. Vollständigen lokalen PlauderBox-Prüflauf bestehen.
2. Vorher-Sicherung von Caddy-/Compose-Konfiguration erstellen.
3. Die aktive n8n-Compose-Datei kopieren, die versionierte Erweiterung `deploy/olymp01-live/n8n-compose.plauderbox.patch` anwenden und den vollständigen Compose-Kandidaten mit `docker compose config` validieren.
4. PlauderBox-Image bauen und ohne Hostport starten.
5. Root, Manifest, Service Worker, Produktionsassets und `/api/status` intern prüfen.
6. Öffentliches TLS-Zertifikat, SAN, HTTPS 200 und Security Header prüfen.
7. Nachweisen, dass nur der bestehende öffentliche TCP-Port 443 verwendet wird.
8. Containerstatus und Logs von PlauderBox prüfen; keine Tokens, Audiodaten, Bilder oder Schlüssel dürfen erscheinen.
9. n8n-Readiness, FileBox-Startseite und unveränderte Container-/Datenbankzustände nachweisen.
10. Produktiven HappyHour-Vertrag separat prüfen; fehlende Freigabe ausdrücklich als offenes Gate dokumentieren.
11. Transkriptionsaufrufe ohne Freigabeheader, mit ungültigem Token, ohne öffentlichen Origin und aus einem fremden Docker-Netz negativ prüfen.
12. Dediziertes Proxy-Netz, Egress-Gateway-Priorität und 24-MB-Caddygrenze gegen die 20-MiB-Audiogrenze nachweisen.
13. Nachweisen, dass Caddy in der aktiven Compose-Datei dauerhaft dem externen Netz `plauderbox_proxy` zugeordnet ist und der gesicherte Rückfall die Zuordnung wieder entfernen kann.

## Status

Live-Infrastruktur und produktive technische Anbindung an `happyhour.siwako.ch` bestanden. Der fachliche Mobil- und HappyHour-End-to-End-Nachweis mit einer realen produktiven Freigabe bleibt offen.

## Ergebnis vom 11.11.2026

- Der vollständige lokale Prüflauf bestand mit 67 Frontendtests, Vue-Produktionsbuild, .NET-Build ohne Warnungen oder Fehler, Vertrags-, Offline-PWA- und Tokenlogprüfung.
- Der Quality-Agent erteilte nach Schliessung der Sicherheits- und Dokumentationsbefunde die Freigabe ohne verbleibenden P1-, P2- oder P3-Befund.
- Die aktiven Caddy-/Compose-Dateien wurden unter `/srv/backup/plauderbox/20261111T151138Z` gesichert. PlauderBox-, n8n-Compose- und Caddy-Kandidaten wurden vor der Aktivierung erfolgreich validiert.
- `plauderbox:olymp01-live-20261111-r4` läuft als Benutzer `1000:1000`, mit schreibgeschütztem Root-Dateisystem, ohne Privilegien, ohne Capabilities und ohne Hostport. Speicher- und CPU-Limits sind aktiv.
- Im dedizierten Netz `plauderbox_proxy` befinden sich nur PlauderBox und Caddy. Der PlauderBox-Standardweg führt über das getrennte Egress-Netz.
- Das Let's-Encrypt-Zertifikat nennt `plauderbox.routil.ch`. Root, `/api/status`, Manifest und Service Worker antworteten öffentlich mit 200; HSTS, CSP, Permissions Policy, Frame-, MIME- und Referrer-Schutz waren vorhanden.
- POST ohne zulässigen Origin ergab 403; Transkription mit zulässigem Origin, aber ohne Freigabetoken ergab 401.
- Ein Transkriptionsaufruf mit korrektem Origin und formal gültigem, aber nicht existierendem Freigabetoken ergab 410. Damit wurde der Request vor Bodyverarbeitung und KI-Aufruf abgewiesen.
- Ein direkter Aufruf der PlauderBox-IP aus dem n8n-Container als fremdem Docker-Netz erreichte die Anwendung innerhalb des Drei-Sekunden-Zeitfensters nicht und endete mit `BLOCKIERT`.
- Ein automatisierter Scan der PlauderBox-Live-Logs der letzten 30 Minuten auf Freigabeheader/-felder, Autorisierungsheader, Bearer-/Schlüsselmuster, Schlüsseldateiname sowie Audio- und Bildbezeichnungen ergab `SENSIBLE_LOGTREFFER=0`. Es wurden nur Status-, Routing- und statische Dateiinformationen protokolliert.
- Der erste reale Mobiltest deckte danach einen getrennten Caddy-Befund auf: Der site-spezifische Accesslog erfasste den benutzerdefinierten Freigabeheader. Das PlauderBox-Accesslogging wurde aus aktiver und versionierter Caddy-Konfiguration entfernt, Caddy gezielt neu erstellt und die übrigen Dienste mit HTTP 200 nachgeprüft. Ein erneuter Zugriff erzeugte keine PlauderBox-Accesslogzeile. Der betroffene Token gilt als offengelegt und muss vor dem nächsten Test widerrufen werden.
- Die aktive und mit Caddy validierte Grenze beträgt 24 MB beziehungsweise 24.000.000 Byte. Die im vollständigen Prüflauf nachgewiesene App-Grenze beträgt 20 MiB beziehungsweise 20.971.520 Byte; damit bleiben 3.028.480 Byte Reserve für Multipart-Overhead. Ein Body-Lauf mit gültiger produktiver Freigabe ist wegen des noch offenen HappyHour-Gates nicht möglich; ein erfundener Token wird absichtlich vor dem Body-Lesen abgewiesen. Der Grenznachweis stützt sich deshalb auf die validierte aktive Caddy-Konfiguration und die automatisiert geprüfte App-Grenze, nicht auf einen behaupteten produktiven Audio-Upload.
- n8n und FileBox antworteten nach der Umschaltung weiterhin mit 200. Ihre Anwendungs- und Datenbankcontainer behielten ihre vorherigen Container-IDs; nur Caddy wurde gezielt neu erstellt, weil `admin off` einen Reload ausschliesst.
- Der produktive HappyHour-PlauderBox-Endpunkt antwortete auf den Dummy-Freigabeabruf weiterhin mit 302 zur Anmeldung. QR-Kontext, Punkt- und Bildübergabe bleiben deshalb bis zur separaten HappyHour-Veröffentlichung und End-to-End-Abnahme offen.

## Ergänzung vom 12.11.2026

- Stephan Routil veröffentlichte den neuen HappyHour-Teststand auf `test.siwako.ch`.
- Das Image `plauderbox:olymp01-live-20261112-images` mit der Image-ID `sha256:2d4c1ebb41482a0ffb6e9010d36f23859c7745451711988aafb46e6bbc6e2aea` wurde aktiviert.
- Nur `plauderbox-app-1` wurde neu erstellt. Die Compose-Rückfallsicherung liegt unter `/srv/backup/plauderbox/20261112-images/compose.yaml.before`.
- PlauderBox und n8n antworteten über den lokalen Caddy-Pfad mit HTTP 200, FileBox mit der erwarteten Weiterleitung. Die KI war bereit.
- Die PlauderBox-Logs bestätigten erfolgreiche Freigabe-, Transkriptions-, Protokollpunkt- und Bildübergaben mit HTTP 200.
- **OFFEN:** Mobiltest und Kontrolle des gespeicherten HappyHour-Bildes auf Lesbarkeit, Dateiname und lange Bildseite von höchstens 1200 Pixeln.

## Ergänzung vom 13.11.2026

- Der vollständige lokale Pflichtprüflauf für Version `1.1.0` bestand mit Lint, TypeScript, 113 Frontendtests, Produktionsbuild, Playwright-Offlinefall, .NET-Build ohne Warnungen, 14 Integrations- und 9 Vertragstests, Offline-App-Shell und Token-Logschutz.
- Das Image `plauderbox:olymp01-live-1.1.0-59ae459`, ID `sha256:da71c75c5432…`, wurde aus Tag `v1.1.0` gebaut.
- Ein isolierter Kandidatencontainer bestätigte KI-Bereitschaft, Ablaufdatum `2027-11-11` und HTTP 410 für einen formal gültigen, unbekannten Token über `https://happyhour.siwako.ch`.
- Der erste Rollout wurde automatisch zurückgerollt, weil die neue Schlüsseldatei als `root:root` für den Containerbenutzer UID 1000 nicht lesbar war. Der korrigierte Rollout setzt Modus `600` und Eigentümer `1000:1000` sowohl im Erfolgs- als auch im Rückfallpfad.
- Nur `plauderbox-app-1` wurde ersetzt. Der geschützte Rückfallstand liegt unter `/srv/backup/plauderbox/20261113-v1.1.0-live`.
- Intern und öffentlich bestanden der minimale `/api/v1/status`, `/api/v1/ki-schluesselstatus`, Frontendversion `1.1.0`, TLS und Sicherheitsheader. Der synthetische produktive HappyHour-Freigabeabruf ergab erwartungsgemäss HTTP 410.
- n8n, FileBox und beide PostgreSQL-Container liefen unverändert weiter. Temporäre Quell- und Schlüsselkopien wurden entfernt.
- **Nicht geprüft:** realer produktiver QR-, Audio-, Punkt- und Bild-End-to-End-Lauf auf dem Mobilgerät.

## Verknüpfungen

- [[E012 - Olymp01 als Live-System und Delphi01 als Testsystem betreiben]]
- [[LD011 - PlauderBox Livebetrieb auf Olymp01]]
