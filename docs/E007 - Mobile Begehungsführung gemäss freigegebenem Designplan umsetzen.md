---
typ: entscheid
id: E007
status: beschlossen
datum: 2026-11-10
---

# E007 – Mobile Begehungsführung gemäss freigegebenem Designplan umsetzen

## Ausgangslage

Für PlauderBox wurde die mobile Benutzerführung einer Begehung schrittweise als visueller Entwurf erarbeitet. Der Ablauf muss online und offline verständlich bleiben, mehrere Einträge ermöglichen und ohne Sackgassen bis zur bewussten Übergabe an HappyHour führen.

## Entscheid

Die in [[D009 - Designentwurf für die mobile Begehungsführung]] festgehaltene Version 5 des 2 × 4-Mockups wird als Plan für die schrittweise Umsetzung freigegeben.

Der Ablauf umfasst verbindlich diese acht Ansichten:

1. Code scannen
2. Start
3. Aktive Begehung
4. Neuer Eintrag
5. Offline
6. Auswertung
7. Kontrolle
8. Abschluss

## Verbindliche Leitplanken

- Die Begehung wird über den Code einer in HappyHour vorbereiteten Begehung geöffnet.
- Ein neuer Eintrag beginnt mit mehreren Bildern und dem Diktat.
- Die Bilderfassung trennt Kamera und Galerie. Die zusätzliche externe Sicherung aller Einzelbilder am Abschluss richtet sich nach [[E009 - Begehungsbilder einzeln mit einer Aktion extern sichern]].
- Der Sprechleitfaden nennt `Gruppe`, `Thema`, `Inhalt (Um was geht es?)` und `Rechtsverweis`; ein Feld `Ort` wird nicht eingeführt.
- Ohne Verbindung bleiben Aufnahme und Bilder lokal gespeichert. Der Mitarbeiter kann einen weiteren Eintrag beginnen oder zur Kontrolle wechseln.
- Nach der Auswertung bestehen immer die Wege `Neuer Eintrag` und `Zur Kontrolle`.
- Die Kontrolle muss vor dem Abschluss vollständige und offene Einträge sichtbar machen.
- PlauderBox beendet die Begehung erst durch die bewusste Übergabe an HappyHour.
- In HappyHour wird das Protokoll Korrektur gelesen und anschliessend bewusst durch einen Mitarbeiter versendet. Ein automatischer Versand ist ausgeschlossen.

## Umsetzung

Die Umsetzung erfolgt in kleinen, einzeln prüfbaren Ausbaustufen entlang der acht Ansichten. Eine Ausbaustufe gilt erst nach Prüfung ihrer Navigation, lokalen Speicherung und Fehlerwege als abgeschlossen. Lösungsdokumentationen werden erst nach der tatsächlichen Umsetzung auf den gültigen Stand gebracht.

## Folgen

- D009 ist nicht mehr nur Diskussionsgrundlage, sondern der freigegebene Designplan.
- Noch offene technische Einzelheiten, insbesondere der Übergabevertrag zu HappyHour und die Nachbearbeitung offline gespeicherter Aufnahmen, bleiben ausdrücklich offen.
- Dieser Entscheid allein löst keine Code-, Datenbank- oder Serveränderung aus.

## Verknüpfungen

- [[D007 - Neuen Protokollpunkt zuerst mit Bild und Sprache erfassen]]
- [[D008 - Aufnahme verwerfen und mehrere Bilder lokal erfassen]]
- [[D009 - Designentwurf für die mobile Begehungsführung]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[E006 - Diktate mit strukturiertem KI-Vertrag auswerten]]
