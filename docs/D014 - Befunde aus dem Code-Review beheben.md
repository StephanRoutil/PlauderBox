---
typ: anforderung
id: D014
status: freigegeben
datum: 2026-11-12
---

# D014 – Befunde aus dem Code-Review beheben

## Ziel

Die im Code-Review vom 12.11.2026 belegten Abweichungen von [[D002 - Coding Guidelines für PlauderBox]] und [[D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox]] werden schrittweise behoben. Jeder Schritt ist einzeln umsetzbar, einzeln prüfbar und einzeln committbar.

## Prüfbereich und Ausschlüsse

- Geprüft wurden der Dateistand vom 12.11.2026 in `src`, `tests`, `deploy`, `Dockerfile` sowie die Dokumente unter `docs`. Es wurde nichts gebaut und nichts ausgeführt; alle Befunde stammen aus dem Lesen von Code und Dokumentation.
- Nicht geprüft: `node_modules`, `bin`, `obj`, `src/wwwroot`, das Image-Archiv im Projektstamm, `docs/Ablauf.pdf`, `docs/Ablauf.vsdm`, `docs/assets` und die HappyHour-Seite der Schnittstelle.
- Zeilenangaben sind einbasiert und beziehen sich auf den Stand vom 12.11.2026. Vor jeder Änderung ist die Fundstelle am aktuellen Stand zu bestätigen.

## Arbeitsregeln für die Umsetzung

1. Die Schritte werden in der Reihenfolge S01 bis S46 bearbeitet; als behoben markierte Schritte entfallen. Ein Schritt mit dem Vermerk **Entscheid erforderlich** oder **Eigener Auftrag** wird übersprungen, bis der Product Owner ihn freigibt.
2. Pro Schritt entsteht genau ein Commit mit der Schritt-ID im Betreff, zum Beispiel `S06: Bildtyp serverseitig prüfen`.
3. Vor jedem Commit besteht `tests\Pruefe-Prototyp.ps1` vollständig. Schlägt der Prüflauf fehl, wird der Schritt nicht committet.
4. Fachverhalten, HTTP-Verträge und Benutzertexte bleiben unverändert, sofern der Schritt nichts anderes verlangt.
5. Neue Paketabhängigkeiten werden nur dort eingeführt, wo der Schritt sie ausdrücklich nennt.
6. Es erfolgt kein Deployment und keine Änderung an Caddy, DNS, Firewall oder laufenden Containern. Änderungen unter `deploy` betreffen nur die versionierten Dateien.
7. Stimmt ein Befund am aktuellen Stand nicht mehr, wird der Schritt mit kurzer Begründung als nicht anwendbar gemeldet und nicht umgesetzt.
8. Nach Abschluss eines Blocks wird die betroffene Lösungsdokumentation nachgeführt.

Prioritäten folgen D003: `P1` erhebliche Verletzung einer Muss-Anforderung oder Sicherheitsgrenze, `P2` relevanter Qualitätsmangel, `P3` begrenzte Pflege- oder Verständlichkeitsabweichung.

## Block A – Stand sichern

### S01 – Arbeitsstand versionieren (P2)

- **Status (Nachprüfung 12.11.2026):** **behoben** – Der Stand ist in drei Commits versioniert und nach `origin/main` übertragen. Folgepunkt siehe S33.
- **Befund:** Der letzte Commit im Reflog stammt vom 10.11.2026, 09:19. Die meisten Quelldateien tragen ein späteres Änderungsdatum, darunter `src/Program.cs`, `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs` und die Dateien unter `deploy/olymp01-live`.
- **Auftrag:** Mit `git status` den tatsächlichen Stand feststellen. Die offenen Änderungen in fachlich getrennten Commits versionieren und nach `origin/main` übertragen. Vor dem Commit sicherstellen, dass keine Datei aus `deploy/**/secrets` und keine `appsettings.Local.json` enthalten ist.
- **Nachweis:** `git status` meldet einen sauberen Arbeitsbaum; `git log origin/main` enthält die Commits.

### S02 – Image-Archive vom Repository ausschliessen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `.gitignore` schliesst `*.tar.gz` und `tests/.temp/` aus.
- **Befund:** `plauderbox-olymp01-20261112.tar.gz` liegt im Projektstamm; `.gitignore` enthält keine Regel für Archive.
- **Auftrag:** `*.tar.gz` und `tests/.temp/` in `.gitignore` aufnehmen. Das Archiv selbst nicht löschen.
- **Nachweis:** `git status` führt das Archiv nicht als unversionierte Datei auf.

## Block B – Sicherheit und Fehlergrenzen

### S03 – Unbehandelte Ausnahmen an der Servergrenze abfangen (P2, PB-CS-003)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Der Strukturierer überführt `JsonException` und `InvalidOperationException` in `InvalidDataException` und prüft die Werttypen; der Transkriptionsendpunkt behandelt `JsonException`; `UseExceptionHandler` liefert ein generisches `ProblemDetails`. Integrationstests vorhanden. Folgepunkt siehe S44.
- **Fundstelle:** `src/Program.cs` Zeilen 402–432; `src/PlauderBox.Datenmanagement/OpenAiProtokollpunktStrukturierer.cs` Zeilen 80–87 und 96–112.
- **Befund:** `JsonDocument.ParseAsync` und `JsonSerializer.Deserialize` werfen `JsonException`; behandelt wird nur `InvalidDataException`. `EnumerateArray` wirft bei unerwartetem JSON-Typ `InvalidOperationException`. Beides führt zu HTTP 500 statt 502. Ein globaler Ausnahmehandler fehlt.
- **Auftrag:** Im Strukturierer `JsonException` und `InvalidOperationException` in `InvalidDataException` überführen und vor `EnumerateArray` den Werttyp prüfen. Im Transkriptionsendpunkt `JsonException` wie `InvalidDataException` behandeln. Zusätzlich `UseExceptionHandler` registrieren, der ein `ProblemDetails` ohne technische Details mit Status 500 liefert.
- **Nachweis:** Vertragstest mit ungültigem JSON und mit `"output": {}` erwartet `InvalidDataException`; Integrationstest gemäss S24 erwartet 502.

