---
typ: test
id: T003
status: teilweise-bestanden
datum: 2026-11-09
---

# T003 – Protokollpunktfelder und Bild lokal speichern

## Automatisierter Nachweis

- TypeScript-Prüfung mit `vue-tsc` bestanden.
- Fünf isolierte IndexedDB-Tests bestanden; darunter bleiben die Protokollpunktfelder nach Löschen der Audioaufnahme erhalten und ein Bild kann gespeichert, gelesen und gelöscht werden.
- Vue-Produktionsbuild bestanden.
- Gesamte .NET-Solution ohne Fehler und Warnungen gebaut.

## Manueller Zielgerätetest

1. Mehrere Protokollpunktfelder ausfüllen und die Anzeige `Lokal gespeichert` abwarten.
2. Seite neu laden und prüfen, dass die Werte unverändert erscheinen.
3. Mit der Handykamera ein Bild anfügen und die lokale Vorschau prüfen.
4. Seite erneut laden und prüfen, dass das Bild weiterhin erscheint.
5. Eine Audioaufnahme erstellen und übertragen; prüfen, dass das Transkript ein zuvor leeres Inhaltsfeld lokal füllt.
6. Prüfen, dass Formular und Bild nach der Transkription erhalten bleiben.
7. Das Bild löschen, den Bestätigungsdialog beantworten und nach Neuladen prüfen, dass es entfernt bleibt.
8. In HappyHour prüfen, dass kein Protokollpunkt und kein Dokument angelegt oder verändert wurde.

Der Test gilt erst nach diesem mobilen Browserlauf als vollständig bestanden.

## Verknüpfungen

- [[D006 - Lokalen Protokollpunkt mit Bild erfassen]]
- [[LD004 - Lokaler Protokollpunktentwurf mit Bild]]
