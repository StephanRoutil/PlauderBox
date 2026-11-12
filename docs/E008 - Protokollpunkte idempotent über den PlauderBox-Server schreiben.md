---
typ: entscheid
id: E008
status: beschlossen
datum: 2026-11-11
---

# E008 – Protokollpunkte idempotent über den PlauderBox-Server schreiben

## Entscheid

- Der Browser spricht ausschliesslich einen gleichursprünglichen PlauderBox-Endpunkt an. Der PlauderBox-Server kapselt den HappyHour-Vertrag im Datenmanagement.
- Die Logik definiert providerunabhängige Übergabeanforderungen und -ergebnisse. Vue koordiniert Darstellung und Benutzeraktion.
- Der beim QR-Scan erhaltene opake Token wird zusammen mit der lokalen Begehung im internen IndexedDB-Speicher gehalten und nie protokolliert.
- Der Server prüft Anzahl, GUID, Pflichtfelder, Längen und doppelte Identitäten, bevor er Einträge einzeln an HappyHour übergibt.
- `Wer` gehört als `intProjektAnsprechpartnerFKID` zur engen Feld-Allowlist. PlauderBox normalisiert die ID gegen den aktuellen Verteiler: gültigen Kandidaten behalten, sonst genau einen eindeutig markierten Protokollschreiber verwenden, sonst `null`. Die Regel wird zentral in der Client-Logik auf vorbereitete Punkte, neue Einträge, alte Begehungen, Wiederanlauf und Legacy-Import angewendet.
- HappyHour bestätigt jeden Punkt einzeln. Ein Teilfehler löscht oder markiert lokal nichts als abgeschlossen; der gesamte Versuch darf mit denselben GUIDs wiederholt werden.
- Erst eine vollständige Bestätigung markiert die Begehung lokal als `an_happyhour_uebertragen`.
- Bilder bleiben lokal. Automatischer Abschluss und Versand bleiben ausgeschlossen.

## Begründung

Die Trennung hält HappyHour-Adresse und Providerdetails aus dem Browser heraus, folgt dem Dreischichtenmodell und erlaubt sichere Wiederholung bei mobilen Verbindungsabbrüchen. Die fachliche Idempotenz liegt beim System, das die Protokollpunkte besitzt.

## Folgen

- Die lokale Begehung erhält Freigabetoken, Protokollpunktart, normalisierte Zuständigkeit `Wer` und einen expliziten Übergabestatus.
- Alte lokale Begehungen ohne schreibfähigen Token oder Punktart können nicht stillschweigend übertragen werden; sie bleiben lokal kontrollierbar.
- Die Bildübergabe benötigt einen eigenen Vertrag und Entscheid.

## Verknüpfungen

- [[D012 - Kontrollierte Protokollpunkte an HappyHour übergeben]]
- [[D002 - Coding Guidelines für PlauderBox]]
- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]