### S04 – Ratenlimit für Freigabeabruf und Punktübergabe ergänzen (P2, PB-CS-004)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Richtlinien `Freigabeabruf` (60) und `Punktuebergabe` (30) sind an die Endpunkte gebunden; Integrationstest für 429 vorhanden.
- **Fundstelle:** `src/Program.cs` Zeilen 128–160 und 162–205.
- **Befund:** `GET /api/happyhour/freigaben/{freigabeToken}` und `POST /api/happyhour/protokollpunkte/uebergeben` besitzen weder `RequireRateLimiting` noch ein Freigabekontingent. Die Übergabe löst je Anfrage bis zu 200 HappyHour-Aufrufe aus.
- **Auftrag:** Zwei Richtlinien `Freigabeabruf` und `Punktuebergabe` analog zu Zeilen 63–78 anlegen, nach `LadeQuellPartition` partitionieren und an beide Endpunkte binden. Startwerte: 60 Abrufe und 30 Übergaben je Stunde und Quelle.
- **Nachweis:** Integrationstest: Anfrage oberhalb der Grenze ergibt 429, ohne dass der HappyHour-Client aufgerufen wird.

### S05 – Freigabekontingent als festes Zeitfenster führen (P2)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `Freigabekontingent` führt Fensterbeginn und Zähler mit fester Ablaufzeit und steuerbarer Zeitquelle.
- **Fundstelle:** `src/Program.cs` Zeilen 455–470.
- **Befund:** `cache.Set(schluessel, anzahl + 1, TimeSpan.FromHours(1))` setzt die Ablaufzeit bei jeder Reservierung neu. Das Fenster endet erst eine Stunde nach der letzten Anfrage.
- **Auftrag:** Zähler zusammen mit dem Fensterbeginn speichern und die absolute Ablaufzeit nur beim ersten Eintrag setzen. Die Funktion in eine eigene, testbare Klasse verschieben.
- **Nachweis:** Unittest mit steuerbarer Zeit: Nach 60 Minuten ab der ersten Reservierung ist das Kontingent wieder frei, auch bei fortlaufenden Anfragen.

### S06 – Bilder serverseitig auf Medientyp und Inhalt prüfen (P2, PB-CS-004)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `Bildpruefung` in der Logik prüft Medientyp gegen Dateisignatur; der Endpunkt weist Abweichungen mit 400 ab; der Rückfall auf `application/octet-stream` ist entfernt.
- **Fundstelle:** `src/Program.cs` Zeilen 253–276; `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs` Zeilen 136–139.
- **Befund:** Die Allowlist JPEG, PNG, GIF und TIFF existiert nur im Browser. Der Server prüft nur Grösse und Anzahl; ein unbekannter Medientyp wird als `application/octet-stream` an HappyHour weitergereicht.
- **Auftrag:** In der Logik eine Prüfung `Bildpruefung` anlegen, die Medientyp und Dateisignatur (JPEG `FF D8 FF`, PNG `89 50 4E 47`, GIF `47 49 46 38`, TIFF `49 49 2A 00` oder `4D 4D 00 2A`) gegeneinander prüft. Der Bildendpunkt weist Abweichungen mit 400 ab, bevor HappyHour aufgerufen wird. Den Rückfall auf `application/octet-stream` entfernen.
- **Nachweis:** Vertragstest für jede Signatur und für einen Fehlfall; Integrationstest: `text/plain` und falsche Signatur ergeben 400 ohne HappyHour-Aufruf.

### S07 – Inhaltslänge der Protokollpunkte begrenzen (P3, PB-CS-004)

- **Status (2. Nachprüfung 12.11.2026):** **offen** – Entscheid ausstehend; `IstUngueltig` begrenzt `Inhalt` weiterhin nicht.
- **Fundstelle:** `src/PlauderBox.Logik/HappyHourProtokollpunktUebergabe.cs` Zeilen 70–76.
- **Befund:** `Gruppe`, `Thema` und `Rechtsverweis` sind auf 250 Zeichen begrenzt, `Inhalt` nicht.
- **Entscheid erforderlich:** Die zulässige Maximallänge von `txtProtokollpunkt` in HappyHour ist festzulegen.
- **Auftrag nach Entscheid:** Obergrenze in `IstUngueltig` ergänzen und im Formular von `EintragErfassen.vue` als `maxlength` spiegeln.
- **Nachweis:** Vertragstest mit Grenzwert und Grenzwert plus eins.

### S08 – Öffentliche Statusauskunft reduzieren (P3, PB-SEC-001)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `/api/v1/status` und der Alias liefern nur `kiBereit`; Modellnamen stehen im Startlog.
- **Fundstelle:** `src/Program.cs` Zeilen 120–126.
- **Befund:** `/api/status` liefert ohne Freigabe Modellnamen und den Konfigurationshinweis. Der Vue-Client ruft den Endpunkt nicht auf.
- **Auftrag:** Antwort auf `kiBereit` beschränken. Modellnamen und Hinweis nur noch ins Serverlog beim Start schreiben, ohne Schlüssel oder Dateipfad.
- **Nachweis:** Integrationstest: Antwort enthält ausschliesslich `kiBereit`.

### S09 – Bild- und Audioverarbeitung ohne doppelte Speicherkopie (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `ProtokollpunktBildUebergabe` trägt einen `Stream`, der Provider verwendet `StreamContent`; `MemoryBufferThreshold` ist nicht mehr gesetzt.
- **Fundstelle:** `src/Program.cs` Zeilen 34–38 und 265–275; `src/PlauderBox.Logik/HappyHourProtokollpunktUebergabe.cs` Zeilen 18–24.
- **Befund:** `MemoryBufferThreshold` beträgt 20 MiB; das Bild wird zusätzlich in einen `MemoryStream` und danach in ein Byte-Array kopiert. Der Container ist auf 512 MB begrenzt.
- **Auftrag:** `ProtokollpunktBildUebergabe` auf einen `Stream` umstellen und im Provider `StreamContent` verwenden. Für die Signaturprüfung aus S06 nur die ersten Bytes lesen. `MemoryBufferThreshold` auf den Standardwert zurücksetzen; das Formular puffert dann nach `/tmp`.
- **Nachweis:** Vertragstest der Bildübergabe bleibt grün; Integrationstest mit 15-MB-Bild besteht.

### S10 – Permissions-Policy versionieren (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `Permissions-Policy` und `frame-ancestors 'self'` sind in der Middleware gesetzt und getestet.
- **Fundstelle:** `src/Program.cs` Zeilen 93–96; `deploy/olymp01-live/Caddyfile.snippet`; Aussage in [[T010 - PlauderBox Livebetrieb auf Olymp01 prüfen]].
- **Befund:** T010 nennt eine Permissions Policy; in den versionierten Dateien ist keine gesetzt.
- **Auftrag:** In der Middleware `Permissions-Policy: camera=(self), microphone=(self), geolocation=()` setzen und `frame-ancestors 'self'` in die Content-Security-Policy aufnehmen.
- **Nachweis:** Integrationstest prüft beide Header.

