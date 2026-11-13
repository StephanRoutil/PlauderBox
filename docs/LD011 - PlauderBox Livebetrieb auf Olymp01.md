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

Olymp01 verwendet seit 13.11.2026 verbindlich `https://happyhour.siwako.ch` als HappyHour-Basisadresse. Ein formal gültiger, synthetischer und unbekannter Freigabetoken wird über die PlauderBox-Liveanwendung mit HTTP 410 abgewiesen. Damit sind Route, TLS-Verbindung und Fehlerabbildung des produktiven HappyHour-Vertrags technisch nachgewiesen. Der reale QR-, Audio-, Punkt- und Bild-End-to-End-Test mit einer produktiven Freigabe bleibt eine bewusste fachliche Abnahme durch den Mitarbeiter.

## Produktionsnahe Integrationsprüfung ab 12.11.2026

Für die kontrollierte Abnahme vor dem HappyHour-Produktivpublish verwendet die PlauderBox auf Olymp01 vorübergehend `https://test.siwako.ch` als HappyHour-Basisadresse. Die öffentliche PlauderBox-Adresse und ihre Live-Härtung bleiben unverändert. Vor dem endgültigen HappyHour-Produktivbetrieb muss die Basisadresse nach erfolgreicher Abnahme bewusst wieder auf `https://happyhour.siwako.ch` gesetzt, geprüft und dokumentiert werden.

Vor der Testveröffentlichung leitete `test.siwako.ch` den PlauderBox-Dummy-Freigabeabruf noch mit HTTP 302 auf `/public/login.aspx` um. Die Integration gilt daher erst nach Veröffentlichung der HappyHour-Testversion und einem erfolgreichen QR-, Punkt- und Bild-End-to-End-Test als abgenommen.

Die Umschaltung wurde am 12.11.2026 auf Olymp01 aktiviert. Der laufende Container bestätigte `PlauderBox__HappyHour__Basisadresse=https://test.siwako.ch`; interner KI-Status sowie öffentliche PlauderBox-, n8n- und FileBox-Aufrufe antworteten danach mit HTTP 200. Ausschliesslich der PlauderBox-App-Container wurde neu erstellt. Die vorherige Compose-Datei ist unter `/srv/backup/plauderbox/20261112-test-siwako/compose-before-test-siwako.yaml` gesichert.

Nach dem HappyHour-Testpublish war der öffentliche Freigabevertrag aktiv: Ein unbekannter formal gültiger Token ergab 404 statt einer Login-Weiterleitung. POST auf dem Lesepfad wurde mit 405 und `Allow: GET`, GET auf dem Protokollpunkt-Schreibpfad mit 405 und `Allow: POST` abgewiesen. Der reale QR-, Punkt- und Bild-End-to-End-Test bleibt noch durchzuführen.

Beim ersten realen Testlauf am 12.11.2026 zeigte sich, dass der aktive Caddy-Siteblock den benutzerdefinierten Freigabeheader im Accesslog erfasste. Das site-spezifische PlauderBox-Accesslogging wurde aus der aktiven und der versionierten Konfiguration entfernt. Vorher wurde die Caddydatei unter `/srv/backup/plauderbox/20261112-tokenlog-fix` gesichert; nur Caddy wurde neu erstellt. PlauderBox, n8n und FileBox antworteten danach mit HTTP 200. Ein gezielter Nachtest ergab keine neue PlauderBox-Accesslogzeile. Die während des ersten Laufs verwendete Freigabe muss wegen des zuvor offengelegten Tokens zwingend widerrufen werden, bevor eine neue Freigabe für den Wiederholungstest erstellt wird.

Nach dem durch Stephan Routil ausgeführten HappyHour-Publish wurde am 12.11.2026 das Image `plauderbox:olymp01-live-20261112-images` auf Olymp01 aktiviert. Die Image-ID lautet `sha256:2d4c1ebb41482a0ffb6e9010d36f23859c7745451711988aafb46e6bbc6e2aea`. Ausschliesslich `plauderbox-app-1` wurde neu erstellt; die vorherige Compose-Datei liegt unter `/srv/backup/plauderbox/20261112-images/compose.yaml.before`. Der lokale Caddy-Pfad lieferte für PlauderBox und n8n HTTP 200; FileBox lieferte die erwartete Weiterleitung. `/api/status` bestätigte die KI-Bereitschaft. Die PlauderBox-Logs wiesen anschliessend erfolgreiche Freigabe-, Transkriptions-, Protokollpunkt- und Bildübergaben mit HTTP 200 aus. **OFFEN:** fachlich am Mobilgerät und in HappyHour prüfen, ob Dateiname, lesbares Bild und die auf maximal 1200 Pixel begrenzte HappyHour-Kopie korrekt sind.

