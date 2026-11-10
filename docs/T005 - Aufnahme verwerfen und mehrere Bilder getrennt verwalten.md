---
typ: test
id: T005
status: teilweise-bestanden
datum: 2026-11-10
---

# T005 – Aufnahme verwerfen und mehrere Bilder getrennt verwalten

## Automatisierter Nachweis

- Der IndexedDB-Test speichert zwei Bilder, lädt beide und löscht nur das ausgewählte Bild.
- Der bestehende Aufnahmetest weist das gezielte Löschen der ausstehenden Aufnahme nach.
- Ein weiterer Test bestätigt, dass Bilder beim Verwerfen der Audioaufnahme erhalten bleiben.
- TypeScript-Prüfung, acht Frontendtests, Vue-Build und .NET-Release-Build bestanden.

## Manueller Zielgerätetest

1. Zwei Bilder nacheinander aufnehmen und beide Vorschauen prüfen.
2. Seite neu laden und prüfen, dass beide Bilder erhalten bleiben.
3. Ein Bild löschen und prüfen, dass nur dieses Bild verschwindet.
4. Eine Audioaufnahme erstellen und `Aufnahme löschen` wählen.
5. Den Dialog zunächst abbrechen und prüfen, dass die Aufnahme bestehen bleibt.
6. Erneut löschen und bestätigen; prüfen, dass die Aufnahme entfernt wird, beide Protokollpunktfelder und das verbleibende Bild jedoch erhalten bleiben.

## Verknüpfungen

- [[D008 - Aufnahme verwerfen und mehrere Bilder lokal erfassen]]
- [[LD006 - Mehrere lokale Bilder und verwerfbare Aufnahme]]
