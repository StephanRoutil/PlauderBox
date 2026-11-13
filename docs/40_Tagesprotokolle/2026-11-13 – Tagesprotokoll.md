# 2026-11-13 – Tagesprotokoll

## Session – Version 1.0 und Olymp01-Vorbereitung

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** vor Beginn der Usability-Korrektur
- **Dauer:** nicht zuverlässig bestimmbar

Der qualitätsgeprüfte Quellstand wurde als Version 1.0.0 festgelegt, committed, nach `origin/main` übertragen und mit dem annotierten Tag `v1.0.0` versehen. Lokale Testartefakte und nicht mehr verwendete Delphi01-Image-Tags wurden bereinigt. Ein Olymp01-Image wurde vorbereitet und übertragen. Die erste Bereitstellung scheiterte an einer vom Server aus nicht möglichen öffentlichen Statusprüfung und wurde durch das Aktualisierungsskript automatisch auf den vorherigen Stand zurückgerollt. Ein zweiter Rollout wurde wegen der anschliessend festgestellten Usabilitymängel ausdrücklich gestoppt. Auf Olymp01 blieb die bisherige Version aktiv.

## Session – Usabilitymängel vor Livegang korrigieren

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** 10:13
- **Dauer:** nicht zuverlässig bestimmbar

Sieben gemeldete Bedienmängel wurden in D011 als Akzeptanzkriterien verankert und lokal umgesetzt. Der aktuelle und der frühere IndexedDB-Datenspeicher können nach Bestätigung bereits aus Scanner, Startansicht und aktiver Begehung vollständig geleert werden; der Offline-App-Cache bleibt erhalten. Einträge lassen sich ohne Audio manuell erfassen. Die Audioauswertung steht unmittelbar unter dem Diktatbereich und zeigt während der KI-Verarbeitung einen gesperrten Laufzustand. Die zuletzt bewusst gewählte Protokollpunktart wird beim nächsten neuen Eintrag derselben Begehung vorbelegt. Ausstehende Offline-Aufnahmen können in Offline-Hinweis, Kontrolle und Abschluss mit einer Aktion ausgewertet werden.

Der Android-Teilen-Dialog wurde aus der zusätzlichen Bildsicherung entfernt. Eine Aktion startet alle Einzelbild-Downloads direkt; ZIP und Einzelbestätigung je Bild bleiben ausgeschlossen. Eine Browser-PWA kann weiterhin keine garantierte Ablage im geschützten Android-Galeriespeicher leisten. E009 hält die Ablösung des früheren Web-Share-Entscheids nachvollziehbar fest.

**Prüfstand:** Lint und TypeScript bestanden; 95 Frontendtests, Produktionsbuild, Playwright-Offlinefall, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz sind bestanden. **Nicht geprüft:** reale Bedienung und Mehrfachdownloads auf dem Android-Zielgerät. **Kein Deployment** wurde ausgeführt.

**Geänderte Dokumente:** D011, E009, E014, LD008 und T007. **Empfohlener nächster Schritt:** Korrekturstand zuerst auf Delphi01 bereitstellen und alle sieben Punkte auf dem Mobilgerät abnehmen; Olymp01 erst danach erneut aktualisieren.

## Session – Usability-Korrektur auf Delphi01 bereitstellen

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** 10:22
- **Dauer:** nicht zuverlässig bestimmbar

Commit `ec65e60` wurde auf Delphi01 als Image `plauderbox:delphi01-test-ec65e60` gebaut und in der bestehenden Testablage bereitgestellt. Die Anwendung läuft in `Production` und verwendet serverseitig direkt `https://test.siwako.ch`; der frühere lokale Reverse-Tunnel wird nicht mehr benötigt. Der erste Aktualisierungsversuch wurde wegen eines Fehlers im Prüfskript vorsorglich zurückgerollt. Der korrigierte Lauf ersetzte nur den PlauderBox-App-Container und bestätigte das neue Frontend-Asset, KI-Bereitschaft und HTTP 410 für eine synthetische ungültige Freigabe. Caddy, FileBox, PostgreSQL und Olymp01 blieben unverändert. Das vorherige Delphi01-Image bleibt bis zur Mobilabnahme als Rückfall erhalten.

**Bestanden:** Imagebau, Containerstart, `Production`, internes HTTPS, `/api/v1/status`, direkte HappyHour-Testverbindung. **Nicht geprüft:** reale QR-Freigabe sowie die sieben Usabilityfälle auf dem Mobilgerät. **Nächster Schritt:** Mobiltest über `https://192.168.68.8`.

