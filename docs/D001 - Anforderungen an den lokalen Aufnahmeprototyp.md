---
typ: anforderung
id: D001
status: freigegeben
datum: 2026-11-09
---

# D001 – Anforderungen an den lokalen Aufnahmeprototyp

> Historischer Grundumfang. Die dauerhafte Nicht-Speicherung wurde für die nächste Ausbaustufe durch [[D005 - Anforderungen an die intern gespeicherte Einzelaufnahme]] und [[E002 - Aufnahmen offline sichern und später transkribieren]] abgelöst.

## Ziel

Der Benutzer kann im Browser eine Mikrofonaufnahme starten und stoppen. Nach dem Stoppen wird die abgeschlossene Aufnahme serverseitig in Text umgewandelt und der erkannte Text angezeigt.

## Anforderungen

- **A01:** Die Aufnahme beginnt nur nach einer bewussten Benutzerhandlung und Browserfreigabe des Mikrofons.
- **A02:** Während der Aufnahme sind Zustand und Dauer sichtbar.
- **A03:** Erst das Stoppen löst die Übertragung an den lokalen Server und anschliessend an den konfigurierten KI-Dienst aus.
- **A04:** Der API-Schlüssel bleibt ausschliesslich auf dem Server.
- **A05:** PlauderBox speichert Aufnahme und Transkript nicht dauerhaft.
- **A06:** Der erkannte Text wird verständlich dargestellt; Fehler enthalten keine Rohantworten oder Geheimnisse.
- **A07:** Der Prototyp lauscht ausschliesslich auf Loopback und akzeptiert maximal 20 MB Audio.
- **A08:** Die Oberfläche weist vor der Aufnahme auf die Übertragung an OpenAI hin.

## Nicht Bestandteil

- Projekt- oder Protokollauswahl,
- Fotos oder Dokumente,
- Textoptimierung oder fachliche Strukturierung,
- Speicherung und Verlauf,
- Benutzer- und Rechteverwaltung,
- HappyHour-Anbindung,
- Docker- oder Serverbereitstellung.

