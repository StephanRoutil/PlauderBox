---
typ: entscheid
id: E006
status: entschieden
datum: 2026-11-10
---

# E006 – Diktate mit strukturiertem KI-Vertrag auswerten

## Ausgangslage

Die bisherige Transkriptionsantwort enthielt nur freien Text. Gruppe, Thema und Ort sollen zuverlässig getrennt erkannt werden, ohne dass die UI unkontrolliert Freitext-JSON interpretieren oder fehlende Angaben ergänzen muss.

## Entscheid

Nach der Audio-Transkription sendet das Datenmanagement das Transkript an die OpenAI Responses API. Ein striktes JSON-Schema verlangt genau die Zeichenfelder `gruppe`, `thema` und `ort`; weitere Eigenschaften sind ausgeschlossen. Der Prompt verlangt leere Zeichenfolgen für nicht erkennbare Angaben und verbietet Ergänzungen ausserhalb des Diktats.

Das providerunabhängige Ergebnis wird über `IProtokollpunktStrukturierer` an die UI-Grenze zurückgegeben. Die UI übernimmt Vorschläge ausschliesslich in leere lokale Felder. Transkription und Strukturierung gelten für diesen Prototyp als gemeinsamer Auswertungsschritt; bei einem Fehler bleibt die Audioaufnahme lokal erhalten.

Das Strukturmodell ist separat über `PlauderBox:KI:Strukturmodell` konfigurierbar. Der Teststandard ist `gpt-6-luna`, weil die Aufgabe eng strukturiert und kostenbewusst ist.

## Abgrenzung

- Keine automatische fachliche Freigabe.
- Keine direkte HappyHour-Übertragung.
- Keine Zuordnung des lokalen Ortsfelds zu einem HappyHour-Feld ohne späteren Entscheid.

## Verknüpfungen

- [[D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen]]
- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]
- [[T004 - Erkennungsfelder aus dem Diktat lokal übernehmen]]
