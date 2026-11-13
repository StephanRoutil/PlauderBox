---
typ: test
id: T007
status: automatisiert-bestanden-mobiltest-offen
datum: 2026-11-13
anforderung: D011
---

# T007 – Vollständigen mobilen Begehungsablauf prüfen

> **Gültigkeitsvermerk vom 11.11.2026:** Dieser Test bleibt für den lokalen Begehungs- und Offlineablauf gültig. Der schreibende Protokollpunktvertrag wird separat in [[T008 - Idempotente HappyHour-Protokollpunktübergabe prüfen]] nachgewiesen; dessen End-to-End-Hauptfall einschliesslich `Wer` für INSERT und UPDATE ist bestanden. Die neue Bildübergabe wird separat in [[T009 - Idempotente HappyHour-Bildübergabe prüfen]] nachgewiesen.

## Automatisierte Prüfungen

- TypeScript-Typecheck für produktive Vue-Dateien.
- Vitest: 115 Tests in 15 Dateien bestanden. Geprüft werden zusätzlich die normalisierte Zuständigkeit `Wer`, das Start-Quality-Gate ohne gültigen Verteiler, Verteilergrenzfälle, Legacy-Import und -Löschung, IndexedDB-Roundtrip, getrennte Kamera-/Galerieauswahl, Bildablehnungen, die einmalige Einzelbildsicherung, die verlustfreie Zusammenführung eines erneuerten HappyHour-Kontexts sowie Warn-, Ablauf- und Verbindungsfehlerzustand des KI-Schlüssels.
- Die Bildsicherung prüft Dateinamen und Einzeldateien sowie direkte Einzel-Downloads ohne Teilen-Dialog und ohne ZIP, einschliesslich 82 Bildern aus einer Benutzeraktion. Der mobile UI-Vertrag prüft getrennte Kamera- und Galerie-Eingaben.
- Verhaltenstests prüfen zusätzlich die vollständig manuelle Erfassung ohne Audio, den sichtbaren KI-Laufzustand, die Ein-Klick-Auswertung ausstehender Offline-Aufnahmen, das bestätigte Leeren beider internen Datenspeicher und den Standardwert der Protokollpunktart für den nächsten neuen Eintrag.
- Ein Regressionstest führt vier lokal bekannte HappyHour-Punkte, vier später hinzugekommene HappyHour-Punkte und einen lokalen, noch nicht übertragenen Punkt mit Bild zusammen. Er erwartet neun sichtbare Einträge, acht HappyHour-Zuordnungen, unveränderten Bild-Blob und eine erneut mögliche Übergabe. Ein zweiter Test ordnet einen inzwischen bestätigten lokalen Punkt über seine GUID ohne Duplikat zu. Wiederanlauf und lokaler Commit entfernen zusätzlich veraltete Übertragungsmarkierungen.
- Komponententests prüfen die drei beschrifteten Headerbuttons samt Ereignissen und deaktivierten Zielen sowie die ansichtsunabhängige KI-Fortschrittsanzeige mit zugänglichem Status, Spinner und animiertem unbestimmtem Balken.
- Weitere Verhaltenstests halten den typisierten Zustand während einer noch nicht bestätigten HappyHour-Übergabe auf `laeuft`, prüfen den dazugehörigen Statustext mit Spinner und Balken und stellen sicher, dass die Erfassung nur noch zwei CBO-Felder enthält und kein `Traktandum` mehr anzeigt.
- Ein Komponententest verlangt im gemeinsamen Kopf dasselbe `/icon.svg` wie im PWA-Manifest und die gebaute Version `v1.1.1`. Der Gesamtprüflauf gleicht zusätzlich die Frontendversion aus `package.json` mit der Serverversion in `PlauderBox.UI.csproj` ab.
- Ein Komponententest verlangt während der KI-Statusabfrage einen Spinner und für die Vorwarnung eine zugängliche Meldung. Vertragstests prüfen die 30-Tage-Grenze, das einschliesslich gültige Ablaufdatum und das Lesen von `GueltigBis` aus einer synthetischen Schlüsseldatei. Integrationstests prüfen den geheimnisfreien Statusvertrag und die Sperre eines abgelaufenen Schlüssels nach gültiger HappyHour-Freigabe, aber vor dem Audio-Body.
- Ein Verhaltenstest setzt einen manuellen Eintrag ohne Audio auf `ausgewertet`, entfernt einen früheren Fehler und weist zugleich nach, dass ein Audioeintrag ausstehend bleibt. Der Komponententest prüft den tatsächlich emittierten manuellen Status.
- Ein Komponententest kennzeichnet einen konkret fehlgeschlagenen und unvollständigen Eintrag, zeigt die Korrekturaktion und weist nach, dass genau dessen stabile ID zum Bearbeiten ausgelöst wird.
- Ein Diensttest ordnet HTTP 410 eindeutig einer ungültigen Freigabe zu. Ein Ablaufstest weist nach, dass der Audio-Blob erhalten bleibt, der Erneuerungsscanner mit Rückkehrziel geöffnet wird und die neue Freigabe nach erfolgreichem Commit zur vorherigen Ansicht zurückführt.
- Bestehende Tests für QR-Freigabe, HappyHour-Grenze und früheren lokalen Speicher bleiben Bestandteil des Laufs.
- Vue-Produktionsbuild mit 296 transformierten Modulen einschliesslich Manifest, Service Worker und App-Icon: bestanden.
- Docker-Buildkontextprüfung: Der Frontend-Stage kopiert `src/PlauderBox.Logik/Client` vor `pnpm run build` an den vom TypeScript-/Vite-Alias `@logik` erwarteten Pfad; `.dockerignore` schliesst ihn nicht aus: bestanden.
- .NET-Release-Build der Dreischichten-Solution einschliesslich Vertragstestprojekt: bestanden, 0 Warnungen und 0 Fehler.
- .NET-Vertragstests: tatsächlich serverrelevante Erfassungs-ID, redigiertes Token-Wertobjekt, fester HappyHour-Providerpfad und striktes KI-Schema ohne `Ort`: bestanden. Die mobilen Fachregeln werden nicht parallel in C# kopiert, sondern über den produktiven TypeScript-Pfad getestet.
- Endpoint-/Logtest: ungültige Freigabe, nicht konfigurierte HappyHour-Verbindung und fehlende Erfassungs-ID liefern die erwarteten Fehlerzustände; ein markierter Freigabe-Token erscheint weder in Standard- noch Fehlerausgabe: bestanden.
- Offline-App-Shell-Test: das gebaute gehashte JavaScript und CSS werden vorab gecacht; Navigation liefert bei abgewiesenem Netzwerk den gecachten App-Shell: bestanden.
- Isolierter Loopback-Lauf des Release-Builds: App-Start, Manifest und Service Worker liefern Status 200; das Manifest wird als `application/manifest+json` ausgeliefert.

