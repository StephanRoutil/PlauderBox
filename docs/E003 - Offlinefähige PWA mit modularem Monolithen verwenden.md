---
typ: entscheid
id: E003
status: entschieden
datum: 2026-11-09
---

# E003 – Offlinefähige PWA mit modularem Monolithen verwenden

## Ausgangslage

PlauderBox soll auf Mobilgeräten installierbar sein, Aufnahmen ohne Verbindung sicher vormerken und nach wiederhergestellter Verbindung serverseitig transkribieren. Zugleich soll die erste Umsetzung klein und betrieblich überschaubar bleiben. OpenAI, HappyHour und die lokale Persistenz im Browser benötigen klare Grenzen, rechtfertigen zu Beginn aber keine unabhängig betriebenen Microservices.

## Entscheid

PlauderBox wird als offlinefähige Progressive Web App mit einem modularen Monolithen als Serveranwendung aufgebaut.

### Mobiler Client

- installierbare PWA im Browser,
- App-Hülle und benötigte statische Ressourcen über Service Worker offline verfügbar,
- dauerhafte lokale Warteschlange für noch nicht übertragene Erfassungen,
- lokale Speicherung von Metadaten und Binärdaten hinter einem eigenen Speichervertrag,
- automatische Synchronisierung bei erkannter Verbindung und beim erneuten Öffnen,
- sichtbarer Zustand und manuelle Wiederholung als Rückfallweg.

### Server

- ASP.NET Core 10,
- ein gemeinsam bereitgestellter modularer Monolith,
- keine eigene serverseitige Datenbank oder dauerhafte Dateiablage; Begehungsdaten werden lokal im Browser gespeichert und kontrolliert an HappyHour übergeben,
- Hintergrundverarbeitung zunächst innerhalb derselben Anwendung,
- Betrieb als eigener Docker-Container auf `olymp01` hinter Caddy.

### Dreischichten-Modell

Die nachfolgende Aufteilung wurde durch [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]] konkretisiert und ersetzt die frühere fünfteilige Projektskizze dieses Entscheids.

```text
PlauderBox.UI               Vue-/TypeScript-PWA, ASP.NET-Core-Host und HTTP-Endpunkte
PlauderBox.Logik            Fachregeln, Anwendungsabläufe und providerfreie Verträge
PlauderBox.Datenmanagement  OpenAI und HappyHour
```

Die Logik referenziert weder UI noch Datenmanagement. Das Datenmanagement implementiert Verträge der Logik. Die UI nutzt die Logik und bindet konkrete Datenmanagement-Implementierungen ausschliesslich im Composition Root ein. Die drei Projekte werden getrennt kompiliert, aber als eine Anwendung und ein Deployment betrieben. Automatisierte Prüfungen liegen ausserhalb der drei Anwendungsschichten.

## Begründung

- Eine PWA ermöglicht Installation und Offlinebetrieb ohne sofortige native iOS- und Android-Apps.
- Der modulare Monolith hält Betrieb, Deployment und Fehlersuche einfach.
- Klare Codegrenzen verhindern eine unkontrollierte Kopplung an OpenAI oder HappyHour.
- Das aus den InHouseServer-Projekten bewährte Dreischichten-Modell bleibt für Entwicklung und Review unmittelbar erkennbar.
- Spätere Auslagerungen bleiben möglich, wenn Last, Verfügbarkeit oder unabhängige Releasezyklen sie tatsächlich erfordern.

## Verworfene beziehungsweise zurückgestellte Varianten

### Microservices ab der ersten Version

Zurückgestellt, weil mehrere Deployments, Netzwerkschnittstellen und Betriebswege keinen belegten Nutzen für den ersten Umfang bringen.

### Vollständig native mobile Anwendung

Zurückgestellt. Sie wird erst neu bewertet, wenn Browsergrenzen bei Hintergrundsynchronisierung, lokalem Speicher, Kamera oder Mikrofon auf den realen Zielgeräten nachgewiesen sind.

### Sprache-zu-Text direkt auf dem Mobilgerät

Nicht Bestandteil der ersten Architektur. Gemäss [[E002 - Aufnahmen offline sichern und später transkribieren]] erfolgt die Transkription nach wiederhergestellter Verbindung serverseitig.

## OFFEN

- konkrete Vue-Ordnerstruktur und PWA-Buildkonfiguration innerhalb von `PlauderBox.UI` gemäss [[E004 - Vue und TypeScript für die mobile Oberfläche verwenden]],
- konkrete Implementierung des lokalen Speichervertrags mit IndexedDB und/oder Origin Private File System,
- Authentifizierung und QR-Freigabe,
- eine eigene serverseitige Persistenz als mögliche spätere Erweiterung, falls ein belegter fachlicher Bedarf entsteht,
- genaue Modulverträge zu OpenAI und HappyHour,
- mobile Abnahme auf iOS und Android.

## Verknüpfungen

- [[E005 - PlauderBox in Datenmanagement Logik und UI gliedern]]

