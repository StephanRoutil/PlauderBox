---
typ: test
id: T009
status: teilweise-bestanden
datum: 2026-11-11
anforderung: D013
---

# T009 - Idempotente HappyHour-Bildübergabe prüfen

## Prüfumfang

1. Zwei kontrollierte Punkte mit mehreren Kamera- und Galeriebildern übergeben.
2. Prüfen, dass zuerst alle Punkte bestätigt und danach alle Bilder mit korrekter Punkt-ID übertragen werden.
3. Unvollständige Punktantwort, ungültige Bildantwort, Netzabbruch, 15-MB-Grenze, ungültige Bild-GUID, abgelaufene Freigabe und HappyHour-Konflikt negativ prüfen.
4. Bei jedem Fehler unveränderte lokale Daten nachweisen.
5. Dieselbe Begehung erneut übertragen und unveränderte Punkt-, Dokument- und Bildanzahl in HappyHour kontrollieren.
6. Vollständigen PlauderBox-Prüflauf, HappyHour-Vorkompilierung, physische Dateiablage, `tblDokument` und HappyHour-Anzeige nachweisen.
7. Einen mit einem älteren Stand nur punktseitig übertragenen Rundgang erneut öffnen, die vorhandenen Bilder nachliefern und danach einen weiteren Übergabeversuch sperren.
8. Eine abgelaufene Freigabe am Abschluss durch einen neuen QR-Code desselben Protokolls ersetzen und unveränderte Einträge, Bilder und Status nachweisen. Einen QR-Code eines anderen Protokolls sowie einen fehlgeschlagenen lokalen Commit ablehnen, ohne den bisherigen Token oder lokale Daten zu verändern.
9. Aufnahmezeitpunkt bis zum HappyHour-Vertrag nachweisen. Danach den gemeinsamen Bilddownload mit den lokalen Originalen vergleichen und sicherstellen, dass eine HappyHour-seitige 1200-Pixel-Kopie weder Pixelmass noch Dateigrösse des Downloads verändert.

## Erwartung

Jedes Bild wird genau einmal dem richtigen bestätigten Protokollpunkt zugeordnet. Teilfehler sind sichtbar und sicher wiederholbar. Erst die vollständige Punkt- und Bildbestätigung führt zum Übergabeerfolg.

## Stand 11.11.2026

Die automatisierten PlauderBox-Prüfungen mit 67 Frontendtests und die HappyHour-Vorkompilierung sind bestanden. Der Dateizeitpunkt wird lokal gespeichert und als Aufnahmezeitpunkt durch den Server-zu-Server-Vertrag geführt; der gemeinsame Download baut weiterhin auf dem unveränderten Originalblob auf. HEIC/WebP-Abweisung, Bildfehler nach bestätigtem Punkt, 15-MB-Vorprüfung, 429-Kontingentabbildung, eigener Scope, Dokumentrecht, Sperren und Dateikompensation werden automatisiert beziehungsweise statisch geprüft. Die Wiederaufnahme einer älteren, nur punktseitig übertragenen Begehung sowie die Sperre nach Bildbestätigung sind automatisiert nachgewiesen. Die protokollgebundene Freigabeerneuerung bewahrt Bilder und Status bei erfolgreichem Commit; falsches Protokoll und Commitfehler sind negativ getestet. Ein Scanner-Ablauftest weist nach, dass ein ungültiger Code die sichtbare externe Fehlermeldung nicht hinter dem alten Kamerastatus verbirgt. Der mobile Nachweis des neuen Dateinamens, der HappyHour-1200-Pixel-Kopie, des unveränderten Downloads und der reale Teilabbruchfall bleiben offen.

## Verknüpfungen

- `D013 - Begehungsbilder an bestätigte HappyHour-Protokollpunkte übergeben.md`
- `E010 - Begehungsbilder nach bestätigter Punktzuordnung einzeln übertragen.md`
- `LD010 - Begehungsbilder kontrolliert an HappyHour übertragen.md`
