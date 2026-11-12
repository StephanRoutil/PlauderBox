# PlauderBox-Testbetrieb auf Delphi01

## Tatsächlich laufender Stand

Die interne Testumgebung läuft auf Delphi01 aus `/home/zeus/plauderbox-test-vorbereitung`. Sie ist nicht öffentlich erreichbar. FileBox und der zentrale PostgreSQL-Dienst wurden durch die Bereitstellung nicht verändert.

| Bestandteil | Stand |
|---|---|
| Anwendung | eigener Container aus `plauderbox:delphi01-test-20261110-full` |
| Image-ID | `sha256:f7f1d60381dd…` |
| Rückfallimage | `plauderbox:delphi01-test-before-fotosicherung` |
| Anwendungslistener | ausschliesslich `127.0.0.1:5187` auf Delphi01 |
| interner HTTPS-Zugriff | `https://192.168.68.8` über den eigenen Caddy-Container |
| Zertifikatsdownload | `http://192.168.68.8:8080/delphi01-root.crt` |
| Android-Zertifikat | `http://192.168.68.8:8080/delphi01-android.cer` |
| HappyHour-Testzugriff | serverseitig über `http://localhost:8081` auf Delphi01 |
| serverseitige Datenbank | keine; lokale Begehungsdaten liegen in IndexedDB auf dem Gerät |

Der aktuelle Linux-Dockerbuild, Containerstart, Root, Manifest, Service Worker, JavaScript-/CSS-Assets, korrekter Manifest-MIME-Typ, KI-Bereitschaft, HappyHour-Fehlervertrag und Tokenlogschutz wurden geprüft. Dies ist noch keine vollständige Mobilgeräteabnahme.

## Sicherheits- und Integrationsgrenzen

- Die OpenAI-Schlüsseldatei liegt nur geschützt unter `secrets/openai.json`, nicht in Git oder Image. `secrets` benötigt Modus `700`, die Datei Modus `600`.
- Der Browser und der QR-Code erhalten keine HappyHour-Adresse. `PlauderBox__HappyHour__Basisadresse` verweist im Test auf `http://localhost:8081`.
- Ein verschlüsselter SSH-Reverse-Tunnel verbindet Delphi01 `127.0.0.1:8081` mit dem lokalen HappyHour-Testlistener. Es ist kein HappyHour-Port im LAN geöffnet.
- Jeder HappyHour-Abruf benötigt eine begrenzte, widerrufbare Freigabe. Ein ungültiger Token liefert Status 410 und der geprüfte Dummy-Token erschien nicht im Containerlog.
- Der Reverse-Tunnel und das interne HTTP auf Loopback sind ausschliesslich Testhilfen. Ein Produktivbetrieb verlangt eine direkte HTTPS-Verbindung mit vertrauenswürdigem Zertifikat.
- PlauderBox schreibt kontrollierte Protokollpunkte über die begrenzte Rundgangsfreigabe. Bilder/Dokumente, Protokollabschluss und Versand bleiben ausgeschlossen.

## Mobilzugriff

Das Mobilgerät muss sich im internen WLAN befinden. Das durch Caddy erzeugte Stammzertifikat muss installiert und als vertrauenswürdig aktiviert sein, bevor `https://192.168.68.8` als sicherer Kontext für Kamera und Mikrofon verwendet wird. Unter Android wird die `.cer`-Datei über die Sicherheitseinstellungen als CA-Zertifikat installiert; direktes Antippen des Downloads genügt je nach Hersteller nicht.

## Weiterhin offen

- vollständige Abnahme des aktuellen Begehungsablaufs auf repräsentativen Mobilgeräten,
- serverpersistente Idempotenz beziehungsweise Duplikatschutz für Transkriptionsaufträge; die stabile `erfassungsId` wird aktuell validiert, aber nicht serverseitig persistent gespeichert,
- Verschiebung der laufenden Ablage nach `/srv/docker/plauderbox-test`; dies benötigt weiterhin eine bewusste administrative Freigabe,
- Start nach einem Host-Neustart praktisch prüfen,
- Caddy-Stammzertifikat und privaten Schlüssel in eine freigegebene Sicherungsregel aufnehmen,
- Bildübergabe nach HappyHour entscheiden und umsetzen.

Der ausführliche Betriebsnachweis steht in `docs/LD002 - PlauderBox Testumgebung Delphi01.md`, der Testnachweis in `docs/T007 - Vollständigen mobilen Begehungsablauf prüfen.md`.