### S11 – Testumgebung nicht im Entwicklungsmodus betreiben (P3, PB-CS-003)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Die versionierte Datei nennt `Production`. Die Aktivierung auf Delphi01 bleibt ein eigener Auftrag, siehe S45.
- **Fundstelle:** `deploy/delphi01-test/compose.yaml` Zeile 11.
- **Befund:** `ASPNETCORE_ENVIRONMENT: Development` aktiviert auf Delphi01 die ausführliche Fehlerseite.
- **Auftrag:** Wert in der versionierten Datei auf `Production` setzen. **Eigener Auftrag** für die Aktivierung auf Delphi01.
- **Nachweis:** Datei geändert; `Pruefe-Prototyp.ps1` prüft den Wert.

## Block C – Architektur

### S12 – Transkription ins Datenmanagement verlagern (P2, PB-ARC-003)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `ITranskriptionsdienst` und `AudioformatPruefung` liegen in der Logik, `OpenAiTranskriptionsdienst` im Datenmanagement; Vertragstests für Erfolg, 401, 429, 400 und Zeitüberschreitung sind vorhanden.
- **Fundstelle:** `src/Program.cs` Zeilen 361–432.
- **Befund:** Der OpenAI-Transkriptionsaufruf liegt im HTTP-Endpunkt der UI-Schicht. [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]] nennt die Zerlegung als ausstehend.
- **Auftrag:** In der Logik den Vertrag `ITranskriptionsdienst` mit providerfreiem Ergebnis und eigenen Ausnahmetypen anlegen. In `PlauderBox.Datenmanagement` `OpenAiTranskriptionsdienst` implementieren. Die Medientyp-Zuordnung (Zeilen 361–372) als Fachregel in die Logik legen. Der Endpunkt prüft Eingaben und ruft nur noch Verträge auf.
- **Nachweis:** Vertragstest mit Aufzeichnungshandler für Erfolg, 401, 429, 400 und Zeitüberschreitung; `Program.cs` enthält keinen Verweis mehr auf `audio/transcriptions`.

### S13 – Program.cs in Composition Root, Endpunkte und Middleware zerlegen (P2, PB-ARC-005)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `Program.cs` umfasst 81 Zeilen; Endpunkte, Middleware, Netzprüfung, Kontingent und Optionen sind eigene Dateien; die Fehlerabbildung steht einmal. Folgepunkt siehe S38.
- **Fundstelle:** `src/Program.cs`, 517 Zeilen.
- **Befund:** Die Datei enthält Konfiguration, Middleware, vier Endpunkte, Kontingentlogik und Netzprüfung. Dieselbe Abfolge von `catch`-Blöcken steht fünffach (Zeilen 138–159, 181–204, 226–241, 279–306 und 325–340).
- **Auftrag:** Im UI-Projekt anlegen: `Endpunkte/HappyHourEndpunkte.cs`, `Endpunkte/TranskriptionsEndpunkte.cs`, `Sicherheit/QuellUndUrsprungsMiddleware.cs`, `Sicherheit/Ipv4Netz.cs`, `Sicherheit/Freigabekontingent.cs` und `PlauderBoxOptionen.cs`. Die Abbildung der HappyHour-Ausnahmen auf `ProblemDetails` an genau einer Stelle führen. Grenzwerte (20 MiB, 15 MB, 60, 1000, 20, 500, 200) als benannte Optionen mit den heutigen Werten als Standard führen. `Program.cs` enthält danach nur noch Registrierung und Verdrahtung und endet mit `public partial class Program;`.
- **Nachweis:** `Program.cs` unter 120 Zeilen; Routen, Statuscodes und Meldungstexte unverändert; Prüflauf grün.

### S14 – Schichtenabhängigkeiten automatisiert prüfen (P2, PB-ARC-001, D003 Q1)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `tests/PlauderBox.Vertragstests/Architekturpruefung.cs` prüft Referenzen und öffentliche Signaturen einschliesslich Negativproben.
- **Befund:** Die Schichtregel ist nur über Projektreferenzen abgesichert; ein Architekturtest fehlt.
- **Auftrag:** Test ergänzen, der per Reflection prüft: `PlauderBox.Logik` referenziert keine andere PlauderBox-Assembly; `PlauderBox.Datenmanagement` referenziert nur `PlauderBox.Logik`; öffentliche Typen der Logik verwenden keine Typen aus `System.Net.Http`.
- **Nachweis:** Test besteht und schlägt fehl, wenn probeweise eine verbotene Referenz gesetzt wird.

### S15 – HTTP-Verträge versionieren (P2, PB-API-001)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Entschieden in [[E013 - HTTP-API versionieren und Uebergangsaliase beibehalten]]; Endpunkte liegen unter `/api/v1` mit Alias `/api`; der Client ruft nur `/api/v1` auf. Folgepunkt siehe S42.
- **Befund:** Alle Routen liegen unversioniert unter `/api/...`.
- **Entscheid erforderlich:** Versionsschema und Übergangsfrist für bereits installierte PWAs sind als E-Dokument festzulegen.
- **Auftrag nach Entscheid:** Endpunkte unter `/api/v1` bereitstellen, die bisherigen Pfade für die Übergangsfrist als Alias behalten, Client umstellen.
- **Nachweis:** Integrationstest für beide Pfade; Client ruft nur noch `/api/v1` auf.

### S16 – Architekturbeschreibung mit dem Code abgleichen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `AGENTS.md`, E003, E005 und D002 nennen keine serverseitige Persistenz mehr als Ist-Zustand.
- **Fundstelle:** `AGENTS.md` Abschnitt Architektur; [[E003 - Offlinefähige PWA mit modularem Monolithen verwenden]].
- **Befund:** PostgreSQL und Dateispeicher sind als Teil des Datenmanagements beschrieben; im Code existiert keine serverseitige Persistenz.
- **Entscheid erforderlich:** Der Product Owner legt fest, ob die Beschreibung als Zielbild gekennzeichnet oder gestrichen wird.
- **Nachweis:** Dokumente unterscheiden Ist-Zustand und Zielbild eindeutig.

## Block D – Wartbarkeit und Clean Code