> **Automatisierter Stand vom 13.11.2026:** Version `1.1.1` besteht den vollständigen `tests/Pruefe-Prototyp.ps1`: Docker-Buildkontext, Lint, TypeScript, 115 Frontendtests in 15 Dateien, Produktionsbuild, Playwright-Offlinefall, .NET-Release-Build ohne Warnungen, 14 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Das Start-Quality-Gate ohne gültigen Verteiler ist in Fachlogik, Ablauf und Startkomponente getestet. Dockerbuild, Bereitstellung und reale Mobilprüfung dieses Stands sind noch nicht geprüft.

## Delphi01-Bereitstellungsnachweis

> **Aktualisierung vom 13.11.2026:** Der Usability-Korrekturstand aus Commit `ec65e60` läuft als Image `plauderbox:delphi01-test-ec65e60`, ID `sha256:5ffe84fd1c59…`, in `Production`. Root und das neue Asset `index-DftIBvEC.js` werden über internes HTTPS ausgeliefert, `/api/v1/status` meldet die KI als bereit und ein synthetischer ungültiger Freigabecode liefert über die direkte Verbindung zu `https://test.siwako.ch` HTTP 410. Die reale Mobilgeräteabnahme bleibt offen.

> **Aktualisierung vom 13.11.2026:** Der Zusammenführungs-Fix aus Commit `c319d81` läuft als Image `plauderbox:delphi01-test-c319d81`, ID `sha256:f270beee943a…`, in `Production`. Internes HTTPS und das neue Asset `index-C3z7irNw.js` liefern HTTP 200, `/api/v1/status` meldet die KI als bereit, der synthetische HappyHour-Negativtest liefert über die direkte Verbindung zu `https://test.siwako.ch` HTTP 410 und das Containerlog enthält keine Startfehler. Das vorherige Image `plauderbox:delphi01-test-ec65e60` bleibt als Rückfallstand erhalten. Der reale Zusammenführungsfall mit Protokoll 240 bleibt bis zum HappyHour-Publish und Mobiltest offen.

