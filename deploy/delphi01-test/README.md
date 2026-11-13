# PlauderBox-Testbetrieb auf Delphi01

## Tatsächlich laufender Stand

Die interne Testumgebung läuft auf Delphi01 aus `/home/zeus/plauderbox-test-vorbereitung`. Sie ist nicht öffentlich erreichbar. FileBox und der zentrale PostgreSQL-Dienst wurden durch die Bereitstellung nicht verändert.

| Bestandteil | Stand |
|---|---|
| Anwendung | Version `1.1.0` aus `plauderbox:delphi01-test-59ae459` |
| Image-ID | `sha256:c68d9f0f3129…` |
| Rückfallimage | vorheriger Stand `plauderbox:delphi01-test-e20a221` |
| Anwendungslistener | ausschliesslich `127.0.0.1:5187` auf Delphi01 |
| interner HTTPS-Zugriff | `https://192.168.68.8` über den eigenen Caddy-Container |
| Zertifikatsdownload | `http://192.168.68.8:8080/delphi01-root.crt` |
| Android-Zertifikat | `http://192.168.68.8:8080/delphi01-android.cer` |
| HappyHour-Testzugriff | direkt über `https://test.siwako.ch` |
| serverseitige Datenbank | keine; lokale Begehungsdaten liegen in IndexedDB auf dem Gerät |

Der aktuelle Linux-Dockerbuild, Containerstart, Root, Manifest, Service Worker, JavaScript-/CSS-Assets, korrekter Manifest-MIME-Typ, KI-Bereitschaft, HappyHour-Fehlervertrag und Tokenlogschutz wurden geprüft. Dies ist noch keine vollständige Mobilgeräteabnahme.

## Sicherheits- und Integrationsgrenzen

- Die OpenAI-Schlüsseldatei liegt nur geschützt unter `secrets/openai.json`, nicht in Git oder Image. `secrets` benötigt Modus `700`, die Datei Modus `600`.
- Der Browser und der QR-Code erhalten keine HappyHour-Adresse. `PlauderBox__HappyHour__Basisadresse` verweist im Test serverseitig direkt auf `https://test.siwako.ch`.
- Jeder HappyHour-Abruf benötigt eine begrenzte, widerrufbare Freigabe. Ein ungültiger Token liefert Status 410 und der geprüfte Dummy-Token erschien nicht im Containerlog.
- Die direkte HappyHour-Verbindung verwendet HTTPS mit vertrauenswürdigem Zertifikat; ein lokaler Reverse-Tunnel ist nicht mehr erforderlich.
- PlauderBox schreibt kontrollierte Protokollpunkte und zugehörige Bilder über die begrenzte Rundgangsfreigabe. Protokollabschluss und Versand bleiben ausgeschlossen.

## Mobilzugriff

Das Mobilgerät muss sich im internen WLAN befinden. Das durch Caddy erzeugte Stammzertifikat muss installiert und als vertrauenswürdig aktiviert sein, bevor `https://192.168.68.8` als sicherer Kontext für Kamera und Mikrofon verwendet wird. Unter Android wird die `.cer`-Datei über die Sicherheitseinstellungen als CA-Zertifikat installiert; direktes Antippen des Downloads genügt je nach Hersteller nicht.

## Weiterhin offen

- vollständige Abnahme des aktuellen Begehungsablaufs auf repräsentativen Mobilgeräten,
- serverpersistente Idempotenz beziehungsweise Duplikatschutz für Transkriptionsaufträge; die stabile `erfassungsId` wird aktuell validiert, aber nicht serverseitig persistent gespeichert,
- Verschiebung der laufenden Ablage nach `/srv/docker/plauderbox-test`; dies benötigt weiterhin eine bewusste administrative Freigabe,
- Start nach einem Host-Neustart praktisch prüfen,
- Caddy-Stammzertifikat und privaten Schlüssel in eine freigegebene Sicherungsregel aufnehmen,
- reale End-to-End-Abnahme der Bildübergabe gegen `test.siwako.ch`.

Der ausführliche Betriebsnachweis steht in `docs/LD002 - PlauderBox Testumgebung Delphi01.md`, der Testnachweis in `docs/T007 - Vollständigen mobilen Begehungsablauf prüfen.md`.
