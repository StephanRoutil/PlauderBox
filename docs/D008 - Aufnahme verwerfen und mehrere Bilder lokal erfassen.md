---
typ: anforderung
id: D008
status: umgesetzt-testoffen
datum: 2026-11-10
---

# D008 – Aufnahme verwerfen und mehrere Bilder lokal erfassen

## Ziel

Der Mitarbeiter kann eine noch nicht ausgewertete Audioaufnahme bewusst verwerfen und zu einem lokalen Protokollpunkt mehrere Bilder erfassen. Bilder und Audio bleiben voneinander unabhängig.

## Akzeptanzkriterien

- Eine gespeicherte, noch nicht ausgewertete Aufnahme kann über `Aufnahme löschen` nach Bestätigung verworfen werden.
- Das Verwerfen der Aufnahme entfernt weder Protokollpunktfelder noch Bilder.
- Mehrere Bilder können nacheinander mit Kamera oder Dateiauswahl angefügt werden.
- Jedes Bild erhält eine stabile lokale Kennung und eine eigene Vorschau.
- Jedes Bild kann nach Bestätigung einzeln gelöscht werden; die übrigen Bilder bleiben erhalten.
- Bereits mit der Vorversion gespeicherte Einzelbilder bleiben lesbar und löschbar.
- Jedes Bild ist weiterhin auf 15 MB begrenzt und wird nicht an HappyHour oder den PlauderBox-Server übertragen.

## Verknüpfungen

- [[D006 - Lokalen Protokollpunkt mit Bild erfassen]]
- [[T005 - Aufnahme verwerfen und mehrere Bilder getrennt verwalten]]
- [[LD006 - Mehrere lokale Bilder und verwerfbare Aufnahme]]
