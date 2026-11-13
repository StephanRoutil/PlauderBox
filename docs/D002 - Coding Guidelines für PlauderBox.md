---
typ: richtlinie
id: D002
status: freigegeben
datum: 2026-11-09
herkunft: FileBox D017
---

# D002 – Coding Guidelines für PlauderBox

## Geltung und Herkunft

Diese Richtlinie übernimmt die bewährten Grundsätze aus FileBox D017 und passt sie an PlauderBox, Vue, TypeScript, ASP.NET Core und das Dreischichten-Modell an. FileBox-spezifische Datei-, Paket-, Einladungs- und Blazor-Regeln werden nicht übernommen. Jede prüfbare PlauderBox-Regel besitzt eine stabile `PB-`-Kennung.

## Architektur

### PB-ARC-001 – Drei Schichten

**Stufe:** Verbindlich
**Prüfbarkeit:** Architekturtest / Review

PlauderBox besteht aus `PlauderBox.UI`, `PlauderBox.Logik` und `PlauderBox.Datenmanagement`. Die Logik referenziert keine andere PlauderBox-Schicht. Das Datenmanagement darf die Logik referenzieren und deren Verträge implementieren. Die UI darf Logik und Datenmanagement nutzen; konkrete Datenmanagement-Implementierungen werden ausschliesslich im Composition Root verdrahtet.

### PB-ARC-002 – Fachregeln ausserhalb der UI

**Stufe:** Verbindlich
**Prüfbarkeit:** Review / Quality Agent

Aufnahmezustände, Synchronisationsregeln, Wiederholungen, Freigaben und spätere Protokollbildung liegen in der Logik. Vue-Komponenten und HTTP-Endpunkte koordinieren Ein- und Ausgabe, enthalten aber keine parallelen Fachregeln.

### PB-ARC-003 – Datenmanagement kapselt Provider

**Stufe:** Verbindlich
**Prüfbarkeit:** Architekturtest / Review

OpenAI- und HappyHour-Implementierungen gehören ins Datenmanagement. Eine später ausdrücklich entschiedene serverseitige Persistenz würde ebenfalls dort gekapselt. Provider-DTOs, SDK-Typen und Verbindungsdetails dürfen nicht in die Logik gelangen.

### PB-ARC-004 – Abhängigkeiten von aussen bereitstellen

**Stufe:** Verbindlich
**Prüfbarkeit:** Review

Dienstabhängigkeiten werden injiziert. Globale Service-Locators und versteckte statische Laufzeitabhängigkeiten sind unzulässig. Kleine fachliche Wertobjekte dürfen normal erzeugt werden.

### PB-ARC-005 – Eine klar benennbare Verantwortung

**Stufe:** Verbindlich
**Prüfbarkeit:** Review / Quality Agent

Methoden, Vue-Komponenten, Composables und Dienste erfüllen jeweils eine zusammenhängende Aufgabe. Abstraktionen werden für belegte Varianten und Testgrenzen eingeführt, nicht vorsorglich.

## Benennung und Sprache

### PB-NAM-001 – Deutsche Domänenbegriffe

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review

Fachliche Typen, Zustände, Eigenschaften, Methoden und UI-Bezeichnungen verwenden deutsche Begriffe wie `Aufnahme`, `Protokollpunkt` und `Übertragungsstatus`. Etablierte technische Begriffe wie `HttpClient`, `MediaRecorder`, `ServiceWorker` und `Repository` dürfen englisch bleiben.

### PB-NAM-002 – Aussagekräftige Namen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / statische Analyse

C#-Typen, Komponenten und öffentliche Member verwenden PascalCase; lokale Variablen und TypeScript-Funktionen camelCase. Vue-Komponenten verwenden sprechende Mehrwortnamen. Abkürzungen ausser allgemein etablierten technischen Kürzeln werden vermieden.

### PB-NAM-003 – Kommentare erklären Gründe

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review

Kommentare erklären nicht offensichtliche Gründe, Grenzen und Sicherheitsentscheide. Sie wiederholen keinen unmittelbar lesbaren Code und behaupten keine ungeprüften Garantien.

## C# und ASP.NET Core

### PB-CS-001 – Nullable und Warnungen ernst nehmen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Build / Review

Nullable bleibt aktiviert. Eigener neuer Code baut ohne unbegründete Compilerwarnungen. Warnungen werden behoben oder eng begrenzt und nachvollziehbar begründet.

