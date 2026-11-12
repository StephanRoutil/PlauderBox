---
typ: anforderung
id: D010
status: abgeloest-durch-D011
datum: 2026-11-10
---

# D010 – QR-Code scannen und vorbereitete Begehung anzeigen

## Ziel

Als Mitarbeiter möchte ich den QR-Code eines in HappyHour vorbereiteten Protokolls mit PlauderBox scannen und den angekommenen Protokollkontext sehen, damit ich vor dem späteren Start der Begehung die richtige Grundlage kontrollieren kann.

## Akzeptanzkriterien

- **AK01:** Die Startansicht öffnet die Gerätekamera erst nach einer bewussten Aktion und zeigt Kamera-, Berechtigungs- und Fehlerzustände verständlich an.
- **AK02:** PlauderBox akzeptiert ausschliesslich `plauderbox://begehung?freigabe={Token}`. Der Token darf nur URL-sichere ASCII-Zeichen aus Buchstaben, Ziffern, Bindestrich und Unterstrich enthalten und muss zwischen 32 und 128 Zeichen lang sein. Zusätzliche Parameter, Benutzerinformationen, Pfad oder Fragment werden abgewiesen.
- **AK03:** Der QR-Code enthält weder Serveradresse noch Protokoll-ID. Der Browser übergibt nur den geprüften opaken Token an die eigene PlauderBox-Servergrenze.
- **AK04:** Die serverseitige HappyHour-Basisadresse ist umgebungskonfigurierbar und wird nicht aus dem QR-Code übernommen.
- **AK05:** Ansicht 2 zeigt mindestens Protokoll, Projekt, Datum, Ort, Status, verantwortlichen Mitarbeiter, Verteiler sowie die Anzahl Gruppen und Protokollpunkte.
- **AK06:** Ungültige, abgelaufene oder widerrufene Freigaben, ungültige Antworten und Verbindungsfehler werden ohne technische Interna angezeigt; ein erneuter Scan bleibt möglich.
- **AK07 (historischer Ausbauschritt):** `Begehung starten` war in dieser Ausbaustufe sichtbar, aber deaktiviert. Diese Begrenzung wurde durch [[D011 - Mobile Begehung vollständig lokal durchführen]] abgelöst.

## Abgrenzung

Die konkrete HappyHour-Basisadresse wird ausschliesslich in der PlauderBox-Serverumgebung konfiguriert. Die Freigabe selbst ist die begrenzte Berechtigung; eine HappyHour-Benutzersitzung wird nicht übernommen. Der echte Datenabruf aus der Testumgebung ist noch nicht nachgewiesen.

Nicht enthalten sind Deployment, Docker-/Caddy-Änderungen, Begehungsstart, Offlineübernahme des Kontexts, Rückschreibung und Versand.

## Verknüpfungen

- [[D009 - Designentwurf für die mobile Begehungsführung]]
- [[E007 - Mobile Begehungsführung gemäss freigegebenem Designplan umsetzen]]
- [[LD007 - QR-Einstieg und HappyHour-Protokollkontext]]
- [[T006 - QR-Einstieg und Protokollkontext prüfen]]
