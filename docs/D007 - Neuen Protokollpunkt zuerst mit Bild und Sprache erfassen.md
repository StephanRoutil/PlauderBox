---
typ: anforderung
id: D007
status: umgesetzt-testoffen
datum: 2026-11-10
---

# D007 – Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen

## Ziel

Bei einem neuen Protokollpunkt stehen Bild- und Spracherfassung vor den Detailfeldern. Nach der bewussten Auswertung versucht PlauderBox, `Gruppe`, `Thema` und `Ort` aus dem Diktat zu erkennen und in noch leere lokale Felder zu übernehmen.

## Fachliche Zuordnung

- `Gruppe` entspricht `tblProtokollpunkt.strGruppe`.
- `Thema` entspricht `tblProtokollpunkt.strProtokollpunkt`.
- `Ort` ist ein lokaler Erfassungskontext. `tblProtokollpunkt` besitzt dafür kein eigenes Feld; eine spätere HappyHour-Zuordnung bleibt einem eigenen Schnittstellenentscheid vorbehalten.
- Das vollständige Transkript wird in ein noch leeres `tblProtokollpunkt.txtProtokollpunkt` übernommen.

## Akzeptanzkriterien

- Bildaufnahme und Diktat erscheinen oberhalb des kontrollierbaren Protokollpunktentwurfs.
- Die Auswertung liefert Transkript, Gruppe, Thema und Ort in einem typisierten Serververtrag.
- Nicht genannte oder nicht klar erkennbare Angaben bleiben leer.
- Bereits manuell gefüllte Felder werden nicht durch KI-Vorschläge überschrieben.
- Die erkannten Werte werden zusammen mit dem lokalen Protokollpunkt in IndexedDB gespeichert.
- Bild, Protokollpunktfelder und KI-Vorschläge werden nicht an HappyHour übertragen.
- Die Audioaufnahme bleibt bei einer fehlgeschlagenen Transkription oder Strukturierung lokal erhalten.

## Verknüpfungen

- [[D006 - Lokalen Protokollpunkt mit Bild erfassen]]
- [[E006 - Diktate mit strukturiertem KI-Vertrag auswerten]]
- [[T004 - Erkennungsfelder aus dem Diktat lokal übernehmen]]
- [[LD005 - Bild und Diktat vor dem strukturierten Entwurf erfassen]]