### PB-CS-002 – Asynchron bis zur Eingangsgrenze

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / Tests

Netzwerk-, Datenbank- und Dateioperationen sind asynchron, reichen `CancellationToken` weiter und blockieren nicht mit `.Result` oder `.Wait()`.

### PB-CS-003 – Sichere Fehlergrenze

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / Integrationstest

Technische Details, Schlüssel, interne Pfade und Providerantworten werden nicht an Browser oder Logs weitergegeben. Fachlich verständliche Fehler bleiben von Diagnoseinformationen getrennt.

### PB-CS-004 – Eingaben serverseitig prüfen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Integrationstest / Review

Dateigrösse, Medientyp, Identitäten, Zustände und Berechtigungen werden an der Servergrenze geprüft. Browserangaben gelten nicht als vertrauenswürdig. Datenbankabfragen sind parametrisiert.

## Vue und TypeScript

### PB-TS-001 – TypeScript strikt verwenden

**Stufe:** Verbindlich  
**Prüfbarkeit:** Typecheck / Review

Der produktive Vue-Code verwendet TypeScript im strikten Modus. `any`, ungeprüfte Typumwandlungen und Non-Null-Assertions sind nur eng begrenzt mit nachvollziehbarer Begründung zulässig. Externe Daten werden an der Eingangsgrenze validiert.

### PB-TS-002 – Komponenten bleiben darstellungsnah

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / Quality Agent

Vue-Komponenten bilden Bedienung und Darstellung ab. Wiederverwendbare Abläufe wie Aufnahme, lokale Warteschlange und Synchronisation liegen in klar benannten Composables oder Diensten. Browser-APIs werden hinter kleinen Verträgen gekapselt.

### PB-TS-003 – Zustände explizit modellieren

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / Tests

Offline-, Übertragungs- und Fehlerzustände werden als endliche, typisierte Zustände modelliert. Widersprüchliche Kombinationen unabhängiger boolescher Flags sind zu vermeiden.

### PB-TS-004 – Keine Geheimnisse im Client

**Stufe:** Verbindlich  
**Prüfbarkeit:** Build-Artefakt / Review

Vue-Code, Service Worker, Browser-Speicher und Frontend-Build enthalten keine API-Schlüssel, Datenbankzugänge oder HappyHour-Zugangsdaten. Externe KI- und HappyHour-Zugriffe laufen ausschliesslich über den Server.

### PB-TS-005 – Offline-Daten verlustsicher behandeln

**Stufe:** Verbindlich  
**Prüfbarkeit:** Browser-/Fehlertest

Lokale Aufnahmen besitzen stabile Identitäten und nachvollziehbare Zustände. Sie werden erst nach bestätigter serverseitiger Übernahme gelöscht. Wiederholte Übertragung muss serverseitig idempotent behandelt werden.

### PB-TS-006 – Bedienbarkeit mobil und zugänglich

**Stufe:** Verbindlich  
**Prüfbarkeit:** Browser-/Gerätetest

Primäre Aktionen sind per Touch und Tastatur bedienbar, Status ist nicht nur durch Farbe erkennbar, Fokus bleibt sichtbar und schmale Ansichten funktionieren ohne verdeckte Kernaktionen.

### PB-TS-007 – Wartezeiten sichtbar machen

**Stufe:** Verbindlich
**Prüfbarkeit:** Verhaltenstest / Browser-/Gerätetest

Wenn PlauderBox einen internen oder externen Dienst anspricht und für den Benutzer eine Wartezeit entstehen kann, zeigt die Oberfläche während des gesamten Vorgangs einen verständlichen Status und einen sichtbaren Spinner beziehungsweise eine gleichwertige Fortschrittsanzeige. Die Anzeige endet erst nach bestätigtem Erfolg oder sichtbarer Fehlermeldung. Ein deaktivierter Button allein genügt nicht.

## Daten und Schnittstellen

### PB-DAT-001 – Serverseitige Persistenz im Datenmanagement

**Stufe:** Verbindlich  
**Prüfbarkeit:** Architekturtest / Integrationstest

Falls PlauderBox künftig eine eigene serverseitige Persistenz erhält, liegen deren Zugriffe im Datenmanagement. Transaktionen sichern fachlich zusammengehörige Änderungen. Migrationen sind versioniert und werden gegen das tatsächlich entschiedene Datenbanksystem geprüft. Diese Regel begründet selbst keine Einführung einer serverseitigen Datenbank.

