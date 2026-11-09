# PlauderBox

Lokaler Browserprototyp für einen einzigen Ablauf: aufnehmen, an OpenAI zur Transkription senden und den erkannten Text anzeigen.

## Start

`Start-PlauderBox.cmd` doppelklicken oder in PowerShell ausführen:

```powershell
.\Start-PlauderBox.ps1
```

Danach `http://127.0.0.1:5187` öffnen. Der Browser fragt beim ersten Start der Aufnahme nach dem Mikrofonzugriff.

Für Visual Studio die Solution `src/PlauderBox.sln` öffnen. `PlauderBox.sln` und das Hauptprojekt `PlauderBox.UI.csproj` liegen gemeinsam direkt unter `src`.

## Architektur

- `PlauderBox.UI`: mobile Vue-/TypeScript-Oberfläche und ASP.NET-Core-Host,
- `PlauderBox.Logik`: Fachregeln, Anwendungsabläufe und providerunabhängige Verträge,
- `PlauderBox.Datenmanagement`: PostgreSQL, Dateispeicher und externe Schnittstellen.

Der aktuelle HTML-/JavaScript-Aufnahmeprototyp bleibt bis zur ausdrücklich beauftragten Vue-Migration im UI-Projekt erhalten.

Der lokale Starter verwendet den bereits vorhandenen PaperTrap-Schlüsseldateipfad, sofern weder `PlauderBox__KI__ApiKey` noch `PlauderBox__KI__Schluesseldatei` gesetzt sind. Der Schlüssel wird nicht kopiert und nicht an den Browser ausgegeben.

## Datenfluss

1. Der Browser hält die Aufnahme bis zum Stoppen im Arbeitsspeicher.
2. Nach dem Stoppen sendet er die Audiodatei an den lokalen PlauderBox-Server.
3. Der Server überträgt sie an OpenAI `/v1/audio/transcriptions` mit `gpt-transcribe`.
4. Nur der erkannte Text wird an den Browser zurückgegeben.

PlauderBox speichert weder Aufnahme noch Transkript dauerhaft. Für die Verarbeitung durch OpenAI gelten die Bedingungen und Datenschutzregeln des konfigurierten API-Kontos.

## Grenzen

- Nur lokaler Loopback-Betrieb, keine Benutzeranmeldung.
- Maximal 20 MB Audio je Aufnahme.
- Keine Projekte, Fotos, Protokollstrukturierung oder HappyHour-Anbindung.
- Keine produktive oder öffentliche Bereitstellung.

## Dokumentation

- `docs/E001 - PlauderBox als eigenständiges InHouseServer-Teilprojekt entwickeln.md`
- `docs/E002 - Aufnahmen offline sichern und später transkribieren.md`
- `docs/E003 - Offlinefähige PWA mit modularem Monolithen verwenden.md`
- `docs/E004 - Vue und TypeScript für die mobile Oberfläche verwenden.md`
- `docs/E005 - PlauderBox in Datenmanagement Logik und UI gliedern.md`
- `docs/D001 - Anforderungen an den lokalen Aufnahmeprototyp.md`
- `docs/D002 - Coding Guidelines für PlauderBox.md`
- `docs/D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox.md`
- `docs/D004 - Testbereitstellung auf Delphi01 vorbereiten.md`
- `docs/LD001 - Lokaler Aufnahmeprototyp mit OpenAI-Transkription.md`
- `docs/T001 - Mikrofonaufnahme im Browser transkribieren.md`

