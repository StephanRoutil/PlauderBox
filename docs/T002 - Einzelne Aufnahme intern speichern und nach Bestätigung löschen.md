---
typ: test
id: T002
status: teilweise-bestanden
datum: 2026-11-09
---

# T002 – Einzelne Aufnahme intern speichern und nach Bestätigung löschen

## Automatisierter Nachweis

- TypeScript-Prüfung mit `vue-tsc` bestanden.
- Drei isolierte IndexedDB-Tests bestanden: Blob speichern und laden, vorhandene Einzelaufnahme ersetzen sowie bestätigte Aufnahme löschen.
- Vue-Produktionsbuild bestanden.
- Gesamte .NET-Solution ohne Fehler und Warnungen gebaut.

## Noch manuell auf dem Zielgerät zu prüfen

1. Aufnahme starten und stoppen.
2. Status `Noch nicht übertragen` und Metadaten prüfen.
3. Seite neu laden und Erhalt der Aufnahme prüfen.
4. Netzwerk ausschalten und prüfen, dass die Aufnahme erhalten bleibt.
5. Netzwerk einschalten, `Jetzt übertragen` wählen und Transkript prüfen.
6. Seite erneut laden und prüfen, dass die bestätigte Aufnahme nicht mehr ausstehend ist.
7. Einen zweiten Lauf bewusst über `Aufnahme löschen` verwerfen und Bestätigungsdialog prüfen.

Der Test gilt erst nach diesem mobilen Browserlauf als vollständig bestanden.