### PB-API-001 – Versionierte und dokumentierte Verträge

**Stufe:** Verbindlich  
**Prüfbarkeit:** Vertragstest / Review

UI und Server kommunizieren über versionierte HTTPS-/JSON- oder Multipart-Verträge. Änderungen berücksichtigen Abwärtskompatibilität, Wiederholung und klare Fehlerantworten.

## Entwicklungsumgebung und Arbeitsablage

### PB-DEV-001 – Reproduzierbare Artefakte nach Abschluss entfernen

**Stufe:** Verbindlich
**Prüfbarkeit:** Abschlussprüfung / Quality Agent

Nach Abschluss einer lokalen Entwicklungs-, Build-, Test- oder Veröffentlichungsarbeit werden nicht mehr benötigte, reproduzierbare Artefakte aus der Arbeitsablage entfernt. Dazu gehören insbesondere `bin`, `obj`, `.vs`, `node_modules`, Testergebnis- und Coverage-Ordner, temporäre Publish-/Release-Ablagen, heruntergeladene lokale Toolchains sowie lokale Test-Backups. Die Bereinigung erfolgt erst, nachdem erforderliche Prüfergebnisse nachvollziehbar festgehalten wurden.

Versionierter Quellcode, Dokumentation, Konfiguration, freigegebene Produktionsartefakte und nicht reproduzierbare Nachweise dürfen durch diese Bereinigung nicht entfernt werden. Vor rekursivem Löschen sind die absoluten Ziele und ihr Git-Status zu prüfen. Die Bereinigung betrifft ausschliesslich die lokale Entwicklungsablage; Test- und Produktivsysteme werden nur durch einen ausdrücklichen Bereitstellungsauftrag verändert.

## Versionierung und Freigabe

### PB-REL-001 – Versionsnummer kontrolliert erhöhen

**Stufe:** Verbindlich
**Prüfbarkeit:** Prüflauf / Review

PlauderBox verwendet die dreiteilige Versionsnummer `Hauptversion.Nebenversion.Patch`. Eine Erhöhung der Haupt- oder Nebenversion und damit eine grosse Version wird ausschliesslich durch Stephan Routil freigegeben. Bei abgeschlossenen kleinen Verbesserungen und Bugfixes erhöht der Coding-Agent die Patch-Stelle selbstständig. Frontend- und Serverversion müssen übereinstimmen; die tatsächlich gebaute Version ist in jeder App-Kopfzeile sichtbar. Eine Versionsnummer wird nicht ohne zugehörigen geprüften Commit erhöht.

### PB-SEC-001 – Vertrauliche Inhalte minimieren

**Stufe:** Verbindlich  
**Prüfbarkeit:** Security-Review

Audio, Transkripte und Projektdaten werden nur so lange und so umfangreich gespeichert oder extern übertragen, wie es der dokumentierte Ablauf erfordert. Logs enthalten keine Rohaufnahmen, vollständigen Transkripte, Tokens oder Geheimnisse.

## Tests und Nachweise

### PB-TST-001 – Verhalten statt Implementierungsdetails testen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Review / automatisierte Tests

Geänderte Fachlogik erhält angemessene Tests für beobachtbares Verhalten und relevante Grenzen. UI-, Persistenz- und Providerfälle werden auf der passenden Ebene geprüft.

### PB-TST-002 – Offline- und Wiederanlauffälle prüfen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Browser-/Integrationstest

Verbindungsabbruch, App-Neustart, doppelte Übertragung, Serverfehler und erfolgreiche Wiederaufnahme werden mit synthetischen Daten geprüft. Ein HTTP-200-Nachweis allein genügt nicht.

### PB-TST-003 – Nachweise präzise benennen

**Stufe:** Verbindlich  
**Prüfbarkeit:** Quality Agent

Prüfberichte unterscheiden bestanden, belegter Verstoss, Prüfung erforderlich, nicht geprüft und nicht anwendbar. Fehlendes Tooling beweist keinen Codeverstoss; ein bestandener Einzeltest keine Gesamtfreigabe.

## Verknüpfungen

- [[E003 - Offlinefähige PWA mit modularem Monolithen verwenden]]
- [[E004 - Vue und TypeScript für die mobile Oberfläche verwenden]]
- [[D003 - Qualitätsanforderungen und Prüfablauf für PlauderBox]]
