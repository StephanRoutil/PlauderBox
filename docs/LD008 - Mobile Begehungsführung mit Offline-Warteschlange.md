---
typ: loesungsdokumentation
id: LD008
status: intern-bereitgestellt-nicht-mobil-abgenommen
datum: 2026-11-11
---

# LD008 – Mobile Begehungsführung mit Offline-Warteschlange

> **Gültigkeitsvermerk vom 11.11.2026:** Der lokale Begehungs- und Offlineablauf bleibt gültig. Die hier noch deaktivierte Protokollpunktübergabe wurde durch [[LD009 - Kontrollierte Protokollpunkte an HappyHour übergeben]] abgelöst; der nachgelagerte Bildvertrag ist in [[LD010 - Begehungsbilder kontrolliert an HappyHour übertragen]] dokumentiert.

## Gültiger lokaler Stand

`App.vue` orchestriert die acht in D009 freigegebenen Ansichten. Die Vue-Komponenten unter `src/PlauderBox.UI.Client/src/components` bilden Scanner, Start, aktive Begehung, Erfassung, Offline-Hinweis, Auswertung, Kontrolle und Abschluss ab.

Die produktiven mobilen Fachtypen und Ablaufregeln liegen ausschliesslich in `src/PlauderBox.Logik/Client/begehungsAblauf.ts`: Erzeugung, Vollständigkeit, Zuordnung, Wiederanlauf sowie FIFO-/Fehlerstopp werden direkt im Offline-Client ausgeführt und getestet. C# dupliziert diese Regeln nicht. `ErfassungsId.cs` validiert nur die tatsächlich serverrelevante Kennung am Transkriptionsendpunkt. Vue koordiniert den Ablauf.

`pruefeBegehungsstart` bildet das Quality-Gate vor dem ersten lokalen Commit. Der geladene HappyHour-Kontext muss mindestens eine eindeutige gültige Person im Verteiler enthalten, weil `Wer` beim späteren Schreiben eines Protokollpunkts Pflicht ist. Zusätzlich muss mindestens eine gültige Protokollpunktart vorhanden sein. Fehlt eine oder fehlen beide Voraussetzungen, verwendet `verwendeBegehung.ts` den typisierten Zustand `blockiert` mit einer konkreten Problemliste. `BegehungStart.vue` sperrt den Start und blendet sofort einen modalen, fokussierten Dialog ein, der jeden fehlenden Eintrag nennt. Der Dialog verweist auf die Aktualisierung der aktiven HappyHour-Freigabe und bietet den Rückweg zu einem neuen QR-Scan. Die Prüfung wird beim Laden und unmittelbar vor dem Start ausgeführt. Es wird weder eine lokale Begehung angelegt noch bestehender lokaler Speicher entfernt.

`begehungsSpeicher.ts` kapselt IndexedDB für `PlauderBoxBegehungsspeicher`. Eine lokale Begehung enthält den gelesenen Protokollkontext, stabile Eintragskennungen, explizite Verweise auf Traktandum beziehungsweise vorbereiteten Protokollpunkt, Audio-Blobs, mehrere Bild-Blobs und Zustände. `committeEintrag` erzeugt zuerst einen Kandidaten, wartet dessen Commit ab und gibt ihn erst danach als neuen kanonischen Zustand zurück. Bei einem Fehler bleibt der Parentzustand unverändert; der Erfassungsentwurf behält exakt denselben Audio-Blob und dieselbe Erfassungs-ID für den sichtbaren Retry. Das Verwerfen rollt bei Commitfehler Audio und vorherigen Status zurück.

`legacyWiederherstellung.ts` bildet aus den vorhandenen Legacy-Metadaten einen stabilen Importbezeichner. Bei bewusster Übernahme werden neue Begehung und Migrationsmarker in derselben IndexedDB-Transaktion bestätigt. Spätere Starts unterdrücken genau diesen Altbestand. Die ursprünglichen Legacy-Daten bleiben unangetastet und können nicht durch einen halbfertigen Import verloren gehen.

