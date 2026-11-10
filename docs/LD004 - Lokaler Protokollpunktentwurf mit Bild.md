---
typ: loesungsdokumentation
id: LD004
status: abgeloest
datum: 2026-11-09
---

# LD004 – Lokaler Protokollpunktentwurf mit Bild

## Gültiger Stand

Die Vue-Oberfläche bildet genau einen lokalen Protokollpunkt anhand der Felder von `tblProtokollpunkt` ab. Änderungen werden automatisch in einem eigenen IndexedDB-Objektspeicher gesichert. Genau ein Bild wird als Blob in einem weiteren Objektspeicher gehalten. Weder Formular noch Bild besitzen einen Übertragungsweg zu HappyHour oder zum PlauderBox-Server.

Die vorhandene Audiofunktion bleibt getrennt: Nur die Aufnahme wird nach bewusster Aktion zur Transkription übertragen. Die Antwort wird in ein leeres Feld `txtProtokollpunkt` übernommen; ein bereits bearbeiteter Inhalt wird nicht überschrieben.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| Formular, lokale Statusanzeige und Bildauswahl | `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Mobile Darstellung | `src/PlauderBox.UI.Client/src/styles.css` | umgesetzt |
| IndexedDB-Verträge für Protokollpunkt und Bild | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts` | umgesetzt |
| Isolierte Speichertests | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.test.ts` | 5 Tests bestanden |
| Statische Produktionsausgabe | `src/wwwroot/` | durch Vite erzeugt |
| Gesamtprüfung | `tests/Pruefe-Prototyp.ps1` | lokal bestanden |

Branch: `main`, Commit `f30fac1`. Das daraus auf Delphi01 gebaute Image `plauderbox:delphi01-test-20261109` besitzt die Image-ID `sha256:20d3f2b1d246…`. HTTPS-Einstieg, neues Frontend-Asset, KI-Status und laufender Container wurden erfolgreich geprüft. Der manuelle Formular- und Bildtest auf Android bleibt gemäss T003 offen.

## Speichergrenzen

- Der interne Browser-Speicher ist durch Same-Origin und Browser-Sandbox von Galerie, Downloads, SD-Karte und Cloud getrennt.
- Es wird genau ein lokaler Protokollpunkt, ein Bild und eine ausstehende Audioaufnahme unterstützt.
- Bilder sind auf 15 MB begrenzt und werden nicht komprimiert.
- Zahlenfelder für Protokollart und Projektansprechpartner enthalten vorerst lokale IDs, weil noch keine HappyHour-Referenzdaten gelesen werden.

## Verknüpfungen

- [[D006 - Lokalen Protokollpunkt mit Bild erfassen]]
- [[T003 - Protokollpunktfelder und Bild lokal speichern]]
- [[LD003 - Vue Oberfläche mit intern gespeicherter Einzelaufnahme]]

## Ablösung

Die hier dokumentierte Begrenzung auf genau ein Bild wurde am 10.11.2026 durch [[LD006 - Mehrere lokale Bilder und verwerfbare Aufnahme]] abgelöst. Dieser frühere Stand bleibt als Nachweis der ersten Ausbaustufe erhalten.