### S17 – Gemeinsame Konstanten und Prüfungen zentral führen (P2, PB-ARC-002)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `src/PlauderBox.Logik/Client/clientPruefungen.ts` führt Muster, Bildtypen und Grössengrenze je einmal; Unittests vorhanden.
- **Fundstelle:** Token-Muster in `begehungsSpeicher.ts` Zeile 114, `happyHourProtokollpunktUebergabe.ts` Zeile 19, `happyHourProtokollKontext.ts` Zeile 19 und `auswertungsDienst.ts` Zeile 17; UUID-Muster in `happyHourProtokollpunktUebergabe.ts` Zeilen 31 und 80; Bildtypen in `bildSicherung.ts` Zeile 13 und `happyHourProtokollpunktUebergabe.ts` Zeile 82; 15-MB-Grenze in beiden Dateien.
- **Auftrag:** In `src/PlauderBox.Logik/Client` die Funktionen `istFreigabeToken`, `istErfassungsId`, `istUnterstuetzterBildtyp` und die Konstante `maximaleBildgroesse` anlegen und alle Fundstellen darauf umstellen.
- **Nachweis:** Die Muster kommen im Client-Quellcode je genau einmal vor; Unittests für alle vier Exporte.

### S18 – Dateiendung der Bildsicherung korrigieren (P2)

- **Status (Nachprüfung 12.11.2026):** **behoben** – Die Endung wird aus dem zentralen Bildtyp abgeleitet; TIFF ergibt `.tiff`.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/bildSicherung.ts` Zeilen 96–104.
- **Befund:** `ermittleEndung` kennt `webp`, `heic`, `heif` und `bmp`, obwohl diese Formate nicht zugelassen sind. `tif` und `tiff` fehlen; ein zugelassenes TIFF ohne passende Endung wird als `.jpg` benannt.
- **Auftrag:** Endungen aus der zentralen Bildtyp-Liste von S17 ableiten; nicht zugelassene Formate entfernen.
- **Nachweis:** Unittest: TIFF ergibt `.tiff`, GIF `.gif`, PNG `.png`, JPEG `.jpg`.

### S19 – HappyHour-Provider entdoppeln (P3, PB-ARC-005)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `SendeAsync`, `LeseAntwortAsync` und `ErstelleAdresse` sind extrahiert; die Transportobjekte liegen in `HappyHourTransportobjekte.cs`.
- **Fundstelle:** `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs` Zeilen 10–192.
- **Befund:** Drei Methoden wiederholen Tokenprüfung, Senden, Statusabbildung und JSON-Lesen.
- **Auftrag:** Eine private Methode für Senden und Statusabbildung sowie eine für das Lesen der Antwort extrahieren. Die Transportobjekte in eine eigene Datei im selben Projekt verschieben und `internal` halten.
- **Nachweis:** Vertragstests unverändert grün; die Statusabbildung steht einmal im Code.

### S20 – Ablaufsteuerung aus App.vue herauslösen (P2, PB-TS-002, PB-TS-003)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `App.vue` enthält nur noch Verdrahtung und Vorlage; drei Composables mit typisierten Zuständen und Unittests sind vorhanden. Folgepunkte siehe S35 und S37.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/App.vue`, Skriptteil mit rund 250 Zeilen und zwölf Zustandsvariablen.
- **Befund:** Die Wurzelkomponente steuert Freigabe, Start, Erfassung, Auswertung, Warteschlange, Übergabe und Verwerfen und ruft `window.confirm` direkt auf.
- **Auftrag:** Composables `verwendeBegehung`, `verwendeAuswertungsWarteschlange` und `verwendeHappyHourUebergabe` anlegen. Abhängigkeiten (Speicher, Abruf, Bestätigungsdialog, Verbindungsstatus) als Parameter übergeben. Laufzustände als typisierte Zustände statt einzelner Wahrheitswerte führen. In `werteEintragAus` einen Speicherfehler im Fehlerzweig abfangen und sichtbar melden.
- **Nachweis:** `App.vue` enthält nur noch Verdrahtung und Vorlage; Unittests der Composables decken Start, Auswertungsfehler, Wiederanlauf, Übergabefehler und Freigabeerneuerung ab.

### S21 – Mikrofonaufnahme hinter einem Vertrag kapseln (P2, PB-TS-002)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `services/audioRekorder.ts` kapselt die Aufnahme; Unittests für Start, Stopp, leere Aufnahme und verweigerten Zugriff sind vorhanden.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/components/EintragErfassen.vue` Zeilen 17–109.
- **Befund:** `MediaRecorder` und `getUserMedia` werden direkt in der Komponente verwendet.
- **Auftrag:** `services/audioRekorder.ts` mit Schnittstelle und Browser-Implementierung nach dem Muster von `qrCodeScanner.ts` anlegen und der Komponente als Eigenschaft mit Standardwert übergeben.
- **Nachweis:** Unittest mit Attrappe für Start, Stopp, leere Aufnahme und verweigerten Zugriff.

### S22 – Formatierung und statische Analyse einführen (P3, PB-NAM-002, PB-CS-001)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `.editorconfig`, Prettier, ESLint und `Directory.Build.props` mit `TreatWarningsAsErrors` sind vorhanden; der Client-Code ist umgebrochen; `lint` ist Teil des Prüflaufs.
- **Befund:** `begehungsAblauf.ts` enthält 12 Zeilen mit über 200 Zeichen; `styles.css` umfasst rund 26 KB in 286 Zeilen; Vorlagen stehen grossteils einzeilig. `.editorconfig`, Linter und Analyzer fehlen.
- **Auftrag:** `.editorconfig` anlegen. Als Entwicklungsabhängigkeiten `prettier`, `eslint`, `typescript-eslint` und `eslint-plugin-vue` mit festen Versionen aufnehmen, Skripte `lint` und `format` ergänzen und den Client-Code einmalig in einem reinen Formatierungs-Commit umbrechen. In einer `Directory.Build.props` `TreatWarningsAsErrors` und `AnalysisLevel` `latest-recommended` setzen. `lint` in `Pruefe-Prototyp.ps1` aufnehmen.
- **Nachweis:** `pnpm run lint` und `dotnet build` ohne Warnungen; der Formatierungs-Commit enthält keine inhaltliche Änderung.

