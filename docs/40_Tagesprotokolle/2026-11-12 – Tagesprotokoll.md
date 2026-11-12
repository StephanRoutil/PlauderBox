# Tagesprotokoll 12.11.2026

## Session – Olymp01 mit HappyHour-Testsystem verbinden

- **Startzeit, Endzeit und Dauer:** nicht zuverlässig bestimmbar

Die HappyHour-Basisadresse der PlauderBox-Liveinstanz auf Olymp01 wird für die produktionsnahe Integrationsprüfung vorübergehend von `https://happyhour.siwako.ch` auf `https://test.siwako.ch` umgestellt. Die öffentliche PlauderBox-Adresse, Caddy-Konfiguration, Netzisolation und Delphi01 bleiben unverändert. Der Prüflauf erwartet während dieser Phase ausdrücklich das Testsystem.

Vor dem HappyHour-Testpublish antwortete der PlauderBox-Freigabeendpunkt auf `test.siwako.ch` noch mit HTTP 302 auf `/public/login.aspx`. **OFFEN:** HappyHour-Testversion veröffentlichen, QR-Freigabe sowie Punkt- und Bildübergabe vollständig prüfen und danach die HappyHour-Basisadresse für den Produktivbetrieb bewusst wieder auf `https://happyhour.siwako.ch` zurückstellen.

Der vollständige PlauderBox-Prüflauf bestand mit 67 Frontendtests, Vue- und .NET-Build sowie Vertrags-, Offline- und Tokenlogprüfung. Der Quality-Agent erteilte die Freigabe ohne P1–P3-Befund. Auf Olymp01 wurde die vorherige Compose-Datei unter `/srv/backup/plauderbox/20261112-test-siwako` gesichert und nur der PlauderBox-App-Container neu erstellt. Die aktive Containerumgebung bestätigt `https://test.siwako.ch`; PlauderBox, KI-Status, n8n und FileBox antworteten anschliessend mit HTTP 200.

Nach dem HappyHour-Testpublish antwortete ein unbekannter Freigabetoken mit 404 statt Login-Weiterleitung. Die Methodenbegrenzung wurde öffentlich bestätigt: Lesepfad nur GET, Protokollpunkt-Schreibpfad nur POST, jeweils mit 405 und passendem `Allow` bei falscher Methode. **OFFEN:** echten QR-Code erzeugen und den vollständigen Punkt- und Bildablauf gegen die Testdatenbank abnehmen.

Der erste echte Lauf speicherte zwei Punkte, scheiterte jedoch vor dem HappyHour-Bildhandler an der fehlenden WCF-Empfangsgrenze des Zielsystems. Bei der Diagnose wurde ausserdem erkannt, dass der aktive Caddy-Accesslog den Freigabeheader erfasst hatte. Das PlauderBox-Accesslogging wurde mit gesichertem Rückfallstand deaktiviert; ein Nachtest erzeugte keine neue Accesslogzeile. **SICHERHEITS-GATE:** Die betroffene Freigabe muss widerrufen werden, bevor eine neue Freigabe und der Bild-Wiederholungstest zulässig sind.

## Session – Aufnahmezeitpunkt und Originalbilder durchgängig erhalten

- **Startzeit, Endzeit und Dauer:** nicht zuverlässig bestimmbar

PlauderBox speichert bei neuen Kamera- und Galeriebildern den vom Browser gelieferten Dateizeitpunkt als Aufnahmezeitpunkt und führt ihn über Browser-Formular, Serververtrag und HappyHour-Provider. Der interne Blob sowie der gemeinsame Download bleiben unverändert; die gewünschte Begrenzung auf 1200 Pixel wird ausschliesslich an der HappyHour-Dokumentkopie vorgenommen. 67 Frontendtests, TypeScript, Vue-Build, .NET-Build, Vertragstests, Offline-PWA und Token-Logschutz sind grün. **OFFEN:** Bereitstellung und mobiler End-to-End-Nachweis.

## Session – Bildverarbeitung auf Olymp01 bereitstellen

- **Startzeit, Endzeit und Dauer:** nicht zuverlässig bestimmbar

Nach dem von Stephan Routil ausgeführten HappyHour-Publish wurde auf Olymp01 das neue Image `plauderbox:olymp01-live-20261112-images` aktiviert. Ausschliesslich der PlauderBox-App-Container wurde neu erstellt; die Compose-Rückfallsicherung liegt unter `/srv/backup/plauderbox/20261112-images`. PlauderBox und n8n antworteten über Caddy mit HTTP 200, FileBox mit der erwarteten Weiterleitung; der KI-Status war bereit. Die Anwendungslogs bestätigten bereits erfolgreiche Aufrufe für Freigabe, Transkription, Protokollpunkt- und Bildübergabe. **OFFEN:** mobiler Fachtest und Kontrolle in HappyHour, dass das Bild lesbar, korrekt benannt und nur in der HappyHour-Kopie auf höchstens 1200 Pixel begrenzt ist.
