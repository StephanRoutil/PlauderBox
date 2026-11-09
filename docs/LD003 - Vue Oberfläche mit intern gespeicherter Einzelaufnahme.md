---
typ: loesungsdokumentation
id: LD003
status: testbereit-delphi01
datum: 2026-11-09
---

# LD003 – Vue-Oberfläche mit intern gespeicherter Einzelaufnahme

## Gültiger Stand

Die PlauderBox-Oberfläche ist auf Vue und TypeScript umgestellt. Nach dem Stoppen wird genau eine Aufnahme als Blob in IndexedDB gespeichert und als `Noch nicht übertragen` angezeigt. Die Übertragung erfolgt bewusst über eine Schaltfläche. Nur nach erfolgreicher Transkriptionsantwort löscht PlauderBox den lokalen Datensatz.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| Vue-Komponente und Aufnahmeablauf | `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Interner Speichervertrag | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts` | umgesetzt |
| Isolierte Speichertests | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.test.ts` | 3 Tests bestanden |
| Vue-/TypeScript-Build | `src/PlauderBox.UI.Client/` | Typecheck und Produktionsbuild bestanden |
| Statische Produktionsausgabe | `src/wwwroot/` | durch Vite erzeugt |
| Containerbuild | `Dockerfile` | Frontend- und .NET-Build getrennt reproduzierbar vorbereitet |
| Gesamtprüfung | `tests/Pruefe-Prototyp.ps1` | erweitert und lokal bestanden |

Branch: `main`, Commit `1bf2532`. Das daraus auf Delphi01 gebaute Image `plauderbox:delphi01-test-20261109` besitzt die Image-ID `sha256:97e13910249b…`. Vue-Einstieg, Frontend-Asset, KI-Status und fehlerfreier Containerstart sind geprüft. Der manuelle mobile Speicherablauf bleibt gemäss T002 offen.

## Grenzen

- IndexedDB ist durch Same-Origin und Browser-Sandbox app-eigen; es ist keine verschlüsselte Fachablage.
- Die Anwendung fordert bestmögliche persistente Browser-Speicherung an, eine endgültige Garantie hängt vom Zielbrowser und Gerätespeicher ab.
- Die App-Hülle ist noch nicht offline ladbar. Eine bereits geöffnete Seite kann aufnehmen und speichern; ein vollständiger Neustart ohne Netz ist erst eine spätere Ausbaustufe.
- Es wird absichtlich nur eine ausstehende Aufnahme unterstützt.

## Verknüpfungen

- [[D005 - Anforderungen an die intern gespeicherte Einzelaufnahme]]
- [[T002 - Einzelne Aufnahme intern speichern und nach Bestätigung löschen]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