### S23 – Ungenutzten Code entfernen (P3)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `internerAufnahmespeicher.ts` mit Test und beide `Schichtinformation.cs` sind entfernt; `Start-PlauderBox.ps1` enthält keinen festen Schlüsselpfad mehr.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts` mit Test; `Schichtinformation.cs` in Logik und Datenmanagement; fester Pfad in `Start-PlauderBox.ps1` Zeile 3.
- **Befund:** `internerAufnahmespeicher.ts` wird von keinem produktiven Modul importiert; `legacyWiederherstellung.ts` liest die alte Datenbank selbst. Die Klassen `Schichtinformation` werden nicht verwendet. Das Startskript verweist auf eine Schlüsseldatei eines anderen Projekts.
- **Auftrag:** Verwendung per Suche bestätigen, dann Datei und Test entfernen. `Schichtinformation` entfernen, sobald der Architekturtest aus S14 besteht. Im Startskript den festen Pfad durch die Umgebungsvariable oder eine nicht versionierte lokale Konfiguration ersetzen.
- **Nachweis:** Typprüfung, Tests und Build grün; Legacy-Import-Tests unverändert grün.

## Block E – Tests

### S24 – Servergrenze mit Integrationstests absichern (P2, PB-TST-001)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `tests/PlauderBox.Integrationstests` deckt Quelle, Ursprung, Freigabe, Bildprüfung, Kontingent, Ratenlimit, Fehlergrenze, Status und Header ab. Folgepunkte siehe S40 und S42.
- **Befund:** Middleware und Endpunkte sind nur über Textvergleiche am Quellcode und einen Rauchtest in `tests/Pruefe-Prototyp.ps1` (Zeilen 38–42 und 58–64) abgedeckt.
- **Auftrag:** Testprojekt `tests/PlauderBox.Integrationstests` mit `xunit` und `Microsoft.AspNetCore.Mvc.Testing` anlegen. HappyHour- und OpenAI-Verträge durch Attrappen ersetzen. Mindestfälle: fremde Quelle 403; POST ohne zulässigen Ursprung 403; Transkription ohne Freigabe 401, mit ungültiger Freigabe 410; Bildübergabe mit abweichendem Formulartoken 410; Kontingent und Ratenlimit 429; Fälle aus S03, S04, S06, S08 und S10. Die ersetzten Textvergleiche aus dem Skript entfernen.
- **Nachweis:** `dotnet test` grün und Teil von `Pruefe-Prototyp.ps1`.

### S25 – Vertragstests auf ein Testframework umstellen (P3, PB-TST-003)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Die Vertragstests laufen mit xUnit über `dotnet test`.
- **Fundstelle:** `tests/PlauderBox.Vertragstests/Program.cs`.
- **Befund:** Konsolenprogramm mit eigener `Pruefe`-Funktion; der erste Fehler beendet den Lauf, Einzelergebnisse fehlen.
- **Auftrag:** Auf `xunit` umstellen, je Prüfaussage eine Testmethode, Aufzeichnungshandler in eine gemeinsame Hilfsklasse.
- **Nachweis:** `dotnet test` weist jeden Fall einzeln aus.

### S26 – Quelltext-Textvergleiche durch Verhaltenstests ersetzen (P2, PB-TST-001)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `mobileOberflaeche.test.ts` ist entfernt; `components/mobileKomponenten.test.ts` rendert die Komponenten; kein Test liest mehr Quelltextdateien.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/mobileOberflaeche.test.ts`.
- **Befund:** Die acht Tests lesen `.vue`- und `.css`-Dateien und suchen Zeichenfolgen. Sie prüfen kein Verhalten und brechen bei jeder Umformulierung.
- **Auftrag:** `@vue/test-utils` und `happy-dom` als Entwicklungsabhängigkeiten mit festen Versionen aufnehmen. Je Komponente gerenderte Tests schreiben: Schaltflächenzustände, ausgelöste Ereignisse, Fehlermeldungen mit `role="alert"`, Speicherstatus. Danach die Datei entfernen.
- **Nachweis:** Kein Test liest mehr Quelltextdateien; Anzahl geprüfter Verhaltensfälle mindestens wie bisher.

### S27 – Offline- und Wiederanlauffälle im Browser prüfen (P2, PB-TST-002)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Playwright-Test `e2e/offlineWiederanlauf.spec.ts` ist vorhanden und Teil des Prüflaufs. Folgepunkt siehe S41.
- **Befund:** Verbindungsabbruch, App-Neustart und doppelte Übertragung sind nur auf Dienstebene mit `fake-indexeddb` geprüft.
- **Entscheid erforderlich:** Einführung von Playwright als Entwicklungsabhängigkeit.
- **Auftrag nach Entscheid:** Browsertest gegen den Produktionsbuild mit simuliertem Offlinebetrieb: Eintrag offline sichern, Seite neu laden, online gehen, Auswertung und Übergabe mit Attrappenserver.
- **Nachweis:** Test läuft im Prüflauf ohne Bildschirm.

### S28 – Prüflauf in GitHub Actions ausführen (P3, D003 Q1)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `.github/workflows/pruefung.yml` führt den Prüflauf bei Push und Pull Request aus. Ob der Lauf grün ist, wurde nicht geprüft.
- **Befund:** Das Repository hat einen GitHub-Remote, aber keine Workflow-Datei.
- **Auftrag:** `.github/workflows/pruefung.yml` anlegen: Windows-Runner, pnpm und .NET 10 einrichten, `tests\Pruefe-Prototyp.ps1` bei Push und Pull Request ausführen. Keine Geheimnisse verwenden.
- **Nachweis:** Workflow läuft auf `main` grün.

## Block F – Erweiterbarkeit

### S29 – Bild- und Audiodaten getrennt von der Begehung speichern (P2, PB-TS-005)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `speichereBegehung` schreibt nur neue oder geänderte Mediendaten und löscht entfernte; Unittest für die reine Textänderung vorhanden.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts` Zeilen 11–68.
- **Befund:** Die gesamte Begehung mit allen Blobs liegt unter dem Schlüssel `aktive-begehung`; jede Speicherung schreibt alle Bilder und Aufnahmen neu.
- **Auftrag:** Datenbankversion 2 mit eigenen Object Stores für Bilder und Audio einführen. Die Begehung speichert nur Verweise. Die Migration überführt Version 1 in einer Transaktion und löscht alte Daten erst nach bestätigtem Abschluss. Die öffentlichen Funktionen des Moduls behalten ihre Signaturen.
- **Nachweis:** Migrationstest mit `fake-indexeddb` von Version 1 auf 2 ohne Datenverlust; Test für abgebrochene Migration; bestehende Speichertests grün.