Online wird eine neue Aufnahme durch `auswertungsDienst.ts` bewusst über `/api/v1/transkribieren` ausgewertet. Offline bleibt sie als `wartet_auf_auswertung` erhalten. Das `online`-Ereignis und der App-Start bearbeiten die Warteschlange in Erfassungsreihenfolge. Nach bestätigter strukturierter Antwort werden Transkript und Vorschläge übernommen und nur der Audio-Blob entfernt; Bilder und kontrollierbare Felder bleiben lokal. Bei Fehler bleibt Audio erhalten und die UI bietet eine manuelle Wiederholung. Aus der Kontrolle öffnet `EintragErfassen.vue` auch ausgewertete Punkte mit vollständiger Mutation von Bildern, Audio, Zuordnung und Textfeldern; vorhandene Auswertungstexte bleiben dabei erhalten.

`auswertungsDienst.ts` unterscheidet eine von HappyHour mit HTTP 401, 403, 404 oder 410 abgewiesene Rundgangsfreigabe von sonstigen Dienstfehlern. `verwendeAuswertungsWarteschlange.ts` sichert den Fehlerzustand ohne Löschen des Audio-Blobs und öffnet den vorhandenen Erneuerungsscanner. `verwendeHappyHourUebergabe.ts` merkt sich die aufrufende Ansicht, akzeptiert weiterhin nur eine Freigabe für dasselbe Protokoll und kehrt nach dem atomaren lokalen Commit dorthin zurück. Die erneute Auswertung bleibt eine bewusste Aktion des Mitarbeiters.

Einträge lassen sich auch vollständig ohne Audio manuell erfassen. Bei Audio steht die rote Auswertungsaktion unmittelbar nach dem Diktatbereich; der typisierte Zustand aus `verwendeAuswertungsWarteschlange.ts` sperrt die Aktion während des Laufs. `VorgangsFortschritt.vue` bleibt während der gesamten Anfrage ansichtsunabhängig als feste Statusanzeige mit Spinner, animiertem unbestimmtem Balken und Text sichtbar. Dieselbe Komponente zeigt den vollständigen HappyHour-Übergabevorgang, bis Punkte und Bilder bestätigt sind oder der Ablauf einen Fehler meldet. Offline vorgemerkte Aufnahmen können zusätzlich in Offline-Hinweis, Kontrolle und Abschluss mit einer Aktion verarbeitet werden, ohne die aktuelle Ansicht zuerst zu verlassen. Die KI-Auswertung erfindet keine Protokollpunktart. Fehlt sie beim Übernehmen eines Eintrags, öffnet `EintragErfassen.vue` sofort einen modalen Pflichtfelddialog; dessen Aktion schliesst den Dialog, scrollt zur Auswahl und fokussiert sie. Die zuletzt bei einem neuen Eintrag bewusst gewählte gültige Protokollpunktart wird innerhalb derselben Begehung als Standard für den nächsten neuen Eintrag verwendet.

`markiereManuellenEintragAlsAusgewertet` in `eintragErfassungsAblauf.ts` setzt einen bewusst übernommenen Eintrag ohne Audio auf `ausgewertet` und entfernt einen früheren Auswertungsfehler. Ein vorhandener Audio-Blob verhindert diesen Statuswechsel, damit Audioeinträge weiterhin erst nach bestätigter KI-Antwort als ausgewertet gelten.

Die Erfassung zeigt kein separates Feld `Traktandum`. `Gruppe` wird als einziges fachliches Gruppierungsfeld an HappyHour übergeben und dort für die gruppierte Protokollansicht sowie die Traktandenliste im PDF verwendet. Die frühere Eigenschaft `traktandum` bleibt vorerst ausschliesslich als leeres Kompatibilitätsfeld im lokalen Schema, damit bereits gespeicherte Begehungen ohne Migration oder Datenverlust lesbar bleiben; sie wird nicht mehr bedient oder übertragen.

