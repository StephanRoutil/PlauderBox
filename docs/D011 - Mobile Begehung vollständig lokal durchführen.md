---
typ: anforderung
id: D011
status: lokal-umgesetzt-testoffen
datum: 2026-11-10
---

# D011 – Mobile Begehung vollständig lokal durchführen

## Ziel

Als Mitarbeiter möchte ich eine freigegebene Begehung auf dem Mobilgerät starten, mehrere Punkte mit Bildern und Sprache online oder offline erfassen, die Auswertungen kontrollieren und die Begehung bewusst abschliessen, damit bis zur späteren HappyHour-Übergabe keine Beobachtung verloren geht.

## Akzeptanzkriterien

- **AK01:** Nach gültigem QR-Code und geladenem Kontext startet die Begehung erst durch eine bewusste Aktion und bleibt nach einem App-Neustart erhalten.
- **AK02:** Die aktive Begehung zeigt aktuellen Eintrag sowie alle Einträge nach `Gruppe` als Akkordeon und bietet Mutation, Löschung, neuen Eintrag und Kontrolle.
- **AK03:** Ein neuer Eintrag beginnt mit mehreren einzeln löschbaren Bildern und einer verwerfbaren Audioaufnahme. Der Sprechleitfaden nennt Gruppe, Thema, Inhalt und allenfalls Rechtsverweis; ein Ortsfeld wird nicht eingeführt.
- **AK03a:** Eine neue Feststellung kann einem vorbereiteten Traktandum und optional einem vorhandenen Protokollpunkt zugeordnet oder ausdrücklich als neuer Protokollpunktentwurf geführt werden. Die Zuordnung speichert Referenzen aus dem gelesenen Kontext und deutet keine HappyHour-Objekte um.
- **AK04:** Audio, Bilder, Metadaten und Zustand liegen bis zur bestätigten Auswertung im internen IndexedDB-Speicher. Audio wird erst nach erfolgreicher Auswertung entfernt.
- **AK05:** Ohne Verbindung wird der Eintrag als ausstehend gesichert. Weitere Einträge und Kontrolle bleiben möglich.
- **AK06:** Bei wiederhergestellter Verbindung werden ausstehende Einträge in Erfassungsreihenfolge automatisch ausgewertet. Fehler stoppen die Folge, bewahren Audio und erlauben eine manuelle Wiederholung.
- **AK07:** Die Auswertung zeigt Transkript, Gruppe, Thema, Inhalt und Rechtsverweis. Auch danach bleibt der Eintrag aus der Kontrolle vollständig mutierbar: Bilder, Audio-Neuaufnahme beziehungsweise Verwerfen, Traktandum, vorbereiteter Protokollpunkt und alle Textfelder können korrigiert werden. `Neuer Eintrag` und `Zur Kontrolle` vermeiden eine Sackgasse.
- **AK08:** Die Kontrolle zeigt Eintrags-, Bild- und Offen-Zähler sowie die gruppierten Einträge. Unvollständige oder nicht ausgewertete Einträge sperren den Abschluss.
- **AK09:** Der Abschluss bietet die bewusste Übergabe kontrollierter Protokollpunkte gemäss D012. Der nachgelagerte Bildvertrag ist in D013 geregelt; PlauderBox schliesst oder versendet kein HappyHour-Protokoll.
- **AK10:** Die App-Hülle und statischen Ressourcen werden durch einen Service Worker für den späteren Offlineeinsatz vorgemerkt.
- **AK11:** Ein lokaler Speichererfolg und der kanonische App-Zustand werden erst nach abgeschlossenem IndexedDB-Commit aktualisiert. Quota- und Speicherfehler bleiben sichtbar und bieten Wiederholung mit demselben Audio-Blob und derselben Erfassungs-ID an. Scheitert das Verwerfen, werden Audio und vorheriger Status vollständig wiederhergestellt.
- **AK12:** Ältere Daten aus `PlauderBoxInternerSpeicher` werden erkannt und nach bewusstem Einlesen eines neuen Kontexts zur sicheren Übernahme angeboten. Ein stabiler Importbezeichner wird atomar mit der neuen Begehung markiert, damit derselbe Altbestand bei späteren Starts nicht erneut angeboten oder doppelt ausgewertet wird. Der Altbestand wird dabei nicht ungefragt gelöscht.
- **AK13:** Nach lokalem Abschluss kann der Mitarbeiter zurück zur Kontrolle oder die lokale Begehung nach Umfangsbestätigung verwerfen und einen neuen Code scannen.
- **AK14:** Die Bilderfassung bietet getrennt `Foto aufnehmen` mit rückseitiger Kamera und `Aus Galerie wählen` ohne Kamerazwang; aus der Galerie können mehrere Bilder gemeinsam gewählt werden.
- **AK15:** Am Abschluss kann der Mitarbeiter alle vorhandenen Bilder mit genau einer bewussten Aktion direkt als einzelne Dateien herunterladen. Der Android-Teilen-Dialog wird nicht geöffnet. Es wird kein ZIP erzeugt und keine Einzelbestätigung pro Bild verlangt. Die interne Kopie bleibt unverändert erhalten.
- **AK16:** Ist die zeitlich begrenzte Rundgangsfreigabe vor der Übergabe nicht mehr gültig, kann der Mitarbeiter am Abschluss eine neue Freigabe für exakt dasselbe HappyHour-Protokoll scannen. Ein Code für ein anderes Protokoll wird abgelehnt. Token, Einträge und Bilder werden erst nach erfolgreichem lokalem Commit als neuer kanonischer Zustand übernommen; bei jedem Fehler bleibt der bisherige lokale Stand unverändert.
- **AK17:** Der Mitarbeiter kann den aktuellen und den früheren internen PlauderBox-Datenspeicher nach einer eindeutigen Bestätigung vollständig leeren. Die Funktion ist bereits am QR-Einstieg, in der Startansicht und während der aktiven Begehung erreichbar; der Offline-App-Cache bleibt erhalten.
- **AK18:** Ein Eintrag kann vollständig manuell ohne Audioaufnahme erfasst und gespeichert werden.
- **AK19:** Bei einem Eintrag mit Audio steht `Diktat auswerten` unmittelbar nach dem Diktatbereich. Während der KI-Auswertung sind Aktion und Zustand sichtbar als laufend gekennzeichnet.
- **AK20:** Die bei einem neuen Eintrag zuletzt bewusst gewählte HappyHour-Protokollpunktart wird als Standard für den nächsten neuen Eintrag derselben Begehung verwendet. Vorbereitete Punkte ändern diesen Standard nicht.
- **AK21:** Ausstehende Offline-Aufnahmen können in Offline-Hinweis, Kontrolle und Abschluss mit einer Aktion ausgewertet werden, ohne die jeweilige Ansicht zuerst verlassen zu müssen. Ohne Verbindung bleibt die Aktion gesperrt und verständlich bezeichnet.
- **AK22:** Beim erneuten Einlesen einer Freigabe für dasselbe Protokoll wird der aktuelle HappyHour-Kontext mit der lokalen Begehung verlustfrei zusammengeführt. Neue HappyHour-Punkte werden ergänzt; lokale noch nicht übertragene Einträge, Texte, Audio und Bilder bleiben erhalten. Bereits oder neu bestätigte Punkte werden anhand Protokollpunkt-ID beziehungsweise stabiler GUID nicht dupliziert. Jede lokale Änderung entfernt veraltete Übertragungsmarkierungen, damit sie beim nächsten bewussten Übergabeversuch berücksichtigt wird.