### S30 – Gespeicherte Begehung beim Laden prüfen (P2, PB-TS-001)

- **Status (Nachprüfung 12.11.2026):** **behoben** – `schemaVersion` und Typwächter sind vorhanden; unlesbare Daten werden als `BegehungSpeicherfehler` gemeldet und angezeigt. Folgepunkt siehe S34.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts` Zeilen 121–130.
- **Befund:** `anfrage.result as LokaleBegehung` übernimmt gespeicherte Daten ungeprüft; eine Schemaversion fehlt.
- **Auftrag:** Feld `schemaVersion` einführen und beim Laden mit einem Typwächter prüfen. Unlesbare Daten werden nicht gelöscht, sondern als eigener Fehler gemeldet, den die Oberfläche anzeigt.
- **Nachweis:** Unittest mit unvollständigem Datensatz und mit Datensatz ohne Version.

### S31 – Rückfallweg für den QR-Scan (P2, PB-TS-006)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Rückfall über `@zxing/browser` und manuelles Einfügen des Freigabecodes sind umgesetzt. Die Geräteprüfung auf Android und iOS bleibt offen.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/qrCodeScanner.ts` Zeilen 32–33.
- **Befund:** Der Scanner verwendet ausschliesslich `BarcodeDetector`. Fehlt diese Schnittstelle im Browser, bleibt nur eine Fehlermeldung.
- **Entscheid erforderlich:** Rückfall über manuelles Einfügen des Freigabecodes, über eine JavaScript-Bibliothek oder beides.
- **Auftrag nach Entscheid:** Zweite Implementierung von `QrCodeScanner` beziehungsweise Eingabefeld in `QrCodeStart.vue`; die Prüfung erfolgt weiterhin über `leseHappyHourBegehungsfreigabe`.
- **Nachweis:** Unittest des Rückfallwegs; Geräteprüfung auf Android und iOS.

### S32 – Lösungsdokumentation nachführen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – [[LD012 - Strukturelles Redesign der PlauderBox]] beschreibt den Stand; `README.md` und `AGENTS.md` sind angepasst und verlinken dieses Dokument. Folgepunkt siehe S43.
- **Auftrag:** Nach Abschluss der Blöcke B bis F ein LD-Dokument zum umgesetzten Stand erstellen, `README.md` und `AGENTS.md` an die neue Struktur anpassen und dieses Dokument dort verlinken.
- **Nachweis:** Alle Wiki-Links lösen auf; kein Dokument beschreibt einen überholten Aufbau.

## Nachprüfung vom 12.11.2026

Der Stand nach den Commits `S01` bis `S30` wurde erneut gelesen; gebaut und ausgeführt wurde nichts. Die Statuszeile jedes Schritts nennt das Ergebnis.

- **Behoben:** S01, S12, S13, S14, S17, S18, S19, S20, S21, S23, S30.
- **Teilweise behoben, offen:** S24, S29.
- **Offen:** S02 bis S11, S15, S16, S22, S25 bis S28, S31, S32.
- **Neu:** S33 bis S39.

## Block G – Neue Befunde aus der Nachprüfung

### S33 – Lokale Commits nach origin übertragen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `main` und `origin/main` zeigen laut Reflog auf denselben Commit.
- **Befund:** Laut Reflog von `origin/main` erfolgte die letzte Übertragung nach dem dritten `S01`-Commit. Die Commits `S12` bis `S30` liegen nur lokal vor.
- **Auftrag:** Mit `git status` und `git log origin/main..main` den Stand bestätigen und übertragen.
- **Nachweis:** `git log origin/main..main` ist leer.

### S34 – Unlesbare oder nicht migrierbare lokale Daten vor Verlust schützen (P2, PB-TS-005)

- **Status (2. Nachprüfung 12.11.2026):** **teilweise behoben, offen** – Bei `unlesbare_daten` sind QR-Verarbeitung und Start gesperrt; Sicherung und bewusstes Verwerfen werden angeboten und sind getestet. Offen: Schlägt die Migration von Version 1 fehl, meldet das Öffnen der Datenbank keinen `BegehungSpeicherfehler`; `speicherblockiert` bleibt `false`, und die Oberfläche bietet weder Sicherung noch Verwerfen an (`composables/verwendeBegehung.ts`, Funktion `initialisiere`; `services/begehungsSpeicherMigration.ts` Zeilen 31–48). Nachweis offen: Unittest des Composables mit fehlgeschlagener Migration.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/composables/verwendeBegehung.ts` Zeilen 172–191; `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts` Zeilen 145–158 und 168–182.
- **Befund:** Nach der Meldung «Die lokal gespeicherte Begehung ist unlesbar. Die Daten wurden nicht gelöscht.» bleibt die Scanner-Ansicht aktiv. Startet der Benutzer danach eine neue Begehung, überschreibt `speichereBegehung` den Schlüssel `aktive-begehung` und leert beide Medienspeicher; die unlesbaren Daten sind damit verloren. Schlägt die Migration von Version 1 fehl, wird die Transaktion abgebrochen; der Abbruch wiederholt sich bei jedem Start, ohne dass die Oberfläche einen Ausweg anbietet.
- **Auftrag:** Solange unlesbare oder nicht migrierbare Daten vorliegen, den Start einer neuen Begehung sperren. Dem Benutzer zwei bewusste Aktionen anbieten: Rohdaten und Mediendateien extern sichern sowie endgültig verwerfen. Erst nach bestätigtem Verwerfen darf gespeichert werden.
- **Nachweis:** Unittest: nach `unlesbare_daten` ruft `starteBegehung` `speichern` nicht auf; Unittest für fehlgeschlagene Migration mit anschliessender Sicherung und bewusstem Verwerfen.

### S35 – Auswertungszustand bei Speicherfehler freigeben (P2, PB-TS-003)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Die erste Speicherung liegt im `try`-Block; der Eintragsstatus wird wiederhergestellt und der Zustand freigegeben; Unittest vorhanden.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/composables/verwendeAuswertungsWarteschlange.ts` Zeilen 28–31.
- **Befund:** Der Zustand wird auf `laeuft` gesetzt und danach ausserhalb von `try`/`finally` gespeichert. Schlägt diese Speicherung fehl, bleibt der Zustand `laeuft`; weitere Auswertungen und die Warteschlange sind bis zum Neuladen gesperrt, und der Eintrag steht im Arbeitsspeicher auf `wird_ausgewertet`.
- **Auftrag:** Die erste Speicherung in den `try`-Block aufnehmen, bei Fehler den vorherigen Eintragsstatus wiederherstellen und den Fehler sichtbar melden.
- **Nachweis:** Unittest: Speicherfehler vor dem Auswertungsaufruf führt zu Zustand `bereit`, unverändertem Eintragsstatus und sichtbarer Meldung.

