---
typ: entscheid
id: E004
status: entschieden
datum: 2026-11-09
---

# E004 – Vue und TypeScript für die mobile Oberfläche verwenden

## Ausgangslage

PlauderBox benötigt eine installierbare, offlinefähige mobile Oberfläche mit Mikrofonzugriff, lokaler Warteschlange, Synchronisationszuständen und später zusätzlichen Masken für Projekte, Aufnahmen, Fotos und Kontrolle. Blazor Server scheidet wegen der notwendigen Offlinefähigkeit aus. Blazor WebAssembly wäre möglich, würde für Mikrofon, Service Worker und lokalen Browser-Speicher dennoch JavaScript-Interop benötigen.

## Entscheid

Die produktive mobile PlauderBox-Oberfläche wird mit **Vue und TypeScript** umgesetzt.

- Vite übernimmt den Frontend-Build und die lokale Entwicklung.
- PlauderBox wird als Progressive Web App mit Service Worker ausgeliefert.
- Mikrofon und MediaRecorder werden direkt über die Browser-APIs angesprochen.
- Der lokale Speicherzugriff wird hinter einem eigenen TypeScript-Vertrag gekapselt.
- Die Kommunikation mit dem ASP.NET-Core-Server erfolgt ausschliesslich über versionierte HTTPS-/JSON- beziehungsweise Multipart-Verträge.
- ASP.NET Core liefert Fachlogik, Authentifizierung, Synchronisation und externe Anbindungen; Vue enthält keine API-Schlüssel und keine direkte HappyHour-Verbindung.

## Begründung

- Vue eignet sich für eine wachsende mobile Oberfläche, ohne die zusätzliche Komplexität eines umfangreicheren Frontend-Ökosystems zu erzwingen.
- TypeScript macht Offlinezustände und Schnittstellenverträge explizit prüfbar.
- Browserfunktionen können ohne zusätzliche Interop-Schicht genutzt werden.
- Die klare HTTP-Grenze hält Server und Frontend unabhängig austauschbar.
- Der vorhandene HTML-/JavaScript-Prototyp kann schrittweise übernommen werden; seine Fachfunktion wird nicht neu erfunden.

## Folgen

- Das Team verwendet im Frontend zusätzlich zu C# auch TypeScript.
- Frontend- und Server-Build bleiben getrennt reproduzierbar.
- Gemeinsame Datenverträge werden nicht durch gemeinsam kompilierte C#-Typen, sondern durch dokumentierte und geprüfte API-Verträge verbunden.
- UI-Tests müssen Offline-, Synchronisations- und Browserfälle abdecken.

## Nicht gewählt

- Blazor Server wegen fehlender Offlinefähigkeit,
- Blazor WebAssembly wegen zusätzlicher Laufzeitgrösse und weiterhin notwendigem JavaScript-Interop,
- React wegen des für den ersten Umfang nicht benötigten grösseren Ökosystems,
- Vanilla JavaScript als dauerhafte Produktstruktur,
- native App, solange keine nachgewiesene PWA-Grenze sie erforderlich macht.

## Übergang vom Prototyp

Der aktuell geprüfte Aufnahmeprototyp unter `src/wwwroot` bleibt der technische Funktionsnachweis. Die Migration auf Vue und TypeScript erfolgt erst mit dem nächsten ausdrücklich beauftragten Umsetzungsschritt.

