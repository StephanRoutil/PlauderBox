---
typ: loesungsdokumentation
id: LD006
status: testbereit-delphi01
datum: 2026-11-10
---

# LD006 – Mehrere lokale Bilder und verwerfbare Aufnahme

## Gültiger Stand

Der Bildspeicher verwendet weiterhin den bestehenden IndexedDB-Objektspeicher, legt neue Bilder jedoch unter ihrer jeweiligen UUID ab. Beim Laden werden Datensatz und IndexedDB-Schlüssel gemeinsam gelesen, sodass auch das ältere Einzelbild ohne eigene `id` weiterverwendet werden kann. Die Oberfläche zeigt alle Bilder und löscht sie einzeln nach Bestätigung.

Die ausstehende Audioaufnahme bleibt ein separater Datensatz. `Aufnahme löschen` entfernt ausschliesslich diesen Datensatz nach Bestätigung.

## Umsetzung

| Bestandteil | Originalpfad | Stand |
|---|---|---|
| Mehrfachauswahl, Vorschauen und einzelnes Löschen | `src/PlauderBox.UI.Client/src/App.vue` | umgesetzt |
| Mehrbilddarstellung | `src/PlauderBox.UI.Client/src/styles.css` | umgesetzt |
| Mehrere Bilddatensätze und Rückwärtskompatibilität | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.ts` | umgesetzt |
| Getrennte Speicherprüfung | `src/PlauderBox.UI.Client/src/services/internerAufnahmespeicher.test.ts` | automatisiert bestanden |

Branch: `main`, Commit `1cf6d05`. Das auf Delphi01 laufende Image besitzt die Image-ID `sha256:d31e44fa62c5…`. HTTPS-Einstieg, neues Mehrbild-Frontend, KI-Status und Containerstart sind geprüft. Der mobile Mehrbild- und Verwerftest bleibt gemäss T005 offen.

## Verknüpfungen

- [[D008 - Aufnahme verwerfen und mehrere Bilder lokal erfassen]]
- [[T005 - Aufnahme verwerfen und mehrere Bilder getrennt verwalten]]
