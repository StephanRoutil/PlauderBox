---
typ: anforderung
id: D005
status: umgesetzt
datum: 2026-11-09
---

# D005 – Anforderungen an die intern gespeicherte Einzelaufnahme

## Ziel

Als kleinste Ausbaustufe speichert PlauderBox genau eine abgeschlossene Sprachaufnahme im internen, app-eigenen Browser-Speicher und zeigt sie eindeutig als `Noch nicht übertragen` an.

## Akzeptanzkriterien

- Die Aufnahme wird nach dem Stoppen als Audio-Blob mit stabiler Kennung, Zeitpunkt, Medientyp, Grösse und Dauer in IndexedDB gespeichert.
- Die Aufnahme erscheint nicht in Downloads, Galerie, SD-Karte oder Cloud.
- Nach Neuladen der Seite wird die ausstehende Aufnahme wieder angezeigt.
- Solange eine Aufnahme aussteht, kann keine zweite Aufnahme versehentlich begonnen werden.
- Der Mitarbeiter kann die Aufnahme bewusst zur vorhandenen Transkription übertragen.
- Die lokale Aufnahme wird erst nach erfolgreicher Serverantwort gelöscht.
- Bei fehlender Verbindung oder Übertragungsfehler bleibt die Aufnahme lokal erhalten.
- Bewusstes Löschen benötigt eine Umfangsbestätigung.

## Nicht Bestandteil

- mehrere Aufnahmen oder Protokollpunkte,
- automatische Hintergrundsynchronisierung,
- offline ladbare App-Hülle,
- Foto, QR-Code oder HappyHour-Anbindung,
- produktive Datenschutz- oder Sicherheitsfreigabe.

## Verknüpfungen

- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[E004 - Vue und TypeScript für die mobile Oberfläche verwenden]]
- [[T002 - Einzelne Aufnahme intern speichern und nach Bestätigung löschen]]