> **Aktualisierung vom 13.11.2026:** Die sichtbare KI-Fortschrittsanzeige und Headernavigation aus Commit `6484eea` laufen als Image `plauderbox:delphi01-test-6484eea`, ID `sha256:bb6523332992…`, in `Production`. Internes HTTPS und das neue Asset `index-DYXhrjaZ.js` liefern HTTP 200; das ausgelieferte Asset enthält `KI-Auswertung läuft` und `Beenden`. KI-Status, synthetischer HappyHour-Negativtest und Containerlog sind unauffällig. Das Image `plauderbox:delphi01-test-c319d81` bleibt als Rückfallstand erhalten. Reale Sicht- und Touchprüfung auf dem Mobilgerät bleibt offen.

> **Aktualisierung vom 13.11.2026:** Die HappyHour-Fortschrittsanzeige und Formularbereinigung aus Commit `b68849b` laufen als Image `plauderbox:delphi01-test-b68849b`, ID `sha256:6bed5a898586…`, in `Production`. Internes HTTPS und das neue Asset `index-Bv-FsQhN.js` liefern HTTP 200. Das Asset enthält den Übergabestatus für Punkte und Bilder; der frühere Auswahltext `Kein Traktandum gewählt` ist nicht mehr enthalten. KI-Status, synthetischer HappyHour-Negativtest und Containerlog sind unauffällig. Das Image `plauderbox:delphi01-test-6484eea` bleibt als Rückfallstand erhalten. Reale Mobil- und PDF-Kontrolle bleibt offen.

> **Aktualisierung vom 13.11.2026:** Version `1.0.1` aus Commit `867df94` läuft als Image `plauderbox:delphi01-test-867df94`, ID `sha256:2dd33086cc17…`, in `Production`. Internes HTTPS, das gemeinsame `/icon.svg` und das neue Asset `index-BgHCvmFE.js` liefern HTTP 200. Das Asset enthält die gebaute Version `1.0.1` und den gemeinsamen Iconpfad; `/api/v1/status` meldet die KI als bereit. Ein synthetischer ungültiger HappyHour-Code liefert HTTP 410, und das Containerlog enthält keine Startfehler. Das Image `plauderbox:delphi01-test-b68849b` bleibt als Rückfallstand erhalten. Die reale Sichtprüfung von Icon und Versionsanzeige auf dem Mobilgerät bleibt offen.

> **Aktualisierung vom 13.11.2026:** Version `1.0.2` aus Commit `e0c71e2` läuft als Image `plauderbox:delphi01-test-e0c71e2`, ID `sha256:cb0de38438d0…`, in `Production`. Internes HTTPS und das neue Asset `index-Bw7NiLQ-.js` liefern HTTP 200. Das Asset enthält die gebaute Version `1.0.2` sowie den Fehlertext für die abgelaufene Rundgangsfreigabe; `/api/v1/status` meldet die KI als bereit. Ein synthetischer ungültiger HappyHour-Code liefert HTTP 410, und das Containerlog enthält keine Startfehler. Das Image `plauderbox:delphi01-test-867df94` bleibt als Rückfallstand erhalten. Die reale Freigabeerneuerung und anschliessende Audioauswertung auf dem Mobilgerät bleiben offen.

