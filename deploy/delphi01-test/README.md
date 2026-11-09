# PlauderBox-Testvorbereitung auf Delphi01

## Status

Diese Ablage ist eine vorbereitete, noch nicht veröffentlichte Testkonfiguration. Sie startet oder verändert auf Delphi01 nichts. Olymp01 ist nicht betroffen.

## Zielbild

- Zielverzeichnis: `/srv/docker/plauderbox-test`
- Container: eigener PlauderBox-Testcontainer
- Listener: ausschliesslich `127.0.0.1:5187` auf Delphi01
- Zugriff vom Arbeitsplatz: später über einen bewussten SSH-Tunnel
- kein öffentlicher Port, kein Caddy-Eintrag, keine HappyHour-Verbindung
- noch keine PostgreSQL-Datenbank, weil der aktuelle Aufnahmeprototyp nichts persistiert
- OpenAI-Schlüssel nur als geschützte Datei auf Delphi01, nicht in Git oder Image

## Vorgesehene Verzeichnisse

```text
/srv/docker/plauderbox-test/
  compose.yaml
  secrets/
    openai.json
  backups/
```

`secrets` muss dem administrierenden Benutzer gehören und Modus `700` besitzen. `openai.json` muss Modus `600` besitzen. Die Datei wird nicht aus PaperTrap kopiert; ihre Bereitstellung auf Delphi01 benötigt einen gesondert kontrollierten Schritt.

## Noch nicht freigegebene Schritte

- Zielverzeichnis unter `/srv/docker` mit `sudo` anlegen,
- Schlüsseldatei bereitstellen,
- Docker-Image bauen und übertragen,
- Container starten,
- SSH-Tunnel und Browserablauf prüfen,
- Testbetrieb dokumentieren.

Keinen Containerstart durchführen, solange die obigen Schritte nicht ausdrücklich freigegeben und die geschützte Konfiguration nicht geprüft ist.
