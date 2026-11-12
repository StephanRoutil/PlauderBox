---
typ: anforderung
id: D012
status: intern-bereitgestellt-e2e-hauptfall-offen
datum: 2026-11-11
---

# D012 – Kontrollierte Protokollpunkte an HappyHour übergeben

## Ziel

Als Mitarbeiter möchte ich die vollständig kontrollierten PlauderBox-Einträge bewusst an das per QR-Code freigegebene HappyHour-Protokoll übergeben, damit Wer, Gruppe, Thema, Inhalt und allenfalls Rechtsverweis dort ohne erneutes Abtippen zur abschliessenden HappyHour-Kontrolle bereitstehen.

## Akzeptanzkriterien

- **AK01:** Die Übergabe ist nur nach lokaler Kontrolle, bei bestehender Verbindung und durch eine bewusste Aktion möglich.
- **AK02:** Neue Punkte besitzen eine bewusst gewählte, von HappyHour gelieferte Protokollpunktart; vorbereitete Punkte behalten ihre Art und Identität.
- **AK03:** Pro Eintrag werden ausschliesslich stabile Erfassungs-ID, vorbereitete Punkt-ID, Protokollpunktart, Zuständigkeit `Wer` als `intProjektAnsprechpartnerFKID`, Gruppe, Thema, Inhalt und Rechtsverweis über den PlauderBox-Server übertragen.
- **AK04:** Eine Wiederholung mit derselben Erfassungs-ID erzeugt keinen zweiten HappyHour-Protokollpunkt.
- **AK05:** Abgelaufene Freigabe, Konflikt, ungültiger Eintrag, Verbindungsfehler und uneindeutige Antwort bleiben sichtbar; alle lokalen Daten bleiben erhalten und der Versuch kann sicher wiederholt werden.
- **AK06:** Erst nach Bestätigung aller Einträge wird die lokale Begehung als an HappyHour übertragen markiert.
- **AK07:** Der JSON-Vertrag dieses Dokuments enthält weiterhin keine Bilder. Die nachgelagerte Bildübergabe wird ausschliesslich durch D013 geregelt und erst nach bestätigter Punkt-ID ausgeführt.
- **AK08:** HappyHour-Protokollstatus, Korrekturlesen und Versand werden nicht durch PlauderBox verändert oder ausgelöst.
- **AK09:** Die Zuständigkeits-ID wird immer gegen den aktuellen Verteiler normalisiert: Ein gültiger Kandidat bleibt erhalten; andernfalls wird genau ein eindeutig markierter Protokollschreiber verwendet, sonst bleibt `Wer` leer. Dies gilt auch für vorbereitete Punkte, alte lokale Begehungen, Wiederanlauf und Legacy-Import. Verteileroptionen mit derselben Projektansprechpartner-ID erscheinen nur einmal.

## Abgrenzung

- Die Übertragung nach `tblDokument` ist kein Bestandteil des Punkt-JSON-Vertrags; sie folgt als eigener Vertrag gemäss D013/E010.
- Keine automatische Zusammenführung mehrerer lokaler Einträge auf denselben vorbereiteten Punkt; widersprüchliche Zuordnungen werden abgewiesen.
- Kein produktiver externer Betrieb der cachebasierten Freigabe.

## Verknüpfungen

- [[E008 - Protokollpunkte idempotent über den PlauderBox-Server schreiben]]
- [[D011 - Mobile Begehung vollständig lokal durchführen]]
- [[LD009 - Kontrollierte Protokollpunkte an HappyHour übergeben]]
- [[T008 - Idempotente HappyHour-Protokollpunktübergabe prüfen]]
- [HappyHour E031 – Kontrollierte Protokollpunkte idempotent über die Rundgangsfreigabe schreiben](../../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgest%C3%BCtzte%20Protokollerfassung/03_Entscheide/E031%20%E2%80%93%20Kontrollierte%20Protokollpunkte%20idempotent%20%C3%BCber%20die%20Rundgangsfreigabe%20schreiben.md)
