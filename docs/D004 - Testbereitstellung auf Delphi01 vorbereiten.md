---
typ: betriebsplanung
id: D004
status: vorbereitet
datum: 2026-11-09
---

# D004 – Testbereitstellung auf Delphi01 vorbereiten

## Auftrag und Grenze

Der Product Owner hat die Vorbereitung von PlauderBox auf Delphi01 freigegeben. Diese Vorbereitung umfasst Bestandsprüfung, lokale Containerdefinition und ein getrenntes Zielbild. Sie umfasst noch keinen Containerstart, keine Datenbankanlage, keine öffentliche Freigabe, keinen Caddy-Eintrag und keine Änderung an Olymp01.

## Geprüfter Serverstand

Delphi01 ist per SSH als `zeus` erreichbar. FileBox und der zentrale PostgreSQL-Dienst laufen; PostgreSQL meldet `healthy`. Zum Prüfzeitpunkt waren rund 85 GB auf dem Root-Dateisystem und knapp 7 GB Arbeitsspeicher verfügbar. Die vorhandenen Docker-Verzeichnisse und Netze bleiben unverändert.

## Vorbereitete Dateien

- `Dockerfile`: reproduzierbarer Multi-Stage-Build für .NET 10,
- `.dockerignore`: Ausschluss von Git, Buildausgaben und geschützter Konfiguration,
- `deploy/delphi01-test/compose.yaml`: eigener Container mit Loopback-Listener, schreibgeschütztem Dateisystem sowie CPU-, RAM- und Loggrenzen,
- `deploy/delphi01-test/README.md`: Zielstruktur und noch nicht freigegebene Schritte.

## Sicherheitsgrenzen

- Der aktuelle Prototyp erhält keine PostgreSQL-Datenbank, weil er nichts dauerhaft speichert.
- Der Server lauscht nur auf Delphi01-Loopback; ein späterer Arbeitsplatztest erfolgt über SSH-Tunnel.
- Die OpenAI-Schlüsseldatei wird nicht in Image, Repository oder Übertragungspaket aufgenommen.
- Der Container wird mit einem unprivilegierten Benutzer und schreibgeschütztem Root-Dateisystem vorgesehen.
- FileBox, der zentrale PostgreSQL-Dienst und Olymp01 werden nicht verändert.

## OFFEN

- Anlegen von `/srv/docker/plauderbox-test` benötigt auf Delphi01 eine interaktive `sudo`-Bestätigung.
- Geschützte OpenAI-Testkonfiguration bereitstellen.
- Image bauen, auf Delphi01 übertragen und vor Start prüfen.
- Containerstart, SSH-Tunnel und echter Mikrofontest im Browser gesondert freigeben und nachweisen.

## Verknüpfungen

- [[E003 - Offlinefähige PWA mit modularem Monolithen verwenden]]
- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]
- [[LD001 - Lokaler Aufnahmeprototyp mit OpenAI-Transkription]]
