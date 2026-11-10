---
typ: anforderung
id: D007
status: umgesetzt-testoffen
datum: 2026-11-10
---

# D007 – Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen

## Ziel

Bei einem neuen Protokollpunkt stehen Bild- und Spracherfassung vor den Detailfeldern. Nach der bewussten Auswertung versucht PlauderBox, `Gruppe`, `Thema`, `Inhalt` und einen allenfalls genannten `Rechtsverweis` aus dem Diktat zu erkennen und in noch leere lokale Felder zu übernehmen.

## Fachliche Zuordnung

- `Gruppe` entspricht `tblProtokollpunkt.strGruppe`.
- `Thema` entspricht `tblProtokollpunkt.strProtokollpunkt`.
- `Inhalt` entspricht `tblProtokollpunkt.txtProtokollpunkt`.
- `Rechtsverweis` entspricht `tblProtokollpunkt.strRechtsverweis` und bleibt leer, wenn keiner genannt wird.
- Ein separates Ortsfeld wird nicht geführt, weil `tblProtokollpunkt` kein solches Feld besitzt.

## Akzeptanzkriterien

- Bildaufnahme und Diktat erscheinen oberhalb des kontrollierbaren Protokollpunktentwurfs.
- Die Auswertung liefert Transkript, Gruppe, Thema, Inhalt und Rechtsverweis in einem typisierten Serververtrag.
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

## Korrektur

Die erste Fassung vom 10.11.2026 führte irrtümlich ein lokales Ortsfeld auf. Nach fachlicher Korrektur wird dieses Feld entfernt und auch aus bereits lokal gespeicherten Entwürfen bereinigt. Massgeblich ist das Sprechschema `Gruppe → Thema → Inhalt → allenfalls Rechtsverweis`.