### S36 – Typwächter entdoppeln und Speichermodul gliedern (P3, PB-ARC-005)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Die Typwächter liegen in `src/PlauderBox.Logik/Client/typWaechter.ts`; Validierung und Migration sind eigene Dateien.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts` Zeilen 37–90; `src/PlauderBox.UI.Client/src/services/happyHourProtokollKontext.ts` Zeilen 45–65.
- **Befund:** `istObjekt`, `istText`, `istZahl` und die Prüfung des Protokollkontexts stehen in beiden Dateien, mit unterschiedlicher Strenge. `begehungsSpeicher.ts` umfasst 283 Zeilen mit Validierung, Migration und Persistenz.
- **Auftrag:** Die Typwächter nach `src/PlauderBox.Logik/Client` verlagern und an beiden Stellen verwenden. Migration und Validierung in eigene Dateien neben `begehungsSpeicher.ts` legen; die öffentlichen Funktionen bleiben unverändert.
- **Nachweis:** Die Wächter kommen je einmal vor; bestehende Tests grün.

### S37 – Composables ohne nachträgliche Verdrahtung koppeln (P3, PB-TS-002)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – `verwendeAppZustand` erzeugt den gemeinsamen Zustand; `App.vue` enthält kein `let`; `ansicht` ist durchgängig `AppAnsicht`; `EintragErfassen.vue` erhält den Bestätigungsdialog als Eigenschaft.
- **Fundstelle:** `src/PlauderBox.UI.Client/src/App.vue` Zeilen 20–54; `composables/verwendeAuswertungsWarteschlange.ts` Zeile 10; `components/EintragErfassen.vue` Zeile 49 und Funktion `verwerfeAufnahme`.
- **Befund:** `auswertungsAblauf` und `uebergabeMeldungLeeren` werden als veränderliche Variablen angelegt und nachträglich gesetzt, um die gegenseitige Abhängigkeit der Composables aufzulösen. `ansicht` ist dort als `Ref<string>` statt `Ref<AppAnsicht>` typisiert. `EintragErfassen.vue` ruft `window.confirm` weiterhin direkt auf.
- **Auftrag:** Gemeinsamen Zustand (`begehung`, `ansicht`, `online`) in einem eigenen Composable erzeugen und an alle drei Abläufe übergeben. `ansicht` durchgängig als `AppAnsicht` typisieren. Den Bestätigungsdialog der Komponente als Eigenschaft mit Standardwert übergeben.
- **Nachweis:** `App.vue` enthält kein `let`; Typprüfung grün; Unittest der Komponente mit Bestätigungsattrappe.

### S38 – Fehlerabbildung und Grenzwerte vereinheitlichen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Ein `catch` mit Ausnahmefilter; Meldungen werden aus den Optionswerten gebildet; `PlauderBox:Grenzen` wird gelesen und beim Start geprüft.
- **Fundstelle:** `src/Endpunkte/HappyHourEndpunkte.cs` Zeilen 129 und 173–204; `src/Endpunkte/TranskriptionsEndpunkte.cs` Zeile 82; `src/PlauderBoxOptionen.cs` Zeilen 25–46.
- **Befund:** `FuehreAsync` enthält sieben `catch`-Blöcke mit identischem Rumpf. Die Meldungen nennen «15 MB» und «20 MB» als festen Text, obwohl die Grenzen Optionen sind. `PlauderBoxOptionen.Lade` liest die Grenzwerte nicht aus der Konfiguration; sie lassen sich nur im Code ändern.
- **Auftrag:** Einen `catch` mit Ausnahmefilter verwenden. Die Meldungstexte aus den Optionswerten bilden. Die Grenzwerte optional aus dem Abschnitt `PlauderBox:Grenzen` lesen und beim Start auf zulässige Bereiche prüfen.
- **Nachweis:** Vertragstest mit überschriebener Konfiguration; Fehlerabbildungstests unverändert grün.

### S39 – Versionierte Live-Compose-Datei an den aktiven Stand angleichen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **behoben** – Die versionierte Datei nennt `plauderbox:olymp01-live-20261112-images`.
- **Fundstelle:** `deploy/olymp01-live/compose.yaml` Zeile 5; Tagesprotokoll vom 12.11.2026, Abschnitt «Bildverarbeitung auf Olymp01 bereitstellen».
- **Befund:** Das Tagesprotokoll nennt `plauderbox:olymp01-live-20261112-images` als aktives Image; die versionierte Datei nennt `plauderbox:olymp01-live-20261111-r4`.
- **Auftrag:** Die versionierte Datei auf das aktive Image-Tag setzen. Keine Änderung am laufenden System.
- **Nachweis:** Versionierte und aktive Compose-Datei nennen dasselbe Image.

## Zweite Nachprüfung vom 12.11.2026

Der Stand nach den Commits `S02` bis `S39`, `S15` und `S32` wurde erneut gelesen; gebaut und ausgeführt wurde nichts.

- **Seit der ersten Nachprüfung behoben:** S02 bis S06, S08 bis S11, S15, S16, S22, S24 bis S29, S31 bis S33, S35 bis S39.
- **Teilweise behoben, offen:** S34.
- **Offen:** S07.
- **Neu:** S40 bis S46.

## Block H – Neue Befunde aus der zweiten Nachprüfung

### S40 – Verbleibende Textvergleiche am Quellcode ablösen (P3, PB-TST-001)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `tests/Pruefe-Prototyp.ps1` Zeilen 49–54 und 74.
- **Befund:** Das Skript prüft Logger-Filter, Netzpräfix, Zeilenzahl von `Program.cs`, Optionsstandardwerte und die Form des `catch`-Blocks weiterhin per regulärem Ausdruck am Quelltext. Die Optionsstandardwerte sind zusätzlich in den Vertragstests geprüft.
- **Auftrag:** Verhalten über bestehende oder ergänzte Tests nachweisen und die Textvergleiche entfernen; nur Prüfungen an Build-Artefakten und Deploy-Dateien im Skript belassen.
- **Nachweis:** Das Skript liest keine `.cs`-Datei mehr.