`MobileKopf.vue` zeigt nach Beginn der Begehung die drei beschrifteten Kurznavigationen `‹ Back`, `Start` und `Beenden`. Die einzelnen Ansichten binden diese an Rücksprung, aktive Begehungsübersicht und Kontrolle; das aktuelle oder nicht verfügbare Ziel bleibt sichtbar deaktiviert. `EintragErfassen.vue` sichert beim Sprung zu Start oder Kontrolle zuerst den aktuellen Entwurf und wechselt nur nach erfolgreichem lokalem Commit.

`BegehungKontrolle.vue` hebt jeden offenen Eintrag einzeln hervor. Die Kennzeichnung unterscheidet `Auswertung fehlgeschlagen`, `Noch nicht ausgewertet` und `Angaben unvollständig`, kann mehrere Ursachen kombinieren und bietet sichtbar `Öffnen und korrigieren`. Die Aktion öffnet anhand der stabilen Eintrags-ID genau den betroffenen Eintrag.

`PlauderBoxMarke.vue` bildet die gemeinsame Marke für Scanner, Begehungsstart und alle weiteren App-Kopfzeilen. Sie verwendet dasselbe `/icon.svg` wie das PWA-Manifest und zeigt die beim Vite-Build aus `package.json` eingebettete dreiteilige Version. `tests/Pruefe-Prototyp.ps1` verlangt zusätzlich, dass diese Frontendversion mit der Version in `PlauderBox.UI.csproj` übereinstimmt.

`kiSchluesselStatus.ts` fragt beim App-Start den begrenzten Vertrag `/api/v1/ki-schluesselstatus` ab. `KiSchluesselHinweis.vue` zeigt währenddessen einen Status mit Spinner, ab 30 Tagen vor dem konfigurierten Ablaufdatum eine Warnung und nach Ablauf eine Sperrmeldung. Die bestehende allgemeine Statusroute bleibt auf `kiBereit` beschränkt. Serverseitig liest `PlauderBoxOptionen` das Datum `GueltigBis` im Format `JJJJ-MM-TT`; `KiSchluesselGueltigkeit` bildet Bereitschaft, Vorwarnung und Ablauf an einer testbaren Stelle ab. Der Transkriptionsendpunkt prüft diesen Zustand nach bestätigter HappyHour-Freigabe und vor dem Audio-Body. Schlüsselwert, Schlüsseldatei und Modellnamen sind nicht Teil des Clientvertrags.

`EintragErfassen.vue` trennt die Bildquellen: `Foto aufnehmen` verwendet einen Datei-Input mit `capture="environment"`; `Aus Galerie wählen` verwendet einen eigenen Mehrfach-Datei-Input ohne `capture`. Beide Wege übernehmen Bilder über dieselbe Validierung und dieselbe atomare IndexedDB-Speicherung.

`bildSicherung.ts` erzeugt beim Abschluss aus allen Begehungseinträgen einzelne `File`-Objekte mit lesbaren Namen. `BegehungAbschluss.vue` startet mit einer Benutzeraktion direkt die einzelnen Browserdownloads und öffnet keinen Android-Teilen- oder Diensteauswahldialog. Es wird kein ZIP erstellt. Die Sicherungsaktion verändert weder interne Bild-Blobs noch Begehungsstatus oder HappyHour-Daten.

`verwendeBegehung.ts` bietet einen bestätigungspflichtigen manuellen Löschweg, der sowohl `PlauderBoxBegehungsspeicher` als auch den alten `PlauderBoxInternerSpeicher` entfernt und danach zum Scanner zurückkehrt. Er ist am Scanner, in der Startansicht und während der aktiven Begehung erreichbar. Der Service-Worker-Cache wird nicht gelöscht, damit die PWA weiterhin offline starten kann.

