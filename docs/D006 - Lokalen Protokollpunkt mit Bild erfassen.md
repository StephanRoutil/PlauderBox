---
typ: anforderung
id: D006
status: teilweise-abgeloest
datum: 2026-11-09
---

# D006 – Lokalen Protokollpunkt mit Bild erfassen

## Ziel

PlauderBox bildet genau einen lokalen Protokollpunkt mit den Feldern von `tblProtokollpunkt` ab. Der Mitarbeiter kann Bilder mit der Kamera aufnehmen oder aus Dateien wählen. Formular und Bilder bleiben im internen, app-eigenen IndexedDB-Speicher und werden nicht an HappyHour oder den PlauderBox-Server übertragen.

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
- Mehrere Bilder können nacheinander über Kamera oder Dateiauswahl angefügt werden.
- Das Bild bleibt nach einem Neuladen erhalten und kann erst nach Bestätigung gelöscht werden.
- Es werden nur Bilddateien bis 15 MB angenommen.
- Formular und Bild werden unabhängig von der lokalen Audioaufnahme gespeichert und beim Löschen oder erfolgreichen Übertragen der Aufnahme nicht entfernt.
- Die Oberfläche kennzeichnet eindeutig, dass keine Übertragung an HappyHour stattfindet.
- Ein erfolgreiches Transkript füllt `txtProtokollpunkt` nur dann lokal, wenn das Feld noch leer ist.

## Nicht Bestandteil

- Lesen von Referenzdaten oder Schreiben von Daten in HappyHour,
- mehrere Protokollpunkte,
- serverseitige Speicherung von Formular oder Bild,
- vollständig offline ladbare App-Hülle,
- produktive Benutzer-, Berechtigungs- oder Datenschutzfreigabe.

## Verknüpfungen

- [[D005 - Anforderungen an die intern gespeicherte Einzelaufnahme]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[T003 - Protokollpunktfelder und Bild lokal speichern]]
- [[LD004 - Lokaler Protokollpunktentwurf mit Bild]]

## Ablösung

Die ursprüngliche Begrenzung auf genau ein Bild wurde am 10.11.2026 durch [[D008 - Aufnahme verwerfen und mehrere Bilder lokal erfassen]] abgelöst. Die übrigen Anforderungen dieses Dokuments bleiben gültig.
