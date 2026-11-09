---
typ: anforderung
id: D006
status: umgesetzt-testoffen
datum: 2026-11-09
---

# D006 – Lokalen Protokollpunkt mit Bild erfassen

## Ziel

PlauderBox bildet genau einen lokalen Protokollpunkt mit den Feldern von `tblProtokollpunkt` ab. Der Mitarbeiter kann zusätzlich genau ein Bild mit der Kamera aufnehmen oder aus einer Datei wählen. Formular und Bild bleiben im internen, app-eigenen IndexedDB-Speicher und werden nicht an HappyHour oder den PlauderBox-Server übertragen.

## Abgebildete Felder

| Feld aus `tblProtokollpunkt` | Lokale Erfassung |
|---|---|
| `intProtokollpunktID` | technische Anzeige, lokal `0` |
| `intProtokollFKID` | Zahlenfeld |
| `intProtokollpunktArtFKID` | Zahlenfeld; Auswahlliste folgt erst mit Referenzdaten |
| `datProtokollpunkt` | Datumsfeld |
| `blnNachverfolgen` | Kontrollfeld |
| `intProjektAnsprechpartnerFKID` | optionales Zahlenfeld; Auswahlliste folgt erst mit Referenzdaten |
| `datFrist` | optionales Datumsfeld bei Nachverfolgung |
| `blnErledigt` | Kontrollfeld bei Nachverfolgung |
| `strRechtsverweis` | Textfeld |
| `strGruppe` | Textfeld |
| `intReihenfolge` | technische Anzeige, lokal `0` |
| `strProtokollpunkt` | kurzer Titel |
| `txtProtokollpunkt` | mehrzeiliger Inhalt |
| `GUID` | lokal erzeugte technische Kennung |

## Akzeptanzkriterien

- Alle oben genannten Felder sind lokal abgebildet und bleiben nach einem Neuladen erhalten.
- Änderungen am Formular werden automatisch in IndexedDB gespeichert.
- Nachverfolgung setzt bei erstmaliger Aktivierung eine Frist von 14 Tagen und den Status auf nicht erledigt; beim Deaktivieren wird die Frist entfernt und der Punkt als erledigt markiert.
- Genau ein Bild kann über Kamera oder Dateiauswahl angefügt und ersetzt werden.
- Das Bild bleibt nach einem Neuladen erhalten und kann erst nach Bestätigung gelöscht werden.
- Es werden nur Bilddateien bis 15 MB angenommen.
- Formular und Bild werden unabhängig von der lokalen Audioaufnahme gespeichert und beim Löschen oder erfolgreichen Übertragen der Aufnahme nicht entfernt.
- Die Oberfläche kennzeichnet eindeutig, dass keine Übertragung an HappyHour stattfindet.
- Ein erfolgreiches Transkript füllt `txtProtokollpunkt` nur dann lokal, wenn das Feld noch leer ist.

## Nicht Bestandteil

- Lesen von Referenzdaten oder Schreiben von Daten in HappyHour,
- mehrere Protokollpunkte oder mehrere Bilder,
- serverseitige Speicherung von Formular oder Bild,
- vollständig offline ladbare App-Hülle,
- produktive Benutzer-, Berechtigungs- oder Datenschutzfreigabe.

## Verknüpfungen

- [[D005 - Anforderungen an die intern gespeicherte Einzelaufnahme]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[T003 - Protokollpunktfelder und Bild lokal speichern]]
- [[LD004 - Lokaler Protokollpunktentwurf mit Bild]]
