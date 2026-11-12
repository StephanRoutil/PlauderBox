# LD011 – PlauderBox-Livebetrieb auf Olymp01

## Zielstand

- Live-Adresse: `https://plauderbox.routil.ch`
- Host: Olymp01
- Testsystem: Delphi01 bleibt unverändert
- Deployment: `/srv/docker/plauderbox`
- Anwendung: eigener gehärteter Docker-Container ohne Hostport
- TLS/Reverse Proxy: bestehender Caddy auf Olymp01, ACME über TLS-ALPN-01 auf TCP 443
- Persistente Anwendungsdaten: keine; Begehungsdaten bleiben bis zur bestätigten Übergabe im internen Browser-Speicher
- Geheimnis: OpenAI-Schlüsseldatei nur unter `/srv/docker/plauderbox/secrets/openai.json`

## Netzwerkgrenzen

PlauderBox und Caddy teilen ausschliesslich das dedizierte interne Netz `plauderbox_proxy` (`172.22.0.0/24`). n8n und andere Anwendungscontainer gehören diesem Netz nicht an. Ein separates Compose-Egress-Netz mit höherer Gateway-Priorität ermöglicht die ausgehenden HTTPS-Verbindungen. Es werden weder neue öffentliche Ports noch Datenbankports geöffnet.

Nicht lokale POST-Aufrufe werden nur mit dem exakt konfigurierten Origin akzeptiert. Transkription und Bildübergabe verlangen zusätzlich den Freigabetoken im Header; bei Bildern muss er mit dem Formulartoken übereinstimmen. Caddy überschreibt die weitergeleitete Clientadresse; PlauderBox vertraut dieser Angabe nur aus dem dedizierten Proxy-Netz. Ein vorgelagertes Limit nach bestätigter Clientquelle greift vor Tokenvalidierung und Bodyverarbeitung. Erst nachdem HappyHour die aktive Rundgangsfreigabe serverseitig bestätigt hat, gilt zusätzlich ein Kontingent für genau diese Freigabe. Formal gültige, aber erfundene Token erzeugen damit weder eigene Quellpartitionen noch eigene Freigabekontingente.

## Produktives HappyHour-Gate

Olymp01 erreicht `https://happyhour.siwako.ch`. Der produktive Server leitete den PlauderBox-Dummy-Freigabeabruf am 11.11.2026 jedoch noch zur Anmeldung um. Damit ist der neue öffentliche HappyHour-Vertrag dort noch nicht nachgewiesen. PlauderBox kann live bereitstehen; QR-Kontext, Punkt- und Bildübergabe gelten produktiv erst nach separater HappyHour-Veröffentlichung und End-to-End-Abnahme als freigegeben.

## Produktionsnahe Integrationsprüfung ab 12.11.2026

Für die kontrollierte Abnahme vor dem HappyHour-Produktivpublish verwendet die PlauderBox auf Olymp01 vorübergehend `https://test.siwako.ch` als HappyHour-Basisadresse. Die öffentliche PlauderBox-Adresse und ihre Live-Härtung bleiben unverändert. Vor dem endgültigen HappyHour-Produktivbetrieb muss die Basisadresse nach erfolgreicher Abnahme bewusst wieder auf `https://happyhour.siwako.ch` gesetzt, geprüft und dokumentiert werden.

Vor der Testveröffentlichung leitete `test.siwako.ch` den PlauderBox-Dummy-Freigabeabruf noch mit HTTP 302 auf `/public/login.aspx` um. Die Integration gilt daher erst nach Veröffentlichung der HappyHour-Testversion und einem erfolgreichen QR-, Punkt- und Bild-End-to-End-Test als abgenommen.

Die Umschaltung wurde am 12.11.2026 auf Olymp01 aktiviert. Der laufende Container bestätigte `PlauderBox__HappyHour__Basisadresse=https://test.siwako.ch`; interner KI-Status sowie öffentliche PlauderBox-, n8n- und FileBox-Aufrufe antworteten danach mit HTTP 200. Ausschliesslich der PlauderBox-App-Container wurde neu erstellt. Die vorherige Compose-Datei ist unter `/srv/backup/plauderbox/20261112-test-siwako/compose-before-test-siwako.yaml` gesichert.

Nach dem HappyHour-Testpublish war der öffentliche Freigabevertrag aktiv: Ein unbekannter formal gültiger Token ergab 404 statt einer Login-Weiterleitung. POST auf dem Lesepfad wurde mit 405 und `Allow: GET`, GET auf dem Protokollpunkt-Schreibpfad mit 405 und `Allow: POST` abgewiesen. Der reale QR-, Punkt- und Bild-End-to-End-Test bleibt noch durchzuführen.

