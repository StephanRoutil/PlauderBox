---
typ: test
id: T008
status: automatisiert-und-e2e-hauptfall-bestanden
datum: 2026-11-11
anforderung: D012
---

# T008 – Idempotente HappyHour-Protokollpunktübergabe prüfen

## Automatisiert bestanden

- Browservertrag übermittelt ausschliesslich die kontrollierte Allowlist einschliesslich `Wer` als `intProjektAnsprechpartnerFKID`; Bilder und Rohtranskript fehlen im JSON.
- Konflikt verändert den lokalen Zustand nicht.
- Doppelte Zuordnung derselben vorbereiteten Punkt-ID wird vor dem Netzaufruf abgewiesen.
- Serverlogik erkennt ungültigen Token, Anzahl, doppelte GUIDs, doppelte vorbereitete IDs, Pflichtfelder und Längen.
- Datenmanagement verwendet den exakten HappyHour-POST-Pfad und mappt GUID, Punkt-ID und Erstellungsstatus.
- Die Wer-Regel ist für Nicht-Schreiber vor Schreiber, keinen beziehungsweise mehrere eindeutige Schreiber, gültige Kandidaten, fremde vorbereitete IDs, alte Einträge, Legacy-Import, deduplizierte Verteileroptionen, tatsächliche Default-Erzeugung und IndexedDB-Roundtrip getestet. Die Übergabe normalisiert `0` clientseitig; die Serververtragsprüfung weist `intProjektAnsprechpartnerFKID = 0` ab.
- Typecheck, 51 Frontendtests in acht Dateien, Produktionsbuild, .NET-Build, Vertragstests, Offline-App-Shell und Token-Logschutz bestanden. Der mobile Start ist gegen Vue-Proxyobjekte an der IndexedDB-Grenze regressionsgetestet.
- Delphi01: Das korrigierte Image `sha256:d158963bf107…` liefert für Root/Status HTTP 200 und das erwartete neue Frontend-Asset.
- Der unabhängige Qualitäts-Nachreview bestätigte alle sechs Korrekturen ohne verbleibenden P1-, P2- oder P3-Befund.

## Manuell bestanden

1. Neue Freigabe von Protokoll 378 auf Android eingelesen.
2. Den vollständigen Ablauf kontrolliert, lokal abgeschlossen und bewusst an HappyHour übergeben.
3. HappyHour zeigt danach vier Punkte im Protokoll 378. Zwei bereits bestehende Punkte wurden per `UPDATE` aktualisiert und führen Stephan als `Wer`.
4. Zwei neue Punkte wurden per `INSERT` angelegt; einer führt Tanja, der andere Stephan als `Wer`.
5. `intProjektAnsprechpartnerFKID` ist damit real sowohl für den `UPDATE`- als auch den `INSERT`-Pfad bestätigt.
6. Bilder wurden vertragsgemäss nicht übertragen und bleiben lokal. Bei einem der neuen Punkte ist in HappyHour kein Dokument erfasst.

## Manuell offen

1. Dieselben GUIDs erneut senden und unveränderte IDs sowie Punktanzahl prüfen.
2. Verbindung nach einem bestätigten Teilpunkt unterbrechen und Gesamtlauf wiederholen.
3. Konfliktnegativfälle gegen echte Testdaten ausführen.

## Bewertung

Der automatisierte und technische Bereitstellungsnachweis sowie der fachliche End-to-End-Hauptfall mit real bestätigter Zuständigkeit bei `INSERT` und `UPDATE` sind grün. Der echte Wiederholungs- und Teilabbruchfall bleibt als vertiefte Robustheitsprüfung offen; der Status wird deshalb nicht darüber hinaus angehoben.
