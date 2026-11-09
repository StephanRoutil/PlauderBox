---
typ: loesungsdokumentation
id: LD001
status: umgesetzt
datum: 2026-11-09
---

# LD001 – Lokaler Aufnahmeprototyp mit OpenAI-Transkription

> Historischer Stand des ersten Funktionsnachweises. Der aktuelle Oberflächen- und Speicherstand ist in [[LD003 - Vue Oberfläche mit intern gespeicherter Einzelaufnahme]] dokumentiert.

## Gültiger Stand

PlauderBox stellt lokal einen einzigen Ablauf bereit: Der Benutzer startet und stoppt im Browser eine Mikrofonaufnahme. Erst nach dem Stoppen sendet der Browser die abgeschlossene Aufnahme an den lokalen Server. Dieser ruft OpenAI serverseitig auf und gibt ausschliesslich den erkannten Text an den Browser zurück.

Der Prototyp lauscht nur auf `127.0.0.1`. Aufnahme und Transkript werden durch PlauderBox nicht dauerhaft gespeichert. Der Browser weist vor der Aufnahme auf die externe Übertragung hin.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| ASP.NET-Core-Host und Transkriptionsendpunkt | `src/Program.cs` | umgesetzt und lokal geprüft |
| Visual-Studio-Solution | `src/PlauderBox.sln` | UI, Logik und Datenmanagement gemeinsam ladbar |
| UI-Projektdefinition | `src/PlauderBox.UI.csproj` | .NET 10, Release-Build bestanden |
| Logikschicht | `src/PlauderBox.Logik/PlauderBox.Logik.csproj` | Projektgrenze angelegt; fachliche Zerlegung noch offen |
| Datenmanagementschicht | `src/PlauderBox.Datenmanagement/PlauderBox.Datenmanagement.csproj` | Projektgrenze angelegt; Providerzerlegung noch offen |
| Browseroberfläche | `src/wwwroot/index.html` | umgesetzt und im Browser geprüft |
| Gestaltung | `src/wwwroot/styles.css` | responsive Einzelansicht |
| Mikrofonaufnahme und Übertragung | `src/wwwroot/app.js` | echte Aufnahme mit `MediaRecorder` geprüft |
| Lokaler Starter | `Start-PlauderBox.ps1`, `Start-PlauderBox.cmd` | verwendet serverseitige Konfiguration |
| Reproduzierbare technische Prüfung | `tests/Pruefe-Prototyp.ps1` | bestanden |

Branch oder Commit: noch nicht vorhanden; das Teilprojekt wurde lokal neu angelegt.

Die Solution baut mit allen drei Projekten ohne Fehler und Warnungen. Der bestehende Prototypcode liegt weiterhin im UI-Projekt. Die Aufteilung seines Transkriptionsablaufs auf Logik und Datenmanagement ist ausdrücklich noch nicht als umgesetzt dokumentiert.

## KI-Anbindung

- Endpunkt: OpenAI Audio Transcriptions API.
- Modell: `gpt-transcribe`.
- Der Schlüssel wird aus `PlauderBox:KI:ApiKey` oder einer serverseitigen JSON-Schlüsseldatei mit Feld `OpenAI` geladen.
- Der lokale Starter referenziert bei vorhandener Datei die bestehende PaperTrap-Schlüsseldatei; der Schlüssel wird nicht kopiert.
- Maximale Aufnahmegrösse: 20 MB.
- Unterstützte Browserformate: WebM, Ogg, MP4, MP3 und WAV.

## Sicherheitsgrenzen

- ausschliesslich Loopback-Zugriff,
- Herkunftsprüfung für schreibende API-Aufrufe,
- serverseitiger API-Schlüssel,
- keine Rohantworten von OpenAI in Fehlermeldungen,
- begrenzte Anfragerate,
- keine dauerhafte Audio- oder Textablage,
- keine produktive, öffentliche oder containerisierte Bereitstellung.

## Nachweis

Siehe [[T001 - Mikrofonaufnahme im Browser transkribieren]].
