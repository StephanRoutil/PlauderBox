---
typ: loesungsdokumentation
id: LD009
status: intern-bereitgestellt-e2e-hauptfall-bestanden
datum: 2026-11-11
---

# LD009 – Kontrollierte Protokollpunkte an HappyHour übergeben

## Gültiger Stand

Der QR-Token wird beim bewussten Start zusammen mit der lokalen Begehung in IndexedDB gespeichert. Die Speichergrenze in `begehungsSpeicher.ts` überführt Vue-Reaktivitätsproxys zuvor in eine vollständig speicherbare Kopie und erhält Audio- sowie Bild-Blobs. Der Startbutton zeigt den laufenden Zustand; ein fehlgeschlagener lokaler Commit wird sichtbar gemeldet und öffnet keine scheinbar gestartete Begehung. `begehungsAblauf.ts` führt für jeden Eintrag die HappyHour-Protokollpunktart, die Zuständigkeit `Wer` und den expliziten Status `an_happyhour_uebertragen`. Vorbereitete Punkte übernehmen Art, ID und GUID aus dem Kontext. Bei neuen Punkten verlangt `EintragErfassen.vue` eine bewusste Artwahl aus den von HappyHour gelieferten Werten.

`normalisiereProjektAnsprechpartnerId` prüft jeden Kandidaten gegen die eindeutigen Projektansprechpartner-IDs des aktuellen Verteilers. Ein gültiger Kandidat bleibt erhalten. Andernfalls wird nur bei genau einer als Protokollschreiber markierten Projektansprechpartner-ID diese verwendet; ohne eindeutigen Schreiber bleibt der Wert `null`. `erstelleBegehung`, `erstelleEintragFuerProtokoll`, `bereiteWiederanlaufVor`, der Legacy-Import, `committeEintrag` und die Übergabegrenze wenden dieselbe Regel an. `eindeutigeVerteileroptionen` verhindert doppelte Auswahlwerte im Feld `Wer`.

Die Abschlussansicht bietet die Aktion zur HappyHour-Übergabe nur online und nur vor einer vollständigen Bestätigung. Der Punktvertrag wird durch die nachgelagerte Bildübergabe gemäss [[LD010 - Begehungsbilder kontrolliert an HappyHour übertragen]] ergänzt. Fehler unterscheiden fehlende Verbindung, abgelaufene Freigabe, Konflikt, ungültige Daten, ungültige Antwort und technische Nichterreichbarkeit. Lokale Daten werden in keinem Fehlerfall entfernt.

`happyHourProtokollpunktUebergabe.ts` prüft GUIDs, Vollständigkeit und doppelte vorbereitete IDs. Es sendet ausschliesslich Token sowie die kontrollierte Allowlist aus Erfassungs-ID, vorbereiteter Punkt-ID, Protokollpunktart, `Wer`/`intProjektAnsprechpartnerFKID`, Gruppe, Thema, Inhalt und Rechtsverweis an den gleichursprünglichen Endpunkt `/api/v1/happyhour/protokollpunkte/uebergeben`; Bilder und Rohtranskript sind nicht Bestandteil des JSON-Vertrags.

Die providerunabhängigen Typen und die serverseitige Sammelprüfung liegen in `PlauderBox.Logik/HappyHourProtokollpunktUebergabe.cs`. `HappyHourFreigabeQuelle` im Datenmanagement kapselt den einzelnen HappyHour-POST und validiert dessen Bestätigung. `Program.cs` verdrahtet beide Schichten und bildet technische beziehungsweise fachliche Fehler auf begrenzte Browserantworten ab. Die HappyHour-HttpClient-Logger bleiben vollständig entfernt, damit der Tokenpfad nicht geloggt wird.

HappyHour schreibt jeden Punkt einzeln idempotent. Bestätigt der Sammellauf nicht alle Punkte, bleibt der lokale Zustand unverändert. Ein erneuter Gesamtlauf verwendet dieselben GUIDs und darf deshalb bereits geschriebene Punkte nicht duplizieren. Erst nach vollständiger Bestätigung speichert `App.vue` Zeitpunkt und Status der lokalen Übergabe.

## Relevante Dateien

- `src/PlauderBox.Logik/HappyHourProtokollpunktUebergabe.cs`
- `src/PlauderBox.Logik/HappyHourProtokollKontext.cs`
- `src/PlauderBox.Logik/Client/begehungsAblauf.ts`
- `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs`
- `src/Program.cs`
- `src/PlauderBox.UI.Client/src/services/happyHourProtokollpunktUebergabe.ts`
- `src/PlauderBox.UI.Client/src/components/EintragErfassen.vue`
- `src/PlauderBox.UI.Client/src/components/BegehungAbschluss.vue`
- `src/PlauderBox.UI.Client/src/App.vue`

## Nachweis

- 51 Frontendtests in acht Dateien, Typecheck und Produktionsbuild bestanden. Darin enthalten sind die Wer-Normalisierung mit Verteilergrenzfällen, vorbereiteten und alten Punkten, Legacy-Import, tatsächlicher protokollbezogener Default-Erzeugung sowie ein Fake-IndexedDB-Roundtrip.
- .NET-Release-Build mit 0 Warnungen und 0 Fehlern sowie erweiterte HappyHour-Provider-Vertragstests bestanden.
- Vollständiger Prüflauf einschliesslich Offline-App-Shell und Token-Logschutz bestanden.
- Korrigiertes Docker-Image `sha256:d158963bf107…` auf Delphi01 bereitgestellt; Root und Status liefern HTTP 200 und das neue Frontend-Asset wird ausgeliefert. Der vorherige Stand bleibt als `plauderbox:delphi01-test-before-startfix` verfügbar.
- Der gültige Android-Schreibhauptfall ist am 11.11.2026 mit Protokoll 378 bestanden. HappyHour zeigt danach vier Punkte: Zwei bestehende Punkte wurden per `UPDATE` mit Stephan als `Wer` aktualisiert; zwei neue Punkte wurden per `INSERT` mit Tanja beziehungsweise Stephan als `Wer` angelegt. Damit ist `intProjektAnsprechpartnerFKID` gegen echte HappyHour-Testdaten sowohl für Aktualisierung als auch Neuerstellung bestätigt.
- Bilder blieben vertragsgemäss lokal. Bei einem der neu angelegten Punkte ist in HappyHour kein Dokument erfasst; eine Bild- oder Dokumentübertragung wird nicht behauptet.
- Der reale Wiederholungs- und Teilabbruchfall bleibt offen; siehe [[T008 - Idempotente HappyHour-Protokollpunktübergabe prüfen]].

## Grenzen

- Der Punkt-JSON-Vertrag enthält keine Bilder; die separate Bildübergabe nach `tblDokument` ist in LD010 beschrieben.
- Die Freigabe ist weiterhin cachebasiert und nur für den internen Testbetrieb vorgesehen.
- PlauderBox ändert keinen Protokollstatus und versendet nichts.

## Verknüpfungen

- [[D012 - Kontrollierte Protokollpunkte an HappyHour übergeben]]
- [[E008 - Protokollpunkte idempotent über den PlauderBox-Server schreiben]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
