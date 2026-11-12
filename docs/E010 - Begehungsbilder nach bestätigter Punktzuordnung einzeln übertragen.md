---
typ: entscheid
id: E010
status: beschlossen
datum: 2026-11-11
---

# E010 - Begehungsbilder nach bestätigter Punktzuordnung einzeln übertragen

## Entscheid

PlauderBox überträgt jedes Bild einzeln, nachdem HappyHour den zugehörigen Protokollpunkt eindeutig bestätigt hat. Die stabile Bild-GUID ist der Wiederholungsschlüssel. Der PlauderBox-Server nimmt Browser-Multipart-Daten entgegen, prüft Token, Punkt-ID, Bild-ID, Anzahl und Grösse und leitet den reinen Bildinhalt als WCF-Stream über den begrenzten HappyHour-Vertrag weiter.

Zusätzlich wird der beim Hinzufügen gespeicherte Aufnahmezeitpunkt als ISO-8601-Wert weitergegeben. PlauderBox verkleinert weder den internen Blob noch die gemeinsam heruntergeladenen Originaldateien. Die für PDF-Protokolle bestimmte 1200-Pixel-Kopie ist ausschliesslich Verantwortung von HappyHour.

Eine Übergabe gilt nur dann als vollständig, wenn die Punktantwort vollständig und jedes lokale Bild mit Bild-GUID, Protokollpunkt-ID und HappyHour-Dokument-ID bestätigt ist. Bei jedem Teilfehler bleibt die lokale Begehung unverändert. Ein erneuter Versuch ist idempotent.

Für Begehungen, die mit einem älteren PlauderBox-Stand bereits als punktseitig übertragen markiert wurden, aber noch keine Bildbestätigung besitzen, wird die Punktübergabe einmal idempotent wiederholt. HappyHour liefert dabei die bereits vorhandenen Protokollpunkt-IDs zurück; anschliessend werden die weiterhin lokal gespeicherten Bilder nachgeliefert. Erst der zusätzliche Zeitpunkt `bilderUebertragenAm` sperrt weitere Übergabeversuche.

Die Bilder werden nicht als ZIP und nicht gemeinsam mit dem JSON-Punktvertrag versendet. Damit bleiben Dateigrössen begrenzt, Teilfehler wiederholbar und Punkt-/Bildzuordnung eindeutig.

## Verknüpfungen

- `D013 - Begehungsbilder an bestätigte HappyHour-Protokollpunkte übergeben.md`
- `E008 - Protokollpunkte idempotent über den PlauderBox-Server schreiben.md`
- `E009 - Begehungsbilder einzeln mit einer Aktion extern sichern.md`
- `LD010 - Begehungsbilder kontrolliert an HappyHour übertragen.md`
