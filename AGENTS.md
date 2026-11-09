# PlauderBox – Projektanweisungen

## Zweck

PlauderBox ist ein eigenständiges Werkzeug für sprachgestützte Projektdokumentation. Die Anwendung wird als Teilprojekt des InHouseServer geführt; fachliche HappyHour-Anforderungen und HappyHour-seitige Schnittstellen bleiben im HappyHour-Repository.

## Aktueller Auftrag

Ein lokaler Diskussionsprototyp mit genau einem Ablauf:

1. Mikrofonaufnahme im Browser starten und stoppen.
2. Die abgeschlossene Aufnahme serverseitig an den konfigurierten Sprache-zu-Text-Dienst übertragen.
3. Den erkannten Text im Browser anzeigen.

Nicht enthalten sind Projekte, Rundgänge, Fotos, Protokollstrukturierung, Speicherung, Benutzerverwaltung und HappyHour-Anbindung.

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
- `PlauderBox.Datenmanagement`: PostgreSQL, Dateispeicher sowie Implementierungen der OpenAI- und HappyHour-Schnittstellen.

Die Logik kennt weder UI noch Datenmanagement. Das Datenmanagement implementiert Verträge der Logik. Die UI darf beide Projekte ausschliesslich zur Nutzung und Verdrahtung referenzieren. Die Solution `src/PlauderBox.sln` und das Hauptprojekt `src/PlauderBox.UI.csproj` liegen in derselben Ablage.

## Qualitätsrolle

Der projektbezogene Qualitätsagent liegt unter `.codex/agents/quality.toml`. Er prüft unabhängig gegen Anforderungen, Entscheide und Coding Guidelines, erstellt eine priorisierte Befundliste und ändert keinen Anwendungscode ohne ausdrückliche Freigabe.
