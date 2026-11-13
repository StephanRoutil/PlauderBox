---
typ: entscheid
id: E014
status: entschieden
datum: 2026-11-13
---

# E014 – PlauderBox Version 1.0 festlegen

## Entscheid

Der nach S15 und S32 auf `main` vorliegende Quellstand wird als **PlauderBox 1.0.0** festgelegt.

Die Versionsnummer wird zentral für die .NET-Projekte in `Directory.Build.props` und für den Vue-Client in `src/PlauderBox.UI.Client/package.json` geführt. Der bestätigte Git-Stand erhält das annotierte Tag `v1.0.0`.

## Bereinigung

- Regenerierbare lokale Build-, Visual-Studio-, Playwright- und Test-Temporärdateien gehören nicht zum Release.
- Das lokale Docker-Imagearchiv vom 12.11.2026 wird entfernt.
- Auf Delphi01 bleibt ausschliesslich das vom laufenden Container verwendete PlauderBox-Testimage erhalten; historische und als `before-*` bezeichnete Image-Tags werden entfernt.
- Automatisierte Tests, Browser-Rückfallwege und die versionierte Delphi01-Testkonfiguration bleiben erhalten. Sie sind Qualitäts- beziehungsweise Betriebsbestandteile und keine Release-Backups.
- Backups oder Images auf Olymp01 werden nur nach einer vollständigen Inventur mit den nötigen Serverrechten bereinigt.

## Abgrenzung

Version 1.0.0 bezeichnet den Quellstand. Die Bereitstellung dieses Stands auf Delphi01 und Olymp01 bleibt der eigene Betriebsauftrag S45 aus [[D014 - Befunde aus dem Code-Review beheben]].

Der Bereitstellungsversuch auf Olymp01 wurde am 13.11.2026 nach einer fehlgeschlagenen internen Statusprüfung automatisch zurückgerollt. Vor einem erneuten Rollout wurden in der Mobilgeräteprüfung zusätzliche Usabilitymängel festgestellt. Das veröffentlichte Tag `v1.0.0` bleibt als unveränderlicher Quellstand erhalten; eine korrigierte Folgeversion wird erst nach erfolgreicher Geräteabnahme festgelegt und bereitgestellt.

Der teilweise offene Schutzpfad S34 sowie die offenen Reviewpunkte S40 bis S44 und S46 bleiben transparent dokumentiert. Sie verhindern gemäss diesem Versionsentscheid die Festlegung der Version nicht, werden aber nicht fälschlich als erledigt bezeichnet. S07 ist wegen `varchar(MAX)` fachlich nicht anwendbar. Die reale Geräteabnahme und der persistente Duplikatschutz bleiben ebenfalls offen.

## Nachweis

- `Directory.Build.props`
- `src/PlauderBox.UI.Client/package.json`
- Git-Tag `v1.0.0`
- [[LD012 - Strukturelles Redesign der PlauderBox]]
- [[D014 - Befunde aus dem Code-Review beheben]]
