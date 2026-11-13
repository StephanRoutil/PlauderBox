---
typ: entscheid
id: E015
status: entschieden
datum: 2026-11-13
---

# E015 – Ablaufdatum des KI-Schlüssels überwachen

## Ausgangslage

Ein abgelaufener OpenAI-Schlüssel würde ohne eigene Überwachung erst bei einer Auswertung durch eine technische Providerfehlermeldung auffallen. Der serverseitige Schlüssel besitzt deshalb zusätzlich ein fachlich gepflegtes Ablaufdatum.

## Entscheid

Die geschützte JSON-Schlüsseldatei führt neben `OpenAI` das Feld `GueltigBis` im Format `JJJJ-MM-TT`. PlauderBox warnt ab 30 Tagen vor diesem Datum sichtbar in der App. Nach dem Ablauf sperrt der Server weitere KI-Auswertungen mit einer verständlichen deutschen Meldung.

Die Warnfrist ist als benannte Option `KiSchluesselWarnungTage` mit dem Standardwert `30` konfigurierbar. Das Ablaufdatum ist einschliesslich des angegebenen Tages gültig. Die bestehende allgemeine Statusroute liefert weiterhin ausschliesslich `kiBereit`; der eng begrenzte Vertrag `/api/v1/ki-schluesselstatus` liefert nur Bereitschaft, Ablaufstatus, Ablaufdatum und Meldung. Schlüsselwert, Modell, Dateiname und interner Pfad werden nie übertragen.

Eine Transkription prüft weiterhin zuerst die HappyHour-Rundgangsfreigabe. Erst danach wird der KI-Schlüsselstatus geprüft, jedoch noch vor dem Lesen des Audio-Bodys und vor einem OpenAI-Aufruf.

## Version

Die sichtbare Vorwarnung ist eine freigegebene Funktionserweiterung und wird als Version `1.1.0` geführt.

## Nachweis

- `src/PlauderBoxOptionen.cs`
- `src/Sicherheit/KiSchluesselGueltigkeit.cs`
- `src/Endpunkte/TranskriptionsEndpunkte.cs`
- `src/PlauderBox.UI.Client/src/services/kiSchluesselStatus.ts`
- `src/PlauderBox.UI.Client/src/components/KiSchluesselHinweis.vue`
- `tests/PlauderBox.Integrationstests/ServergrenzeTests.cs`
- `tests/PlauderBox.Vertragstests/Program.cs`
- [[D011 - Mobile Begehung vollständig lokal durchführen]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
- [[T007 - Vollständigen mobilen Begehungsablauf prüfen]]