## Abgrenzung und offene Integrationsgrenzen

- Die Bildübergabe an HappyHour ist durch D013 ergänzt; die reale End-to-End-Abnahme bleibt offen.
- `OFFEN`: serverseitiger dauerhafter Duplikatschutz für wiederholte Transkriptionsaufträge.
- `OFFEN`: reale Browserabnahme von Installation, Offline-Neustart, Speichergrenzen, Kamera und Mikrofon auf den Zielgeräten.
- Keine produktive Datenbankänderung und kein autonomer Versand.

## Verknüpfungen

- [[D009 - Designentwurf für die mobile Begehungsführung]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[E007 - Mobile Begehungsführung gemäss freigegebenem Designplan umsetzen]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
- [[T007 - Vollständigen mobilen Begehungsablauf prüfen]]
- [[D012 - Kontrollierte Protokollpunkte an HappyHour übergeben]]
- [[E009 - Begehungsbilder einzeln mit einer Aktion extern sichern]]
- [[E011 - Rundgangsfreigabe für eine lokale Begehung sicher erneuern]]
- [HappyHour US011 – Protokollpunkte während eines Gebäuderundgangs mobil erfassen können](../../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/US011%20%E2%80%93%20Protokollpunkte%20w%C3%A4hrend%20eines%20Geb%C3%A4uderundgangs%20mobil%20erfassen%20k%C3%B6nnen.md)
- [HappyHour UC004 – Vorbereiteten Gebäuderundgang mobil erfassen und an HappyHour übergeben](../../../HappyHour/docs/20_Support%20und%20Services/S04_KI-Helfer/F002_Sprachgestützte%20Protokollerfassung/02_User%20Storys/01_Anwendungsf%C3%A4lle/UC004%20%E2%80%93%20Vorbereiteten%20Geb%C3%A4uderundgang%20mobil%20erfassen%20und%20an%20HappyHour%20%C3%BCbergeben.md)