## Session – Erneuerte Freigabe mit lokalem Stand zusammenführen

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Ein gemeldeter Wiederaufnahmefehler wurde reproduzierbar auf zwei Ursachen eingegrenzt: Eine erneuerte Freigabe ersetzte im Client nur den Token und übernahm keinen inzwischen erweiterten HappyHour-Kontext; zudem konnten frühere Übertragungsmarkierungen später lokal ergänzte Einträge blockieren. PlauderBox führt den erneuerten Kontext nun über HappyHour-Protokollpunkt-ID beziehungsweise stabile GUID mit dem lokalen Stand zusammen. Neue Serverpunkte werden ergänzt, lokale Texte und Medien bleiben erhalten und nicht bestätigte lokale Einträge geben die Übergabe erneut frei. Lokales Speichern und der Wiederanlauf entfernen widersprüchliche Übertragungsmarkierungen.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Lint, TypeScript, 99 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `c319d81` wurde nach `origin/main` übertragen und auf Delphi01 als Image `plauderbox:delphi01-test-c319d81` (`sha256:f270beee943a…`) bereitgestellt. Internes HTTPS, neues Frontend-Asset, KI-Status, direkte Verbindung zu `test.siwako.ch` und fehlerfreier Containerstart sind geprüft; der vorherige Stand bleibt als Rückfallimage erhalten. **Nicht geprüft:** reale mobile Abnahme mit dem betroffenen Protokoll. Die zugehörige HappyHour-Korrektur aktualisiert bei einer erneut bewusst bestätigten Erstellen-Aktion den Cache-Snapshot bei unverändertem Token und unveränderter Ablaufzeit; statische Vertragsprüfung und vollständige ASP.NET-Vorkompilierung sind bestanden, mit ausschliesslich bereits vorhandenen Legacy-Warnungen.

## Session – KI-Fortschritt und sichtbare Begehungsnavigation

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Die während der KI-Anfrage nur in der Erfassungsansicht vorhandene Textmeldung wurde durch eine ansichtsunabhängige Fortschrittsanzeige mit Spinner, animiertem unbestimmtem Balken und verständlichem Statustext ergänzt. Der mobile Kopf zeigt während der gestarteten Begehung die kleinen, beschrifteten Buttons `‹ Back`, `Start` und `Beenden`; aktive oder nicht verfügbare Ziele sind sichtbar deaktiviert. Beim Sprung aus der Erfassung zu Start oder Kontrolle wird der aktuelle Entwurf zuerst lokal gesichert.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Lint, TypeScript, 102 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `6484eea` wurde nach `origin/main` übertragen und auf Delphi01 als Image `plauderbox:delphi01-test-6484eea` (`sha256:bb6523332992…`) bereitgestellt. HTTPS, neues Asset und UI-Marker, KI-Status, direkte HappyHour-Testverbindung und Containerlog sind geprüft; der vorherige Stand bleibt als Rückfallimage erhalten. **Nicht geprüft:** reale Sicht- und Touchprüfung auf dem Mobilgerät.

## Session – HappyHour-Übergabe anzeigen und doppelte Gruppierung entfernen

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Die globale Fortschrittskomponente wird nun sowohl für die KI-Auswertung als auch für die vollständige HappyHour-Übergabe verwendet. Während Punkte und Bilder übertragen werden, zeigt sie Spinner, animierten unbestimmten Balken und den Hinweis, die App geöffnet zu lassen. Das doppelte CBO-Feld `Traktandum` wurde aus der Erfassung entfernt. `Gruppe` ist damit das einzige fachliche Gruppierungsfeld für die zusammengefasste Protokollansicht und die Traktandenliste im HappyHour-PDF. Die frühere lokale Eigenschaft bleibt leer als reine Abwärtskompatibilität für bestehende IndexedDB-Daten erhalten und wird nicht übertragen.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Lint, TypeScript, 104 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `b68849b` wurde nach `origin/main` übertragen und auf Delphi01 als Image `plauderbox:delphi01-test-b68849b` (`sha256:6bed5a898586…`) bereitgestellt. HTTPS, neues Asset, HappyHour-Fortschritt, fehlendes Traktandum-CBO, KI-Status, direkte HappyHour-Testverbindung und Containerlog sind geprüft; der vorherige Stand bleibt als Rückfallimage erhalten. **Nicht geprüft:** reale Mobil- und PDF-Kontrolle in HappyHour.

## Session – Einheitliches App-Icon und sichtbare Patch-Version

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Das PWA-Icon und die Marke in allen App-Kopfzeilen wurden auf dieselbe Bildquelle vereinheitlicht. Die tatsächlich gebaute Version wird nun in jeder Kopfzeile angezeigt; Frontend- und Serverversion werden im Gesamtprüflauf gegeneinander geprüft. Der Stand erhält für diese kleinen Verbesserungen die Patch-Version `1.0.1`. D002 regelt neu, dass Haupt- und Nebenversionen nur nach Freigabe durch Stephan Routil erhöht werden, während der Coding-Agent die Patch-Stelle für abgeschlossene Bugfixes und kleine Verbesserungen selbstständig erhöht. Ebenfalls verbindlich ist nun eine sichtbare Status- und Fortschrittsanzeige bei wahrnehmbaren Wartezeiten durch interne oder externe Dienste.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Versionsabgleich, Lint, TypeScript, 105 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `867df94` und Tag `v1.0.1` wurden nach `origin` übertragen. Version `1.0.1` läuft auf Delphi01 als Image `plauderbox:delphi01-test-867df94` (`sha256:2dd33086cc17…`). HTTPS, gemeinsames Icon, eingebettete Version, KI-Status, HappyHour-Negativtest und Containerlog sind geprüft; der vorherige Stand bleibt als Rückfallimage erhalten. **Nicht geprüft:** reale Darstellung des gemeinsamen Icons und der Versionsnummer auf dem Mobilgerät. **Nächster Schritt:** Mobiltest auf Delphi01.