> **Aktualisierung vom 13.11.2026:** Version `1.0.3` aus Commit `c9c319a` läuft als Image `plauderbox:delphi01-test-c9c319a`, ID `sha256:3aeccc176165…`, in `Production`. Internes HTTPS und das neue Asset `index-B-jqvHyQ.js` liefern HTTP 200. Das Asset enthält die gebaute Version `1.0.3`, die Kennzeichnung `Auswertung fehlgeschlagen` und die Aktion `Öffnen und korrigieren`; `/api/v1/status` meldet die KI als bereit und das Containerlog enthält keine Startfehler. Das Image `plauderbox:delphi01-test-e0c71e2` bleibt als Rückfallstand erhalten. Die reale Sicht- und Touchprüfung des offenen Eintrags auf dem Mobilgerät bleibt offen.

> **Aktualisierung vom 13.11.2026:** Version `1.0.4` aus Commit `e20a221` läuft als Image `plauderbox:delphi01-test-e20a221`, ID `sha256:c68d9f0f3129…`, in `Production`. Internes HTTPS und das neue Asset `index-C3JiHCmu.js` liefern HTTP 200. Das Asset enthält die gebaute Version `1.0.4` und die manuelle Übernahmeaktion; `/api/v1/status` meldet die KI als bereit und das Containerlog enthält keine Startfehler. Das Image `plauderbox:delphi01-test-c9c319a` bleibt als Rückfallstand erhalten. Der reale Abschluss eines manuellen Eintrags ohne Audio auf dem Mobilgerät bleibt offen.

> **Aktualisierung vom 13.11.2026:** Version `1.1.0` aus Commit `59ae459` läuft als Image `plauderbox:delphi01-test-59ae459`, ID `sha256:5cade7d1d5ef…`, in `Production`. Internes HTTPS, allgemeiner Status und das Frontend-Asset liefern erfolgreich; das Asset enthält `1.1.0`. `/api/v1/status` bleibt auf das Feld `kiBereit` beschränkt. Der neue Schlüsselstatus bestätigt `kiBereit=true`, `kiAbgelaufen=false`, `kiGueltigBis=2027-11-11` und keine aktuelle Vorwarnung. Die Schlüsseldatei besitzt Modus `600`, der Container läuft ohne Startfehler und temporäre Quell- sowie Schlüsselkopien wurden entfernt. Das Image `plauderbox:delphi01-test-e20a221` bleibt bis zur Mobilabnahme als Rückfallstand erhalten. **Nicht geprüft:** reale Audioauswertung und mobile Sichtprüfung der Warnanzeige.

- Vollständiger Linux-Dockerbuild auf Delphi01 einschliesslich `src/PlauderBox.Logik/Client`: bestanden. Die Fotoerweiterung läuft als Image `sha256:f7f1d60381dd…`; der unmittelbar vorherige Stand ist als `plauderbox:delphi01-test-before-fotosicherung` markiert.
- Anwendungs- und HTTPS-Container aus `/home/zeus/plauderbox-test-vorbereitung` gestartet: bestanden.
- Root, Manifest, Service Worker und die gehashten JavaScript-/CSS-Assets liefern über internes HTTPS Status 200; Manifest-MIME-Typ korrekt: bestanden.
- KI-Status meldet bereit: bestanden.
- Ungültiger HappyHour-Freigabe-Token wird über den internen SSH-Reverse-Tunnel mit Status 410 beantwortet: bestanden.
- Markierter Dummy-Token erscheint nicht im Containerlog: bestanden.
- FileBox und der zentrale PostgreSQL-Dienst blieben unverändert.
- Das ausgelieferte Produktionsasset enthält `Foto aufnehmen`, `Aus Galerie wählen` und die einmalige Sicherung aller Einzelbilder ohne ZIP: bestanden.

