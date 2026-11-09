# PlauderBox-Testvorbereitung auf Delphi01

## Status

Diese Ablage ist eine vorbereitete, noch nicht veröffentlichte Testkonfiguration. Sie startet oder verändert auf Delphi01 nichts. Olymp01 ist nicht betroffen.

## Zielbild

- Zielverzeichnis: `/srv/docker/plauderbox-test`
- Container: eigener PlauderBox-Testcontainer
- Anwendungslistener: ausschliesslich `127.0.0.1:5187` auf Delphi01
- interner HTTPS-Zugriff: `https://192.168.68.8` über einen eigenen Caddy-Container
- Zertifikatsdownload im internen Netz: ausschliesslich `http://192.168.68.8:8080/delphi01-root.crt`
- Android-Zertifikat im DER-Format: `http://192.168.68.8:8080/delphi01-android.cer`
- kein Internetzugang, kein öffentlicher DNS-Eintrag, keine HappyHour-Verbindung
- noch keine PostgreSQL-Datenbank, weil der aktuelle Aufnahmeprototyp nichts persistiert
- OpenAI-Schlüssel nur als geschützte Datei auf Delphi01, nicht in Git oder Image

## Vorgesehene Verzeichnisse

```text
/srv/docker/plauderbox-test/
  compose.yaml
  Caddyfile
  caddy-data/
  caddy-config/
  secrets/
    openai.json
  backups/
```

`secrets` muss dem administrierenden Benutzer gehören und Modus `700` besitzen. `openai.json` muss Modus `600` besitzen. Die Datei wird nicht aus PaperTrap kopiert; ihre Bereitstellung auf Delphi01 benötigt einen gesondert kontrollierten Schritt.

Für Mikrofonzugriff vom Handy muss das durch Caddy erzeugte Stammzertifikat auf dem Testgerät installiert und als vertrauenswürdig aktiviert werden. Das Stammzertifikat ist öffentlich; der private Schlüssel bleibt ausschliesslich im geschützten Caddy-Datenverzeichnis.

Unter Android wird die `.cer`-Datei über die Sicherheitseinstellungen als **CA-Zertifikat** installiert. Direktes Antippen des Downloads ist je nach Hersteller nicht ausreichend.

## Noch nicht freigegebene Schritte

- Zielverzeichnis unter `/srv/docker` mit `sudo` anlegen,
- Schlüsseldatei bereitstellen,
- Docker-Image bauen und übertragen,
- Container starten,
- internes HTTPS, Zertifikatsvertrauen und Browserablauf prüfen,
- Testbetrieb dokumentieren.

Keinen Containerstart durchführen, solange die obigen Schritte nicht ausdrücklich freigegeben und die geschützte Konfiguration nicht geprüft ist.