Beim ersten realen Testlauf am 12.11.2026 zeigte sich, dass der aktive Caddy-Siteblock den benutzerdefinierten Freigabeheader im Accesslog erfasste. Das site-spezifische PlauderBox-Accesslogging wurde aus der aktiven und der versionierten Konfiguration entfernt. Vorher wurde die Caddydatei unter `/srv/backup/plauderbox/20261112-tokenlog-fix` gesichert; nur Caddy wurde neu erstellt. PlauderBox, n8n und FileBox antworteten danach mit HTTP 200. Ein gezielter Nachtest ergab keine neue PlauderBox-Accesslogzeile. Die während des ersten Laufs verwendete Freigabe muss wegen des zuvor offengelegten Tokens zwingend widerrufen werden, bevor eine neue Freigabe für den Wiederholungstest erstellt wird.

Nach dem durch Stephan Routil ausgeführten HappyHour-Publish wurde am 12.11.2026 das Image `plauderbox:olymp01-live-20261112-images` auf Olymp01 aktiviert. Die Image-ID lautet `sha256:2d4c1ebb41482a0ffb6e9010d36f23859c7745451711988aafb46e6bbc6e2aea`. Ausschliesslich `plauderbox-app-1` wurde neu erstellt; die vorherige Compose-Datei liegt unter `/srv/backup/plauderbox/20261112-images/compose.yaml.before`. Der lokale Caddy-Pfad lieferte für PlauderBox und n8n HTTP 200; FileBox lieferte die erwartete Weiterleitung. `/api/status` bestätigte die KI-Bereitschaft. Die PlauderBox-Logs wiesen anschliessend erfolgreiche Freigabe-, Transkriptions-, Protokollpunkt- und Bildübergaben mit HTTP 200 aus. **OFFEN:** fachlich am Mobilgerät und in HappyHour prüfen, ob Dateiname, lesbares Bild und die auf maximal 1200 Pixel begrenzte HappyHour-Kopie korrekt sind.

## Umgesetzter Stand am 11.11.2026

Das Image `plauderbox:olymp01-live-20261111-r4` läuft auf Olymp01 ohne Hostport. PlauderBox und der bestehende Caddy sind als einzige Container im Netz `plauderbox_proxy`; der Standardweg des PlauderBox-Containers führt über das getrennte Egress-Netz. Caddy erhielt nach validierter Konfigurationsänderung wegen der bewusst deaktivierten Admin-Schnittstelle einen gezielten Neustart. n8n, FileBox und beide Datenbanken wurden nicht neu gestartet.

Let's Encrypt stellte ein Zertifikat für `plauderbox.routil.ch` aus. Startseite, Status, Manifest und Service Worker antworteten öffentlich mit HTTP 200. Die Sicherheitsheader waren vorhanden; ein POST ohne zulässigen Origin wurde mit 403 und ein Transkriptionsaufruf ohne Freigabetoken mit 401 abgewiesen. n8n und FileBox antworteten nach der Umschaltung weiterhin mit HTTP 200. Die Rückfallsicherung liegt unter `/srv/backup/plauderbox/20261111T151138Z`.

## Relevante Dateien

- `deploy/olymp01-live/compose.yaml`
- `deploy/olymp01-live/Caddyfile.snippet`
- `deploy/olymp01-live/n8n-compose.plauderbox.patch`
- `Dockerfile`

## Rückfall

Vor Caddy- und Compose-Änderungen werden die aktiven Dateien unter `/srv/backup/plauderbox/<Zeitstempel>` gesichert. Die Erweiterung aus `n8n-compose.plauderbox.patch` wird auf eine Kopie der aktiven n8n-Compose-Datei angewendet und mit `docker compose config` validiert, bevor sie die aktive Datei ersetzt. Danach wird Caddy dauerhaft mit dem externen Netz `plauderbox_proxy` verbunden. Bei einem Rückfall werden die gesicherten Compose- und Caddy-Dateien wiederhergestellt und validiert; die PlauderBox-Netzverbindung wird entfernt und nur der PlauderBox-Container ausser Betrieb genommen. n8n, FileBox und deren Datenbanken werden nicht neu gestartet.

## Verknüpfungen

- [[E012 - Olymp01 als Live-System und Delphi01 als Testsystem betreiben]]
- [[T010 - PlauderBox Livebetrieb auf Olymp01 prüfen]]
