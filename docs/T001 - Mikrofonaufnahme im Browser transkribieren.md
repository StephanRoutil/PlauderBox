---
typ: test
id: T001
status: bestanden
datum: 2026-11-09
---

# T001 – Mikrofonaufnahme im Browser transkribieren

## Prüfziel

Nachweis, dass der lokale PlauderBox-Prototyp eine echte Browser-Mikrofonaufnahme entgegennimmt, serverseitig an den konfigurierten OpenAI-Transkriptionsdienst überträgt und den erkannten Text ohne dauerhafte Speicherung anzeigt.

## Prüfstand

- lokaler ASP.NET-Core-Prototyp auf Loopback,
- Browseraufnahme über `MediaRecorder`,
- serverseitig konfigurierter PaperTrap-Schlüsselpfad,
- OpenAI-Modell `gpt-transcribe`,
- keine HappyHour-Anbindung.

## Durchführung und Ergebnis

1. Release-Build: bestanden, 0 Fehler und 0 Warnungen.
2. JavaScript-Syntax und 12 DOM-Verweise: bestanden.
3. Startseite und Statusendpunkt: HTTP 200; KI-Anbindung bereit.
4. Benutzer hat Mikrofonzugriff im Browser erlaubt und eine 17 Sekunden lange deutsche Aufnahme erstellt.
5. Nach bewusstem Stoppen wurde die Aufnahme übertragen und ein vollständiger, verständlicher Text angezeigt.
6. Fachbegriff, Zahl, Mengengrenze und formulierte Massnahme wurden im Ergebnis erkannt.
7. API-Schlüssel und technische Rohantwort wurden nicht im Browser oder in der Prüfausgabe angezeigt.

## Abgrenzung

- Die inhaltliche Übereinstimmung wurde anhand des vom Benutzer gesprochenen Tests beurteilt, nicht mit einem normierten Audiokorpus gemessen.
- Die Ausgabe verwendete einmal deutsche statt schweizerische Rechtschreibung; eine nachgelagerte sprachliche Normalisierung ist nicht Bestandteil dieses Prototyps.
- Nicht geprüft sind mobile Geräte, längere Aufnahmen, Störgeräusche, Dialekte, Parallelbetrieb und Containerbetrieb.

