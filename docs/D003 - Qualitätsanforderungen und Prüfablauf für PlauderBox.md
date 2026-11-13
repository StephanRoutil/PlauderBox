---
typ: qualitaetsanforderungen
id: D003
status: freigegeben
datum: 2026-11-09
herkunft: FileBox D018
---

# D003 – Qualitätsanforderungen und Prüfablauf für PlauderBox

## Massstab

Anforderungen und Entscheide beschreiben den erwarteten Stand. [[D002 - Coding Guidelines für PlauderBox]] definiert die technischen Regeln. Die Qualitätsprüfung untersucht nur den ausdrücklich beauftragten Stand und ändert keinen Anwendungscode.

## Verbindliche Qualitätsziele

- reproduzierbarer Build von UI, Logik und Datenmanagement,
- automatisierte Prüfung der Schichtenabhängigkeiten,
- TypeScript-Typecheck und Frontend-Tests für produktiven Vue-Code,
- Fachtests mit synthetischen Daten,
- Integrationstests gegen die tatsächlich verwendeten Providergrenzen,
- Browser- und reale Mobilgeräteprüfungen für Mikrofon, Offlinebetrieb und Wiederanlauf,
- keine Geheimnisse oder vertraulichen Rohdaten in Repository, Build-Artefakten und Logs,
- getrennte Linux-/Docker- und Wiederherstellungsnachweise vor einer Produktivfreigabe,
- eine nach Abschluss der Prüfungen bereinigte lokale Arbeitsablage ohne nicht mehr benötigte reproduzierbare Artefakte gemäss `PB-DEV-001`.

## Prüfablauf

1. Dateistand, Prüfbereich und Ausschlüsse festhalten.
2. Anwendbare Anforderungen, Entscheide und `PB-`-Regeln zuordnen.
3. Eigene Build-, Test- und Reviewprüfungen ausführen; übernommene Nachweise separat nennen.
4. Befunde nur mit konkreter Fundstelle und belegter Auswirkung melden.
5. Priorisierte Aufgabenliste mit erwartetem Erledigungsnachweis erstellen.
6. Korrektur und unabhängige Nachprüfung trennen.
7. Nach gesichertem Prüfnachweis lokale Build-, Test-, Cache-, Publish- und Backup-Artefakte bereinigen und den bereinigten Zustand kontrollieren.

## Ergebnisstatus und Priorität

- **Geprüft ohne Befund:** nur im benannten Umfang.
- **Belegter Verstoss:** konkrete Abweichung von anwendbarer verbindlicher Regel.
- **Prüfung erforderlich / nicht geprüft:** kein bestandener Nachweis.
- **Nicht anwendbar:** fachlich begründet.

`P1` bezeichnet eine erhebliche Verletzung einer Muss-Anforderung oder Sicherheitsgrenze, `P2` einen relevanten Qualitätsmangel und `P3` eine begrenzte Pflege- oder Verständlichkeitsabweichung.

## Gates

- **Q1 Architektur und Build:** Dreischichten-Abhängigkeiten und reproduzierbarer Gesamtbuild.
- **Q2 Offline und Datenintegrität:** dauerhafte lokale Ablage, Idempotenz, Wiederanlauf und bestätigtes Löschen.
- **Q3 Schutz und Schnittstellen:** Authentisierung, QR-Freigabe, Geheimnisschutz sowie OpenAI-/HappyHour-Verträge.
- **Q4 Bedienbarkeit:** Browser, Touch, Tastatur, schmale Ansicht und repräsentative Mobilgeräte.
- **Q5 Betrieb:** Docker auf Linux, Persistenz, Backup, Wiederherstellung, Health und TLS.
- **Q6 Arbeitsablage:** Erforderliche Nachweise sind gesichert; nicht mehr benötigte reproduzierbare Artefakte wurden entfernt, die Löschziele lagen nachweislich nur in der lokalen Entwicklungsablage und versionierte Dateien blieben unverändert.

Ein Build, HTTP 200 oder eine hohe Anzahl Tests ersetzt keines dieser Gates.
