---
typ: lösungsdokumentation
id: LD010
status: intern-bereitgestellt-e2e-offen
datum: 2026-11-11
---

# LD010 - Begehungsbilder kontrolliert an HappyHour übertragen

## Umgesetzter lokaler Stand

`happyHourProtokollpunktUebergabe.ts` übergibt zuerst die kontrollierten Punktfelder. Aus der vollständig geprüften Antwort ordnet es jeder lokalen Erfassungs-ID die bestätigte HappyHour-Protokollpunkt-ID zu. Anschliessend sendet es jedes Bild mit dem beim Hinzufügen gespeicherten Aufnahmezeitpunkt als eigenes `FormData` an den PlauderBox-Server. Der Browser erhält den HappyHour-Token nie in einer URL.

`Program.cs` begrenzt die Browser-Multipart-Anfrage auf eine gültige Punkt-ID, Bild-GUID, Freigabe, einen gültigen ISO-8601-Aufnahmezeitpunkt und genau eine Datei bis 15 MB. Der Endpunkt ist zusätzlich auf 500 Bildanfragen je Stunde und Quelladresse begrenzt. `HappyHourFreigabeQuelle.cs` leitet den unveränderten Binärinhalt und den normalisierten UTC-Aufnahmezeitpunkt an den gebundenen HappyHour-Pfad weiter und prüft Bild-GUID, Punkt-ID und Dokument-ID der Antwort. HappyHour erteilt den eigenen Scope `bilder_schreiben` nur bei Dokument-Neurecht und begrenzt jede Freigabe auf 500 Bildversuche und 2 GB.

`bildSicherung.ts` speichert für neue Kamera- und Galeriedateien den vom Browser gelieferten Dateizeitpunkt. Die interne IndexedDB-Datei sowie die über die gemeinsame Sicherungsaktion erzeugten Dateien verwenden weiterhin den ursprünglichen Blob. Eine für die PDF-Ausgabe erforderliche Verkleinerung findet nicht in PlauderBox statt.

Die Methode meldet erst Erfolg, wenn sämtliche Bilder bestätigt sind. Bei einer ungültigen oder abgebrochenen Antwort wird die vorhandene Begehung nicht verändert. Der bereits vorhandene Abschluss-Button zur zusätzlichen externen Sicherung aller Einzelbilder bleibt unverändert.

`BegehungAbschluss.vue` erkennt ausserdem ältere Begehungen, deren Punkte bereits übertragen wurden, während `bilderUebertragenAm` noch fehlt. Es bietet dafür ausdrücklich «Bilder an HappyHour nachliefern» an. Die Punktübergabe wird idempotent wiederholt, um die bestätigten Punkt-IDs erneut zu erhalten; danach folgt der normale Bildweg. Lokale Bilder werden dabei nicht entfernt. Nach vollständiger Bildbestätigung verhindert `bilderUebertragenAm` eine weitere Übergabe.

## Relevanter Code

- `src/PlauderBox.UI.Client/src/services/happyHourProtokollpunktUebergabe.ts`
- `src/PlauderBox.UI.Client/src/services/happyHourProtokollpunktUebergabe.test.ts`
- `src/PlauderBox.Logik/HappyHourProtokollpunktUebergabe.cs`
- `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs`
- `src/Program.cs`
- `src/PlauderBox.UI.Client/src/App.vue`
- `src/PlauderBox.UI.Client/src/components/BegehungAbschluss.vue`
- `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts`

## Nachweis

- 67 Frontendtests in 10 Testdateien bestanden; enthalten sind Aufnahmezeitpunkt, unveränderte Originalsicherung, Bildnachlieferung einer älteren punktseitig übertragenen Begehung und die Sperre nach bestätigter Bildübergabe.
- TypeScript-Prüfung und Vue-Produktionsbuild bestanden.
- .NET-Release-Build ohne Warnungen oder Fehler und Vertragstests bestanden.
- Offline-App-Shell und Token-Logschutz bestanden.
- HappyHour-seitige Vollkompilierung bestanden.
- Das WCF-korrigierte Image `sha256:67c6b0c823a2…` lief auf Delphi01. Beim ersten mobilen Hauptfall wurden die Punkte angelegt, der Browser rief den Bildendpunkt jedoch nicht auf. Die Nachlieferung wurde qualitätsgeprüft und mit Image `sha256:6a966c2aa0bc…` auf Delphi01 bereitgestellt. HTTPS-Status, KI-Bereitschaft, neuer Service-Worker-Cache und die ausgelieferten Merkmale `Bilder an HappyHour nachliefern` sowie `bilderUebertragenAm` sind geprüft. Die mobile Ablageprüfung bleibt offen.

## Verknüpfungen

- `D013 - Begehungsbilder an bestätigte HappyHour-Protokollpunkte übergeben.md`
- `E010 - Begehungsbilder nach bestätigter Punktzuordnung einzeln übertragen.md`
- `T009 - Idempotente HappyHour-Bildübergabe prüfen.md`