## Version 1.1.0 und produktive HappyHour-Anbindung am 13.11.2026

Das Image `plauderbox:olymp01-live-1.1.0-59ae459` mit der Image-ID `sha256:da71c75c543202f45ca92f704948844155ab137f57b4bb44b6a2565ece2dc16c` läuft auf Olymp01. Die aktive Compose-Konfiguration verwendet `https://happyhour.siwako.ch`. Die geschützte Schlüsseldatei gehört dem unprivilegierten Containerbenutzer `1000:1000`, besitzt Modus `600` und enthält zusätzlich das Ablaufdatum `2027-11-11`.

Der erste Aktivierungsversuch wurde automatisch zurückgerollt, weil eine mit `sudo install` als `root:root` abgelegte Schlüsseldatei für den gehärteten Container nicht lesbar war. Ein isolierter Kandidatencontainer bestätigte danach mit korrekter Eigentümerschaft die KI-Bereitschaft, das Ablaufdatum und HTTP 410 des produktiven HappyHour-Vertrags. Der korrigierte Rollout ersetzte ausschliesslich `plauderbox-app-1`. Der Rückfallstand liegt geschützt unter `/srv/backup/plauderbox/20261113-v1.1.0-live`.

Intern und öffentlich bestanden `/api/v1/status`, `/api/v1/ki-schluesselstatus`, Frontendversion `1.1.0`, Sicherheitsheader und der synthetische HappyHour-Negativtest. n8n, FileBox und beide PostgreSQL-Container liefen unverändert weiter. Temporäre Quellarchive und Schlüsselkopien wurden nach der Bereitstellung entfernt.

## Version 1.1.1 mit Verteiler-Quality-Gate am 13.11.2026

Nach unabhängiger QS-Freigabe ohne P1-, P2- oder P3-Befund wurde Commit `a24e374` als Image `plauderbox:olymp01-live-1.1.1-a24e374` mit der Image-ID `sha256:d2a3435ada8035c69daf8b017857657a0365f1e625866ec39af7017e771e60c8` aktiviert. Die aktive Konfiguration verwendet weiterhin `https://happyhour.siwako.ch`; Caddy, DNS, Firewall und die übrigen Dienste wurden nicht verändert.

Der erste Aktivierungslauf wurde wegen einer fehlerhaften internen Prüf-IP automatisch auf Version `1.1.0` zurückgestellt. Nach Korrektur der Prüfung auf das Netz `plauderbox_proxy` bestand der zweite Lauf. Die Rückfall-Compose-Datei liegt unter `/srv/backup/plauderbox/20261113-v1.1.1-a24e374/compose.yaml.before`.

Intern und öffentlich bestanden Status, Frontendversion `1.1.1`, TLS, Sicherheitsheader und HTTP 410 für einen synthetischen unbekannten Freigabetoken. Die Schlüsseldatei blieb unverändert bei Eigentümer `1000:1000` und Modus `600`. Nur `plauderbox-app-1` wurde ersetzt; n8n, FileBox und beide PostgreSQL-Container liefen weiter. Die reale Mobilprüfung des neuen Verteiler-Quality-Gates bleibt offen.

## Version 1.1.3 mit vollständigem Pflichtfeldweg am 13.11.2026

Nach erfolgreicher Mobilabnahme auf Delphi01 und abschliessender QS-Freigabe wurde Commit `958d3c0` als Image `plauderbox:olymp01-live-1.1.3-958d3c0` mit der Image-ID `sha256:9895b7ff1d51…` aktiviert. Die aktive Konfiguration verwendet `https://happyhour.siwako.ch`, den Ursprung `https://plauderbox.routil.ch` und unverändert das begrenzte Proxy-Netz `172.22.0.0/24`. Die vorherige Compose-Datei liegt unter `/srv/backup/plauderbox/1.1.3-958d3c0/compose.yaml`.

Öffentlich bestanden HTTPS, Status und Frontendversion `1.1.3`. Das ausgelieferte Asset enthält den direkten Pflichtfelddialog für neue Punkte sowie den HappyHour-Erneuerungsweg für vorbereitete Punkte. Die SHA-256-Prüfsumme des Containerlogos entspricht exakt der vom Product Owner freigegebenen Quelldatei. Nur `plauderbox-app-1` wurde ersetzt; Caddy, n8n, FileBox, beide PostgreSQL-Container, DNS und Firewall blieben unverändert. Der reale produktive QR-, Audio-, Punkt- und Bild-End-to-End-Lauf bleibt die bewusste fachliche Abnahme.

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