Dieser Bereitstellungsnachweis bestätigt den Serverbetrieb, nicht die vollständige Mobilgeräteabnahme und nicht eine schreibende HappyHour-Übergabe. Die spätere Verschiebung der laufenden Ablage nach `/srv/docker/plauderbox-test` bleibt offen.

## Manuell offen

1. Navigation durch alle acht Ansichten auf Android prüfen.
2. Mehrere Fotos und Audio erfassen, Browser vollständig schliessen und Daten nach Neustart prüfen.
3. Verbindung während mehrerer Aufnahmen trennen und die automatische FIFO-Auswertung nach Wiederkehr beobachten.
4. Serverfehler und manuelle Wiederholung prüfen.
5. PWA installieren und App-Hülle ohne Netz neu öffnen.
6. Fokus, Touchziele und schmale Ansichten auf repräsentativen Geräten prüfen.
7. Kamera und Galerie getrennt prüfen; danach einen Rundgang mit vielen Bildern über genau eine Sicherungsaktion direkt herunterladen und die Einzeldateien im Android-Downloadbereich kontrollieren.
8. Manuelles Leeren aus Scanner, Startansicht und aktiver Begehung prüfen; danach muss die App zum Scanner zurückkehren und darf keine frühere Begehung wiederherstellen.
9. Einen Punkt ohne Audio manuell erfassen, eine laufende KI-Auswertung beobachten, den Protokollpunktart-Standard am Folgepunkt prüfen und mehrere offline erfasste Aufnahmen aus der Kontrolle mit einer Aktion auswerten.
10. Für ein bestehendes Protokoll mit lokal noch nicht übertragenem Punkt weitere Punkte direkt in HappyHour ergänzen, die Freigabe erneut bewusst bestätigen und den Code einlesen. Alle HappyHour-Punkte und der lokale Punkt müssen sichtbar sein; bei der anschliessenden Übergabe darf der lokale Punkt nicht ignoriert oder dupliziert werden.
11. Während einer Audioauswertung zwischen Erfassung und Übersicht wechseln und prüfen, dass die KI-Fortschrittsanzeige bis zum Ergebnis sichtbar bleibt. Danach `‹ Back`, `Start` und `Beenden` in Erfassung, Offline-Hinweis, Kontrolle und Abschluss auf einem schmalen Mobilgerät bedienen.
12. Die Übergabe an HappyHour starten und die Fortschrittsanzeige bis zur Bestätigung von Punkten und Bildern beobachten. In der Erfassung prüfen, dass nur `Gruppe` und kein zusätzliches CBO-Feld `Traktandum` vorhanden ist; anschliessend die Gruppierung und Traktandenliste im HappyHour-PDF kontrollieren.
13. Mit einem synthetischen, bald ablaufenden Testdatum die sichtbare Warnung und mit einem abgelaufenen Testdatum die klare Sperrmeldung prüfen. Der produktive Schlüsselwert darf dabei weder im Browser noch in Logs erscheinen.
14. Ein HappyHour-Protokoll ohne Verteiler freigeben und scannen. Die Startansicht muss den Grund anzeigen, `Begehung starten` sperren und den erneuten QR-Scan anbieten. Nach Ergänzung des Verteilers und einer neuen Freigabe muss der Start möglich sein.

## Bewertung

Der dokumentierte Gesamtlauf ist lokal vollständig grün. Dies ist ausdrücklich keine reale Geräteabnahme. Q2 bleibt für den Absturzfall zwischen erfolgreicher externer KI-Antwort und lokalem Commit sowie bis zum realen Offline-Wiederanlauftest offen. Es besteht noch keine serverpersistente Idempotenz beziehungsweise kein serverpersistenter Duplikatschutz für Transkriptionsaufträge: Die stabile `erfassungsId` wird validiert, aber nicht serverseitig persistent gespeichert. Q4 bleibt bis zur repräsentativen Mobilgeräteabnahme von Kamera, Galerie und direkten Mehrfachdownloads offen. Die Protokollpunktübergabe ist in T008 nachgewiesen; die lokal umgesetzte Bildübergabe wird bis zur realen Abnahme in T009 als teilweise bestanden geführt.
