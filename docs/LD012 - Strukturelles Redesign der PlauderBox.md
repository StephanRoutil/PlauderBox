---
typ: loesungsdokumentation
id: LD012
status: umgesetzt-und-lokal-geprueft
datum: 2026-11-12
---

# LD012 – Strukturelles Redesign der PlauderBox

## Gültiger Stand

Das in [[D014 - Befunde aus dem Code-Review beheben]] beauftragte strukturelle Redesign ist im Branch `main` bis einschliesslich Commit `c5de31b` umgesetzt. Es ordnet Server und Client neu, ohne den fachlichen Begehungsablauf, JSON-Feldnamen, deutsche Meldungstexte oder den HappyHour-Vertrag unter `api.svc/PlauderBox` zu verändern.

Die kanonische PlauderBox-HTTP-API liegt gemäss [[E013 - HTTP-API versionieren und Uebergangsaliase beibehalten]] unter `/api/v1`. Die bisherigen `/api`-Pfade bleiben während der entschiedenen Übergangsfrist als gleichwertige Aliase bestehen.

## Serveraufbau

`src/Program.cs` ist der Composition Root. Er registriert Optionen, Provider, Sicherheitsdienste, Ratenlimits und Middleware und mappt die Endpunkte. Die Endpunktimplementierungen liegen in:

- `src/Endpunkte/HappyHourEndpunkte.cs`
- `src/Endpunkte/TranskriptionsEndpunkte.cs`

Quell- und Ursprungsprüfung, IPv4-Netzprüfung sowie das feste Freigabekontingent sind als einzeln prüfbare Klassen unter `src/Sicherheit` gekapselt. `PlauderBoxOptionen` enthält sämtliche Grenzwerte mit den bisher gültigen Standardwerten. Überschreibungen werden aus `PlauderBox:Grenzen` gelesen und beim Start validiert. Größenmeldungen werden aus den tatsächlich konfigurierten Werten gebildet.

Die HappyHour-Ausnahmen werden genau einmal durch `HappyHourFehlerabbildung` in ProblemDetails übersetzt. `HappyHourFreigabeQuelle` bündelt Senden, Statusabbildung und Antwortlesen. Der OpenAI-Aufruf liegt in `src/PlauderBox.Datenmanagement/OpenAiTranskriptionsdienst.cs` hinter `ITranskriptionsdienst` aus der Logikschicht. Die UI kennt dadurch keine OpenAI-Transportdetails.

## Clientaufbau

`src/PlauderBox.UI.Client/src/App.vue` enthält nur Verdrahtung und Vorlage. Der gemeinsame typisierte Zustand für Ansicht, Begehung und Verbindung liegt in `verwendeAppZustand`. Die Abläufe sind aufgeteilt in:

- `verwendeBegehung`
- `verwendeAuswertungsWarteschlange`
- `verwendeHappyHourUebergabe`

Speicher, Netzwerkabruf, Bestätigungsdialog und Verbindungsstatus werden als Abhängigkeiten übergeben. Mikrofonzugriffe liegen hinter `services/audioRekorder.ts`; der QR-Scanner verwendet `BarcodeDetector`, eine ZXing-Rückfallimplementierung und eine manuelle Eingabe. Die fachlichen Token-, UUID-, Bildtyp- und Bildgrößenprüfungen liegen zentral unter `src/PlauderBox.Logik/Client`.

IndexedDB verwendet Schema-Version 2. Begehungen speichern nur Verweise und `schemaVersion`; Audio und Bilder liegen in getrennten Object Stores. Die Migration von Version 1 läuft in einer Transaktion. Medien werden bei Änderungen inkrementell geschrieben. Unlesbare oder nicht migrierbare Bestände sperren eine neue Begehung, bis der Benutzer die Rohdaten und Medien extern gesichert oder sie ausdrücklich verworfen hat.

## Sicherheitsgrenzen

