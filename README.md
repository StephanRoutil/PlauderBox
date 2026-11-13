# PlauderBox

PlauderBox ist die mobile, offlinefähige Rundgangsanwendung für sprachgestützte Projektdokumentation. Eine zeitlich begrenzte HappyHour-Freigabe liefert den vorbereiteten Protokollkontext. Feststellungen, Bilder und Audio bleiben bis zur Auswertung im internen App-Speicher des Geräts.

Die fachliche Grundlage liegt in [HappyHour US011](../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/US011%20%E2%80%93%20Protokollpunkte%20w%C3%A4hrend%20eines%20Geb%C3%A4uderundgangs%20mobil%20erfassen%20k%C3%B6nnen.md) und [HappyHour UC004](../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/01_Anwendungsf%C3%A4lle/UC004%20%E2%80%93%20Vorbereiteten%20Geb%C3%A4uderundgang%20mobil%20erfassen%20und%20an%20HappyHour%20%C3%BCbergeben.md).

## Aktueller Umfang

- QR-Freigabe und vorbereiteten HappyHour-Kontext lesen,
- Begehung lokal starten und nach App-Neustart fortsetzen,
- neue Feststellung einem Traktandum und optional einem vorbereiteten Protokollpunkt zuordnen,
- mehrere Bilder und eine verwerfbare Audioaufnahme intern speichern,
- Audio bewusst über den PlauderBox-Server an OpenAI übertragen und nach Gruppe, Thema, Inhalt und optionalem Rechtsverweis strukturieren,
- Offline-Warteschlange in Erfassungsreihenfolge verarbeiten,
- Einträge mutieren, löschen und nach Gruppe kontrollieren,
- Begehung lokal abschliessen oder bewusst lokal verwerfen,
- Protokollpunkte und zugehörige Bilder idempotent an HappyHour übergeben sowie eine abgelaufene Freigabe für dasselbe Protokoll erneuern.

PlauderBox erstellt beziehungsweise aktualisiert ausschliesslich die freigegebenen Protokollpunkte und Bilder. Korrekturlesen und Protokollversand bleiben bewusste Schritte in HappyHour; PlauderBox versendet kein Protokoll.

## Version

Der Quellstand ist seit dem 13.11.2026 als **PlauderBox 1.0.0** festgelegt. Der Versionsentscheid und die bewusst offenen Folgearbeiten stehen in [E014](<docs/E014 - PlauderBox Version 1.0 festlegen.md>). Eine Versionsfreigabe des Quellcodes bedeutet nicht automatisch, dass dieser Stand bereits auf Delphi01 oder Olymp01 bereitgestellt wurde.

## Start und Prüfung

```powershell
.\Start-PlauderBox.ps1
.\tests\Pruefe-Prototyp.ps1
```

Danach ist der lokale Entwicklungsstart unter `http://127.0.0.1:5187` erreichbar. Für Visual Studio wird `src/PlauderBox.sln` geöffnet.

Der Docker-Frontendstage übernimmt neben dem Vue-Projekt ausdrücklich `src/PlauderBox.Logik/Client`, weil der Alias `@logik` diese externe TypeScript-Logikschicht beim Produktionsbuild benötigt. `tests/Pruefe-Prototyp.ps1` prüft diesen Buildkontext vor Typecheck und Build.

## Architektur

- `PlauderBox.UI`: Vue-PWA, ASP.NET-Core-Host und HTTP-Eingangsgrenzen,
- `PlauderBox.Logik`: fachliche Zustände, Vollständigkeit, Zuordnung, Wiederanlauf, FIFO-/Fehlerstoppregeln und providerunabhängige Verträge; der Offline-Clientanteil liegt unter `src/PlauderBox.Logik/Client`,
- `PlauderBox.Datenmanagement`: OpenAI- und HappyHour-Provider; IndexedDB wird im Browser durch den UI-nahen Speicheradapter gekapselt.

Die PWA cached den gehashten Produktions-App-Shell. API-Anfragen werden nie durch den Service Worker gecacht. Audio wird erst nach erfolgreicher Auswertung entfernt. Eine fehlgeschlagene IndexedDB-Sicherung wird sichtbar gemeldet und nicht als gespeichert dargestellt; Retry verwendet denselben Blob und dieselbe Erfassungs-ID. Legacy-Daten werden mit einem atomar gespeicherten Importmarker höchstens einmal übernommen, aber nicht ungefragt gelöscht.

Der aktuelle Redesign-Stand ist in [LD012](<docs/LD012 - Strukturelles Redesign der PlauderBox.md>) dokumentiert. Die kanonische HTTP-API verwendet `/api/v1`; die bisherigen `/api`-Pfade bleiben gemäss [E013](<docs/E013 - HTTP-API versionieren und Uebergangsaliase beibehalten.md>) befristete Übergangsaliase.

## Sicherheitsgrenzen

- QR-Freigabe-Tokens erscheinen nicht in PlauderBox-Hosting- oder HttpClient-Logs.
- API-Schlüssel bleiben serverseitig.
- Produktivbetrieb verlangt HTTPS.
- Audio, Bilder, Token und vollständige Transkripte werden nicht protokolliert.
- Olymp01 ist das Live-System unter `https://plauderbox.routil.ch`; Delphi01 bleibt das getrennte Testsystem.

## Bewusst offene Punkte

- separate Veröffentlichung und End-to-End-Abnahme der bereits getesteten PlauderBox-API im produktiven HappyHour,
- serverseitig persistenter Duplikatschutz für Transkriptionsaufträge; ohne entschiedene Persistenzinfrastruktur bleibt Q2 hierfür offen,
- reale Android-/iOS-Abnahme von Offline-Neustart, Kamera, Mikrofon, Speichergrenzen und Installation.

## Zentrale Dokumente

- `docs/D014 - Befunde aus dem Code-Review beheben.md`
- `docs/E005 - PlauderBox in Datenmanagement Logik und UI gliedern.md`
- `docs/E013 - HTTP-API versionieren und Uebergangsaliase beibehalten.md`
- `docs/D011 - Mobile Begehung vollständig lokal durchführen.md`
- `docs/E007 - Mobile Begehungsführung gemäss freigegebenem Designplan umsetzen.md`
- `docs/LD007 - QR-Einstieg und HappyHour-Protokollkontext.md`
- `docs/LD008 - Mobile Begehungsführung mit Offline-Warteschlange.md`
- `docs/LD012 - Strukturelles Redesign der PlauderBox.md`
- `docs/T007 - Vollständigen mobilen Begehungsablauf prüfen.md`