Die PWA-Dateien `manifest.webmanifest`, `icon.svg` und `service-worker.js` stellen die App-Hülle für Offline-Neustarts bereit. Der Vite-Build schreibt die tatsächlich erzeugten gehashten JS-/CSS-Dateien in den Precache. Ein automatisierter Offline-Test führt den gebauten Service Worker mit abgewiesenem Netzwerk aus und verlangt die gecachte Navigation. Die tatsächliche Installierbarkeit bleibt auf den Zielgeräten zu prüfen.

Die Abschlussansicht übergibt kontrollierte Protokollpunkte bewusst gemäss [[LD009 - Kontrollierte Protokollpunkte an HappyHour übergeben]] und danach ihre Bilder gemäss [[LD010 - Begehungsbilder kontrolliert an HappyHour übertragen]]. Erst die vollständige Bestätigung markiert die lokale Begehung als übertragen. Protokollabschluss und Versand bleiben ausgeschlossen. Der Mitarbeiter kann zur Kontrolle zurück oder die lokale Begehung nach Bestätigung vollständig verwerfen und einen neuen Code scannen.

Da die Rundgangsfreigabe zeitlich begrenzt und im internen Testbetrieb cachebasiert ist, bietet `BegehungAbschluss.vue` zusätzlich `Freigabe erneuern`. `App.vue` liest den neuen QR-Code über denselben begrenzten HappyHour-Vertrag und akzeptiert ihn nur, wenn dessen geladene Protokoll-ID exakt der lokal gespeicherten Protokoll-ID entspricht. `fuehreHappyHourKontextZusammen` in `begehungsAblauf.ts` ordnet vorhandene Punkte anhand HappyHour-ID oder stabiler GUID zu, ergänzt neue HappyHour-Punkte und bewahrt lokale Texte und Medien. `committeFreigabeErneuerung` in `begehungsSpeicher.ts` macht Token und zusammengeführten Kontext erst nach bestätigtem IndexedDB-Commit kanonisch. Ein fremdes Protokoll oder ein Speicherfehler verändert den bisherigen Stand nicht.

Lokale Änderungen durch Speichern, neue Einträge, Löschen oder die Zusammenführung noch nicht bestätigter Einträge entfernen `uebertragenAm` und `bilderUebertragenAm`. Damit sperrt eine frühere erfolgreiche Übergabe keine später lokal ergänzten Punkte oder Bilder. Beim Wiederanlauf werden widersprüchliche alte Übertragungsmarkierungen ebenfalls bereinigt.

Freigabe-Tokens stehen technisch im Pfad des lesenden Vertrags. ASP.NET-Hosting-Requestlogs werden für die betroffenen Kategorien auf `Warning` begrenzt und die HappyHour-HttpClient-Logger vollständig entfernt. Ein Laufzeittest sendet einen markierten Token und schlägt fehl, sobald dieser in Standard- oder Fehlerausgabe erscheint.

## Relevante Dateien