- Freigaben werden vor dem Lesen großer Request-Bodys geprüft.
- Nicht lokale POST-Aufrufe benötigen einen erlaubten Ursprung und eine erlaubte Proxyquelle.
- Ratenlimits und Freigabekontingente begrenzen Freigabeabrufe, Transkriptionen, Punkt- und Bildübergaben.
- Tokens werden redigiert; Request- und HttpClient-Logs dürfen keine Freigaben enthalten.
- Audio, Bilder und Transkripte werden nicht protokolliert.
- Bildinhalt und deklarierter Medientyp werden serverseitig gegeneinander geprüft.

## Qualitätsnachweis

Der vollständige Lauf `tests/Pruefe-Prototyp.ps1` umfasst ESLint, TypeScript, Vue-Verhaltenstests, Produktionsbuild, Playwright-Wiederanlauf, .NET-Release-Build, Integrationstests, Vertragstests, Architekturprüfung, Offline-App-Shell und Token-Logschutz. Der Prüflauf vor Commit `c5de31b` bestand mit:

- **bestanden:** 89 Vue-/TypeScript-Tests,
- **bestanden:** 1 Playwright-Offline-Wiederanlauftest,
- **bestanden:** 12 ASP.NET-Integrationstests,
- **bestanden:** 9 .NET-Vertrags- und Architekturtests,
- **bestanden:** ESLint, TypeScript, Vue-Produktionsbuild und .NET-Release-Build,
- **nicht geprüft:** reale Geräteabnahme des ZXing-/manuellen QR-Rückfalls auf Android und iOS,
- **nicht geprüft:** Deployment dieses Redesign-Stands auf Delphi01 oder Olymp01,
- **nicht anwendbar:** PostgreSQL, weil PlauderBox im entschiedenen Stand keine eigene serverseitige Datenbank besitzt.

## Relevante Dateien

- `src/Program.cs`
- `src/PlauderBoxOptionen.cs`
- `src/Endpunkte/HappyHourEndpunkte.cs`
- `src/Endpunkte/TranskriptionsEndpunkte.cs`
- `src/Sicherheit/QuellUndUrsprungsMiddleware.cs`
- `src/Sicherheit/Ipv4Netz.cs`
- `src/Sicherheit/Freigabekontingent.cs`
- `src/PlauderBox.Logik/ITranskriptionsdienst.cs`
- `src/PlauderBox.Datenmanagement/OpenAiTranskriptionsdienst.cs`
- `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs`
- `src/PlauderBox.UI.Client/src/App.vue`
- `src/PlauderBox.UI.Client/src/composables/verwendeAppZustand.ts`
- `src/PlauderBox.UI.Client/src/composables/verwendeBegehung.ts`
- `src/PlauderBox.UI.Client/src/composables/verwendeAuswertungsWarteschlange.ts`
- `src/PlauderBox.UI.Client/src/composables/verwendeHappyHourUebergabe.ts`
- `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts`
- `src/PlauderBox.UI.Client/src/services/begehungsSpeicherMigration.ts`
- `src/PlauderBox.UI.Client/src/services/begehungsSpeicherValidierung.ts`
- `tests/Pruefe-Prototyp.ps1`

## Offene Punkte

- Der serverseitig persistente Duplikatschutz für Transkriptionsaufträge benötigt weiterhin einen eigenen Infrastrukturentscheid.
- Die Übergangsaliase unter `/api` dürfen erst gemäss E013 und nach einem eigenen Entscheid entfernt werden.
- Reale Android-/iOS-Tests bleiben gemäss [[T007 - Vollständigen mobilen Begehungsablauf prüfen]] offen.
- Eine Bereitstellung ist nicht Bestandteil des Redesign-Auftrags.

## Verknüpfungen

- [[D002 - Coding Guidelines für PlauderBox]]
- [[D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox]]
- [[D014 - Befunde aus dem Code-Review beheben]]
- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]
- [[E013 - HTTP-API versionieren und Uebergangsaliase beibehalten]]
- [[T007 - Vollständigen mobilen Begehungsablauf prüfen]]
