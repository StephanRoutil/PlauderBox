# PlauderBox – Projektanweisungen

## Zweck

PlauderBox ist ein eigenständiges Werkzeug für sprachgestützte Projektdokumentation. Die Anwendung wird als Teilprojekt des InHouseServer geführt; fachliche HappyHour-Anforderungen und HappyHour-seitige Schnittstellen bleiben im HappyHour-Repository.

## Aktueller Auftrag

PlauderBox setzt den in D009 und E007 freigegebenen mobilen Begehungsablauf um. Er umfasst QR-Freigabe, Start, aktive Begehung, mehrere lokal gespeicherte Bild-/Audioeinträge, Offline-Warteschlange, strukturierte Auswertung, Mutation, gruppierte Kontrolle und lokalen Abschluss.

Der HappyHour-Vertrag darf gemäss D012, D013, E008 und E010 kontrollierte Protokollpunkte und die ihnen zugeordneten Bilder idempotent in den freigegebenen Entwurf schreiben. Gemäss E009 dürfen alle internen Bildkopien am Abschluss mit einer bewussten Aktion als einzelne Dateien zusätzlich extern gesichert werden; Abschluss und Versand in HappyHour werden nicht durch PlauderBox ausgeführt.

## Regeln

- Keine API-Schlüssel im Browser, Quellcode, Repository, Log oder in Fehlermeldungen ausgeben.
- Audio nicht dauerhaft speichern.
- Externe Übertragung im Browser verständlich anzeigen.
- Der lokale Prototyp darf nur auf Loopback lauschen.
- Produktive Bereitstellung, Caddy-, DNS-, Firewall- und Containeränderungen benötigen einen eigenen Auftrag.
- Deutsche Domänenbegriffe verwenden; technische Standardbegriffe dürfen englisch bleiben.
- Entscheidungen, Anforderungen, Prüfungen und Lösungsdokumentation folgen den Regeln des übergeordneten InHouseServer-Projekts.

## Architektur

PlauderBox verwendet drei getrennte Schichten:

- `PlauderBox.UI`: Vue-/TypeScript-PWA, ASP.NET-Core-Host, HTTP-Endpunkte und Composition Root.
- `PlauderBox.Logik`: Fachregeln, Anwendungsabläufe und providerunabhängige Verträge.
- `PlauderBox.Datenmanagement`: Implementierungen der OpenAI- und HappyHour-Schnittstellen. PlauderBox besitzt derzeit keine eigene serverseitige Datenbank oder dauerhafte Dateiablage; lokale Begehungsdaten werden im Browser gespeichert.

Die Logik kennt weder UI noch Datenmanagement. Das Datenmanagement implementiert Verträge der Logik. Die UI darf beide Projekte ausschliesslich zur Nutzung und Verdrahtung referenzieren. Die Solution `src/PlauderBox.sln` und das Hauptprojekt `src/PlauderBox.UI.csproj` liegen in derselben Ablage.

## Qualitätsrolle

Der projektbezogene Qualitätsagent liegt unter `.codex/agents/quality.toml`. Er prüft unabhängig gegen Anforderungen, Entscheide und Coding Guidelines, erstellt eine priorisierte Befundliste und ändert keinen Anwendungscode ohne ausdrückliche Freigabe.