- `src/PlauderBox.UI.Client/src/App.vue`
- `src/PlauderBox.UI.Client/src/composables/verwendeBegehung.ts`
- `src/PlauderBox.UI.Client/src/components/BegehungStart.vue`
- `src/PlauderBox.UI.Client/src/components/AktiveBegehung.vue`
- `src/PlauderBox.UI.Client/src/components/EintragErfassen.vue`
- `src/PlauderBox.UI.Client/src/components/VorgangsFortschritt.vue`
- `src/PlauderBox.UI.Client/src/components/KiSchluesselHinweis.vue`
- `src/PlauderBox.UI.Client/src/components/MobileKopf.vue`
- `src/PlauderBox.UI.Client/src/components/PlauderBoxMarke.vue`
- `src/PlauderBox.UI.Client/src/components/OfflineHinweis.vue`
- `src/PlauderBox.UI.Client/src/components/EintragAuswertung.vue`
- `src/PlauderBox.UI.Client/src/components/BegehungKontrolle.vue`
- `src/PlauderBox.UI.Client/src/components/BegehungAbschluss.vue`
- `src/PlauderBox.UI.Client/src/services/begehungsSpeicher.ts`
- `src/PlauderBox.UI.Client/src/services/eintragErfassungsAblauf.ts`
- `src/PlauderBox.UI.Client/src/services/auswertungsDienst.ts`
- `src/PlauderBox.UI.Client/src/services/kiSchluesselStatus.ts`
- `src/PlauderBox.UI.Client/src/services/legacyWiederherstellung.ts`
- `src/PlauderBox.UI.Client/src/services/bildSicherung.ts`
- `src/PlauderBox.Logik/Client/begehungsAblauf.ts`
- `src/PlauderBox.Logik/ErfassungsId.cs`
- `src/PlauderBox.Logik/RundgangsfreigabeToken.cs`
- `src/PlauderBoxOptionen.cs`
- `src/Sicherheit/KiSchluesselGueltigkeit.cs`
- `src/Endpunkte/TranskriptionsEndpunkte.cs`
- `src/PlauderBox.UI.Client/public/service-worker.js`

## Bekannte Grenzen

- Die aktuelle Auswertung besitzt noch keinen serverseitig persistenten Idempotenzspeicher. Die stabile `erfassungsId` wird serverseitig validiert; der Client entfernt Audio erst nach bestätigter Antwort und wiederholt erfolgreiche Zustände nicht. Ein Absturz zwischen externer Antwort und lokalem Commit kann dennoch eine erneute KI-Auswertung verursachen. Ohne entschiedene Serverpersistenz bleibt Q2 hierfür offen.
- Der Service Worker kann im automatisierten Test nicht die Bedingungen realer Android-/iOS-Browser und Speicherräumung belegen.
- Die Protokollpunktübergabe ist gemäss LD009 umgesetzt. Die Bildzuordnung nach `tblDokument` ist gemäss LD010 lokal umgesetzt; die reale mobile Abnahme bleibt offen. Der Abschluss ist weiterhin kein fachlicher HappyHour-Abschluss oder Versand.
- Browserdownloads können die endgültige Ablage in einer Android-Galerie nicht garantieren. Die Dateien werden ohne Diensteauswahl in den Downloadbereich geschrieben; eine garantierte Galerieablage erfordert eine native Android-Anwendung.

## Nachweis

Die automatisierten Nachweise stehen in [[T007 - Vollständigen mobilen Begehungsablauf prüfen]].

Der Entscheid zur externen Einzelbildsicherung steht in [[E009 - Begehungsbilder einzeln mit einer Aktion extern sichern]].

Der Entscheid zur protokollgebundenen Freigabeerneuerung steht in [[E011 - Rundgangsfreigabe für eine lokale Begehung sicher erneuern]].

Das qualitätsgeprüfte Image `sha256:f7f1d60381dd…` läuft intern auf Delphi01. HTTPS und KI-Status liefern HTTP 200; das ausgelieferte Asset enthält die getrennten Kamera-/Galerieaktionen und die einmalige Bildsicherung. Der vorherige Stand ist als `plauderbox:delphi01-test-before-fotosicherung` verfügbar.

## Fachliche Herkunft

- [HappyHour US011 – Protokollpunkte während eines Gebäuderundgangs mobil erfassen können](../../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/US011%20%E2%80%93%20Protokollpunkte%20w%C3%A4hrend%20eines%20Geb%C3%A4uderundgangs%20mobil%20erfassen%20k%C3%B6nnen.md)
- [HappyHour UC004 – Vorbereiteten Gebäuderundgang mobil erfassen und an HappyHour übergeben](../../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/01_Anwendungsf%C3%A4lle/UC004%20%E2%80%93%20Vorbereiteten%20Geb%C3%A4uderundgang%20mobil%20erfassen%20und%20an%20HappyHour%20%C3%BCbergeben.md)
