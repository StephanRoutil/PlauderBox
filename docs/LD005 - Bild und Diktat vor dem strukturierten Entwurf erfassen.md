---
typ: loesungsdokumentation
id: LD005
status: lokal-geprueft
datum: 2026-11-10
---

# LD005 – Bild und Diktat vor dem strukturierten Entwurf erfassen

## Gültiger Stand

Die mobile Oberfläche zeigt bei einem neuen Punkt zuerst die Bildauswahl und die Sprachaufnahme. Der lokale Protokollpunkt folgt als Kontrollbereich. Nach der bewussten Audioauswertung liefert der Server neben dem Transkript strukturierte Vorschläge für Gruppe, Thema und Ort. Nur leere lokale Felder werden ergänzt.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| UI-Reihenfolge und lokale Übernahme | `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Lokales Ortsfeld und geschützte Vorschlagsübernahme | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts` | umgesetzt |
| Frontendtests | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.test.ts` | 7 Tests bestanden |
| Providerunabhängiger Strukturierungsvertrag | `src/PlauderBox.Logik/IProtokollpunktStrukturierer.cs` | umgesetzt |
| OpenAI Responses API mit strengem JSON-Schema | `src/PlauderBox.Datenmanagement/OpenAiProtokollpunktStrukturierer.cs` | umgesetzt |
| HTTP-Endpunkt und Composition Root | `src/Program.cs` | umgesetzt |

Branch und Commit werden nach der Veröffentlichung ergänzt. Die echte KI-Auswertung und mobile Darstellung auf Delphi01 bleiben gemäss T004 offen.

## Grenzen

- `strOrt` ist ausschliesslich lokaler Erfassungskontext und kein Feld von `tblProtokollpunkt`.
- Die Strukturierung ist ein KI-Vorschlag und muss vom Mitarbeiter kontrolliert werden.
- Formular und Bild bleiben lokal; nur die bewusst freigegebene Audioaufnahme und ihr Transkript werden durch die konfigurierten OpenAI-Dienste verarbeitet.

## Verknüpfungen

- [[D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen]]
- [[E006 - Diktate mit strukturiertem KI-Vertrag auswerten]]
- [[T004 - Erkennungsfelder aus dem Diktat lokal übernehmen]]
