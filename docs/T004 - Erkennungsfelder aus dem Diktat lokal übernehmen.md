---
typ: test
id: T004
status: teilweise-bestanden
datum: 2026-11-10
---

# T004 – Erkennungsfelder aus dem Diktat lokal übernehmen

## Automatisierter Nachweis

- TypeScript-Prüfung bestanden.
- Sieben Frontendtests bestanden. Zwei davon prüfen die Übernahme von Gruppe, Thema, Ort und Transkript sowie den Schutz bereits kontrollierter Felder.
- Vue-Produktionsbuild bestanden.
- Gesamte .NET-Solution mit Logikvertrag und OpenAI-Implementierung ohne Fehler und Warnungen gebaut.

## Manueller Zielgerätetest

1. Neue Seite öffnen und prüfen, dass Bild und Diktat vor den Detailfeldern stehen.
2. Ein Bild aufnehmen.
3. Diktieren: `Gruppe Brandschutz. Thema fehlender Feuerlöscher. Ort Untergeschoss 2 im Technikraum. Der vorgesehene Feuerlöscher fehlt.`
4. `Diktat jetzt auswerten` wählen.
5. Prüfen, dass Gruppe, Thema, Ort und Inhalt passend gefüllt werden.
6. Ein Feld manuell ändern, erneut diktieren und prüfen, dass die manuelle Eingabe nicht überschrieben wird.
7. Eine Aufnahme mit nicht genanntem Ort auswerten und prüfen, dass kein Ort erfunden wird.
8. Seite neu laden und die lokale Persistenz der erkannten Werte und des Bilds prüfen.

Die echte OpenAI-Strukturierung und die mobile Anordnung gelten erst nach diesem Lauf als bestanden.

## Verknüpfungen

- [[D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen]]
- [[E006 - Diktate mit strukturiertem KI-Vertrag auswerten]]
- [[LD005 - Bild und Diktat vor dem strukturierten Entwurf erfassen]]
