---
typ: anforderung
id: D013
status: lokal-umgesetzt-e2e-offen
datum: 2026-11-11
---

# D013 - Begehungsbilder an bestätigte HappyHour-Protokollpunkte übergeben

## Anforderung

Nach der bewussten Übergabe eines kontrollierten Rundgangs sollen alle lokal erfassten Bilder in HappyHour beim richtigen Protokollpunkt gespeichert werden.

## Akzeptanzkriterien

- Bilder werden erst nach einer bestätigten HappyHour-Protokollpunkt-ID übertragen.
- Jedes Bild wird mit seiner stabilen lokalen Bild-GUID übertragen.
- Erst wenn alle Punkte und Bilder bestätigt sind, zeigt PlauderBox die Übergabe als erfolgreich an.
- Bei einem Fehler bleiben sämtliche lokalen Daten erhalten und die Übergabe kann sicher wiederholt werden.
- Eine ältere, bereits als punktseitig übertragen markierte Begehung ohne Bildbestätigung kann die lokalen Bilder nachliefern, ohne neue Protokollpunkte zu erzeugen.
- Wiederholungen erzeugen weder doppelte Punkte noch doppelte HappyHour-Dokumente.
- Kamera- und Galeriebilder verwenden denselben Übergabeweg.
- PlauderBox überträgt je Anfrage genau ein Bild bis höchstens 15 MB; nicht unterstützte Bildformate werden sichtbar abgewiesen.
- Der lokale Button zur zusätzlichen Sicherung aller Einzelbilder bleibt erhalten.
- PlauderBox übermittelt den beim Hinzufügen gespeicherten Aufnahmezeitpunkt. Das lokale Bild und die mit einer Aktion extern gesicherte Datei bleiben in Originalgrösse und inhaltlich unverändert; die Begrenzung der HappyHour-Dokumentkopie auf 1200 Pixel erfolgt ausschliesslich in HappyHour.
- PlauderBox ändert weder Protokollstatus noch Freigabe oder Versand.

## Verknüpfungen

- `E010 - Begehungsbilder nach bestätigter Punktzuordnung einzeln übertragen.md`
- `LD010 - Begehungsbilder kontrolliert an HappyHour übertragen.md`
- `T009 - Idempotente HappyHour-Bildübergabe prüfen.md`