## Session – Abgelaufene Freigabe während der Audioauswertung erneuern

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Die fehlgeschlagenen Auswertungen auf Delphi01 wurden anhand der redigierten Serverlogs diagnostiziert: HappyHour wies die lokal gespeicherte Rundgangsfreigabe vor dem Lesen des Audios mit HTTP 410 ab; KI-Konfiguration und Anwendung waren bereit. Der bestehende Erneuerungsweg war erst im Abschluss erreichbar und bildete damit bei offenen Auswertungen eine Sackgasse. Version `1.0.2` führt bei einer abgelaufenen oder widerrufenen Freigabe direkt zum Erneuerungsscanner, behält Audio, Bilder und Einträge vollständig lokal und kehrt nach bestätigtem Commit zur vorherigen Ansicht zurück. Die erneute Audioauswertung bleibt bewusst durch den Mitarbeiter auszulösen.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Versionsabgleich, Lint, TypeScript, 107 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Darin enthalten sind HTTP-410-Klassifikation, Erhalt des Audio-Blobs und Rückkehr zur vorherigen Ansicht. Commit `e0c71e2` und Tag `v1.0.2` wurden nach `origin` übertragen. Version `1.0.2` läuft auf Delphi01 als Image `plauderbox:delphi01-test-e0c71e2` (`sha256:cb0de38438d0…`); HTTPS, eingebettete Version und Fehlermeldung, KI-Status, HappyHour-Negativtest und Containerlog sind geprüft. **Nicht geprüft:** reale Erneuerung und anschliessende Audioauswertung mit HappyHour auf dem Mobilgerät. **Nächster Schritt:** Mobiltest mit einer neuen Freigabe desselben Protokolls.

## Session – Offenen Eintrag in der Kontrolle auffindbar machen

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

In der Kontrollansicht zeigte der Zähler zwar einen offenen Eintrag, die Liste kennzeichnete aber weder den betroffenen Punkt noch den Grund ausreichend sichtbar. Version `1.0.3` hebt jeden nicht ausgewerteten, fehlgeschlagenen oder unvollständigen Eintrag einzeln hervor, kombiniert die zutreffenden Ursachen und zeigt die explizite Aktion `Öffnen und korrigieren`. Der gesamte Eintrag bleibt antippbar und öffnet über seine stabile ID genau den betroffenen Punkt.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Versionsabgleich, Lint, TypeScript, 108 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `c9c319a` und Tag `v1.0.3` wurden nach `origin` übertragen. Version `1.0.3` läuft auf Delphi01 als Image `plauderbox:delphi01-test-c9c319a` (`sha256:3aeccc176165…`); HTTPS, eingebettete Version und neue Korrekturaktion, KI-Status und Containerlog sind geprüft. **Nicht geprüft:** reale Sicht-/Touchprüfung auf dem Mobilgerät. **Nächster Schritt:** offenen Eintrag am Handy antippen und die Korrekturansicht kontrollieren.

## Session – Manuellen Eintrag ohne Audio abschliessbar machen

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Ein bewusst übernommener manueller Eintrag ohne Audio behielt fälschlich den Status `entwurf` und blockierte dadurch trotz vollständiger Felder den Begehungsabschluss. Version `1.0.4` setzt nur Einträge ohne Audio bei der bewussten Übernahme auf `ausgewertet` und entfernt einen früheren Auswertungsfehler. Einträge mit Audio bleiben unverändert bis zur bestätigten KI-Auswertung ausstehend.

**Bestanden:** vollständiger `tests/Pruefe-Prototyp.ps1` mit Versionsabgleich, Lint, TypeScript, 109 Frontendtests, Vue-Produktionsbuild, Offline-Browsertest, .NET-Release-Build, 12 Integrationstests, 9 Vertragstests, Offline-App-Shell und Token-Logschutz. Commit `e20a221` und Tag `v1.0.4` wurden nach `origin` übertragen. Version `1.0.4` läuft auf Delphi01 als Image `plauderbox:delphi01-test-e20a221` (`sha256:c68d9f0f3129…`); HTTPS, eingebettete Version, KI-Status und Containerlog sind geprüft. **Nicht geprüft:** realer Abschluss eines manuellen Eintrags auf dem Mobilgerät. **Nächster Schritt:** manuellen Eintrag ohne Audio übernehmen und die Begehung abschliessen.

## Tagesgesamtzeit

Nicht zuverlässig bestimmbar.