### S41 – Browsertest mit echtem Netzausfall und aktivem Service Worker (P3, PB-TST-002)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `src/PlauderBox.UI.Client/playwright.config.ts` (`serviceWorkers: 'block'`); `e2e/offlineWiederanlauf.spec.ts` Zeilen 7–12 und 40–135.
- **Befund:** Der Test überschreibt `navigator.onLine` über einen Schalter im `localStorage`, blockiert den Service Worker und befüllt IndexedDB direkt. Ein tatsächlicher Netzausfall, das Laden des App-Shells aus dem Cache und die Erfassung über die Oberfläche sind damit nicht abgedeckt.
- **Auftrag:** Zweiten Test ergänzen, der mit aktivem Service Worker und `context.setOffline(true)` neu lädt und einen Eintrag über die Oberfläche anlegt.
- **Nachweis:** Der Test lädt die App offline aus dem Cache und besteht im Prüflauf.

### S42 – Integrationstests auf die versionierten Pfade ausrichten (P3, PB-API-001)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `tests/PlauderBox.Integrationstests/ServergrenzeTests.cs` Zeilen 12–23, 44, 59, 117, 183 und 202.
- **Befund:** Nur der Statusendpunkt wird unter `/api/v1` und als Alias geprüft; alle übrigen Tests verwenden den Alias `/api`. Das Ratenlimit der Punktübergabe und ein erfolgreicher Bild- und Punktdurchlauf sind nicht abgedeckt.
- **Auftrag:** Die Tests auf `/api/v1` umstellen, je Route einen Aliasfall behalten und die fehlenden Fälle ergänzen.
- **Nachweis:** Jede Route ist unter beiden Pfaden mindestens einmal geprüft.

### S43 – Frontmatter der neuen Wiki-Dokumente angleichen (P3)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `docs/E013 - HTTP-API versionieren und Uebergangsaliase beibehalten.md`; `docs/E012 - Olymp01 als Live-System und Delphi01 als Testsystem betreiben.md`; `docs/LD012 - Strukturelles Redesign der PlauderBox.md`.
- **Befund:** E012 und E013 besitzen kein Frontmatter mit `typ`, `id`, `status`, `datum`. LD012 verwendet `typ: loesungsdokumentation`, LD010 `typ: lösungsdokumentation`.
- **Auftrag:** Frontmatter gemäss der Arbeitsweise des übergeordneten InHouseServer-Projekts ergänzen und die Schreibweise von `typ` vereinheitlichen.
- **Nachweis:** Alle Dokumente unter `docs` besitzen die vier Felder in gleicher Schreibweise.

### S44 – Unerwartete Transkriptionsantwort als 502 abbilden (P3, PB-CS-003)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `src/PlauderBox.Datenmanagement/OpenAiTranskriptionsdienst.cs` Zeilen 51–59; `src/Endpunkte/TranskriptionsEndpunkte.cs`, `catch (System.Text.Json.JsonException)`.
- **Befund:** Ist `text` in der Antwort kein JSON-String, wirft `GetString` eine `InvalidOperationException`; sie wird nicht abgebildet und endet als 500. Ungültiges JSON der Transkription wird im Endpunkt mit der Meldung zur strukturierten Auswertung beantwortet.
- **Auftrag:** Im Transkriptionsdienst Werttyp prüfen und `JsonException` sowie `InvalidOperationException` in eine eigene Ausnahme des Vertrags überführen; im Endpunkt mit passender Meldung als 502 abbilden.
- **Nachweis:** Vertragstest mit `{"text": 5}` und mit ungültigem JSON; Integrationstest erwartet 502.

### S45 – Korrigierten Stand auf Test- und Live-System bereitstellen (P2)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Eigener Auftrag:** Bereitstellung und Betriebsänderung.
- **Fundstelle:** `deploy/olymp01-live/compose.yaml` Zeile 5; `deploy/delphi01-test/compose.yaml` Zeile 3; Tagesprotokoll vom 12.11.2026.
- **Befund:** Die genannten Images wurden vor den Commits `S02` bis `S39` erstellt. Die Korrekturen aus Block B und der umgebaute Stand laufen damit auf keinem der beiden Systeme.
- **Auftrag:** Neues Image aus `main` bauen, zuerst auf Delphi01 und nach Abnahme auf Olymp01 bereitstellen; versionierte Compose-Dateien und LD011 nachführen.
- **Nachweis:** Prüfung gemäss [[T010 - PlauderBox Livebetrieb auf Olymp01 prüfen]] am neuen Image, einschliesslich `/api/v1/status` und Sicherheitsheadern.

### S46 – Wiederholte Ratenlimit-Registrierung zusammenfassen (P3, PB-ARC-005)

- **Status (2. Nachprüfung 12.11.2026):** **offen**
- **Fundstelle:** `src/Program.cs` Zeilen 51–100.
- **Befund:** Vier Richtlinien wiederholen denselben Aufbau mit je anderem Namen und Grenzwert; die Protokollierung der KI-Konfiguration steht als Inline-Definition im Composition Root. Die Datei liegt mit 116 Zeilen knapp unter der geprüften Grenze von 120.
- **Auftrag:** Eine Erweiterungsmethode für die Richtlinien und eine für die Startprotokollierung unter `src/Sicherheit` beziehungsweise `src` anlegen.
- **Nachweis:** `Program.cs` unter 90 Zeilen; Integrationstests zu den Ratenlimits unverändert grün.

## Nicht durch die Umsetzung zu erledigen

Diese Punkte sind in den bestehenden Dokumenten bereits als offen geführt und benötigen eine Handlung des Product Owners oder einen eigenen Betriebsauftrag:

- Die im Tagesprotokoll vom 12.11.2026 genannte, im Caddy-Accesslog erfasste Rundgangsfreigabe in HappyHour widerrufen.
- Die HappyHour-Basisadresse der Live-Instanz nach der Abnahme von `https://test.siwako.ch` auf `https://happyhour.siwako.ch` zurückstellen, siehe [[LD011 - PlauderBox Livebetrieb auf Olymp01]].
- Reale Geräteabnahme auf Android und iOS sowie serverseitig persistenter Duplikatschutz für Transkriptionsaufträge, siehe [[T007 - Vollständigen mobilen Begehungsablauf prüfen]].

## Verknüpfungen

- [[D002 - Coding Guidelines für PlauderBox]]
- [[D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox]]
- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]
- [[LD011 - PlauderBox Livebetrieb auf Olymp01]]
- [[T010 - PlauderBox Livebetrieb auf Olymp01 prüfen]]
