---
typ: loesungsdokumentation
id: LD005
status: testbereit-delphi01
datum: 2026-11-10
---

# LD005 – Bild und Diktat vor dem strukturierten Entwurf erfassen

## Gültiger Stand

Die mobile Oberfläche zeigt bei einem neuen Punkt zuerst die Bildauswahl und die Sprachaufnahme. Der lokale Protokollpunkt folgt als Kontrollbereich. Nach der bewussten Audioauswertung liefert der Server neben dem Transkript strukturierte Vorschläge für Gruppe, Thema, Inhalt und einen allenfalls genannten Rechtsverweis. Nur leere lokale Felder werden ergänzt.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| UI-Reihenfolge und lokale Übernahme | `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Geschützte Vorschlagsübernahme und Bereinigung des verworfenen Ortsfelds | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts`, `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Frontendtests | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.test.ts` | 8 Tests bestanden |
| Providerunabhängiger Strukturierungsvertrag | `src/PlauderBox.Logik/IProtokollpunktStrukturierer.cs` | umgesetzt |
| OpenAI Responses API mit strengem JSON-Schema | `src/PlauderBox.Datenmanagement/OpenAiProtokollpunktStrukturierer.cs` | umgesetzt |
| HTTP-Endpunkt und Composition Root | `src/Program.cs` | umgesetzt |

Branch: `main`, Commit `3161047`. Das daraus auf Delphi01 gebaute Image besitzt die Image-ID `sha256:4348801d00c0…` und läuft unter dem bestehenden internen HTTPS-Testzugang. Einstieg, neues Frontend-Asset, KI-Status mit Strukturmodell, Content-Security-Policy für lokale Bildvorschauen und Containerstart sind geprüft. Die echte Audio- und Strukturierungsauswertung auf dem Android-Gerät bleibt gemäss T004 offen.

## Grenzen

- Es wird kein separates Ortsfeld geführt; ein aus der Vorversion lokal gespeicherter Wert wird beim Laden entfernt.
- Die Strukturierung ist ein KI-Vorschlag und muss vom Mitarbeiter kontrolliert werden.
- Formular und Bild bleiben lokal; nur die bewusst freigegebene Audioaufnahme und ihr Transkript werden durch die konfigurierten OpenAI-Dienste verarbeitet.

## Verknüpfungen

- [[D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen]]
- [[E006 - Diktate mit strukturiertem KI-Vertrag auswerten]]
- [[T004 - Erkennungsfelder aus dem Diktat lokal übernehmen]]
