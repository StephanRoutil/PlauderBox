# PlauderBox

Browserprototyp für einen kontrollierten Ablauf: zuerst mehrere Bilder und ein Diktat erfassen, die Aufnahme intern als `Noch nicht übertragen` speichern, bewusst auswerten und Gruppe, Thema, Inhalt sowie einen allenfalls genannten Rechtsverweis lokal kontrollieren.

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

Der lokale Starter verwendet den bereits vorhandenen PaperTrap-Schlüsseldateipfad, sofern weder `PlauderBox__KI__ApiKey` noch `PlauderBox__KI__Schluesseldatei` gesetzt sind. Der Schlüssel wird nicht kopiert und nicht an den Browser ausgegeben.

## Datenfluss

1. Der Browser speichert genau einen Protokollpunkt und mehrere Bilder in getrennten app-eigenen IndexedDB-Speichern.
2. Nach dem Stoppen speichert er zusätzlich genau eine Aufnahme mit dem Status `Noch nicht übertragen`.
3. Formular, Bild und Aufnahme bleiben beim Neuladen erhalten.
4. Erst nach `Diktat jetzt auswerten` sendet der Browser ausschliesslich die Audiodatei an den PlauderBox-Server.
5. Der Server transkribiert sie über OpenAI `/v1/audio/transcriptions` und strukturiert das Transkript anschliessend über die Responses API.
6. Gruppe, Thema, Inhalt und ein allenfalls genannter Rechtsverweis werden nur in noch leere lokale Felder eingesetzt.
7. Nach bestätigter Gesamtauswertung löscht der Browser nur die lokale Aufnahme.

PlauderBox speichert Protokollpunkt, Bild und die noch nicht übertragene Aufnahme intern im Browser. Diese Daten erscheinen nicht in Downloads, Galerie, SD-Karte oder Cloud. Formular und Bild werden weder an HappyHour noch an den PlauderBox-Server übertragen. Für die Verarbeitung der bewusst übertragenen Audioaufnahme durch OpenAI gelten die Bedingungen und Datenschutzregeln des konfigurierten API-Kontos.

## Grenzen

- Nur lokaler Loopback-Betrieb, keine Benutzeranmeldung.
- Maximal 20 MB Audio je Aufnahme.
- Genau ein lokaler Protokollpunkt, mehrere Bilder und eine ausstehende Audioaufnahme.
- Keine HappyHour-Anbindung und keine Referenzdaten-Auswahllisten.
- Keine produktive oder öffentliche Bereitstellung.

## Dokumentation

- `docs/E001 - PlauderBox als eigenständiges InHouseServer-Teilprojekt entwickeln.md`
- `docs/E002 - Aufnahmen offline sichern und später transkribieren.md`
- `docs/E003 - Offlinefähige PWA mit modularem Monolithen verwenden.md`
- `docs/E004 - Vue und TypeScript für die mobile Oberfläche verwenden.md`
- `docs/E005 - PlauderBox in Datenmanagement Logik und UI gliedern.md`
- `docs/E006 - Diktate mit strukturiertem KI-Vertrag auswerten.md`
- `docs/D001 - Anforderungen an den lokalen Aufnahmeprototyp.md`
- `docs/D002 - Coding Guidelines für PlauderBox.md`
- `docs/D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox.md`
- `docs/D004 - Testbereitstellung auf Delphi01 vorbereiten.md`
- `docs/D005 - Anforderungen an die intern gespeicherte Einzelaufnahme.md`
- `docs/D006 - Lokalen Protokollpunkt mit Bild erfassen.md`
- `docs/D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen.md`
- `docs/D008 - Aufnahme verwerfen und mehrere Bilder lokal erfassen.md`
- `docs/LD001 - Lokaler Aufnahmeprototyp mit OpenAI-Transkription.md`
- `docs/LD002 - PlauderBox Testumgebung Delphi01.md`
- `docs/LD003 - Vue Oberfläche mit intern gespeicherter Einzelaufnahme.md`
- `docs/LD004 - Lokaler Protokollpunktentwurf mit Bild.md`
- `docs/LD005 - Bild und Diktat vor dem strukturierten Entwurf erfassen.md`
- `docs/LD006 - Mehrere lokale Bilder und verwerfbare Aufnahme.md`
- `docs/T002 - Einzelne Aufnahme intern speichern und nach Bestätigung löschen.md`
- `docs/T001 - Mikrofonaufnahme im Browser transkribieren.md`
- `docs/T003 - Protokollpunktfelder und Bild lokal speichern.md`
- `docs/T004 - Erkennungsfelder aus dem Diktat lokal übernehmen.md`
- `docs/T005 - Aufnahme verwerfen und mehrere Bilder getrennt verwalten.md`

