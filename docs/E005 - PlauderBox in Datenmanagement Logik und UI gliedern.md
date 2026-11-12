---
typ: entscheid
id: E005
status: entschieden
datum: 2026-11-09
---

# E005 – PlauderBox in Datenmanagement, Logik und UI gliedern

## Ausgangslage

E003 legte eine offlinefähige PWA und einen modularen Monolithen fest. Die zunächst skizzierte Aufteilung in Web, Anwendung, Fachlogik und Infrastruktur war noch nicht mit dem in den InHouseServer-Projekten bewährten Dreischichten-Modell abgestimmt.

## Entscheid

PlauderBox verwendet verbindlich drei Anwendungsschichten:

1. `PlauderBox.UI` für Vue-/TypeScript-PWA, ASP.NET-Core-Host und HTTP-Endpunkte,
2. `PlauderBox.Logik` für Fachregeln, Anwendungsabläufe und providerunabhängige Verträge,
3. `PlauderBox.Datenmanagement` für OpenAI- und HappyHour-Implementierungen.

Die Logik referenziert keine andere PlauderBox-Schicht. Das Datenmanagement referenziert die Logik und implementiert deren Verträge. Die UI darf beide Schichten nutzen; konkrete Implementierungen werden nur im Composition Root verdrahtet. Prüfprojekte liegen ausserhalb der drei Anwendungsschichten.

Die Visual-Studio-Solution `src/PlauderBox.sln` und das Hauptprojekt `src/PlauderBox.UI.csproj` liegen direkt nebeneinander. Die beiden weiteren Projekte liegen in Unterordnern derselben Quellablage.

PlauderBox besitzt im umgesetzten und derzeit entschiedenen Umfang keine eigene serverseitige Datenbank oder dauerhafte Dateiablage. Eine solche Persistenz wäre eine spätere Erweiterung und benötigt vor ihrer Einführung einen eigenen fachlichen und technischen Entscheid.

## Ablösung

Dieser Entscheid ersetzt ausschliesslich die frühere fünfteilige Projektskizze in E003. Der dort entschiedene modulare Monolith, PWA-Ansatz und gemeinsame Betrieb bleiben gültig.

## Umsetzungstand

Die Solution und die drei kompilierbaren Projekte sind angelegt. Der bestehende Aufnahmeprototyp bleibt vorerst im UI-Projekt; seine fachliche Zerlegung in Logik und Datenmanagement erfolgt mit einem eigenen Umsetzungsauftrag.

## Verknüpfungen

- [[E003 - Offlinefähige PWA mit modularem Monolithen verwenden]]
- [[E004 - Vue und TypeScript für die mobile Oberfläche verwenden]]
- [[D002 - Coding Guidelines für PlauderBox]]
- [[D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox]]
