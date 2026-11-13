---
typ: entscheid
id: E009
status: beschlossen
datum: 2026-11-11
---

# E009 – Begehungsbilder einzeln mit einer Aktion extern sichern

## Ausgangslage

PlauderBox bewahrt Bilder offline im internen IndexedDB-Speicher. Die Browserkamera legt neu erfasste Bilder auf den getesteten Android-Geräten nicht zwingend zusätzlich in der Galerie ab. Bis zur noch offenen HappyHour-Dokumentübergabe soll ein Mitarbeiter deshalb alle Rundgangsbilder mit einer einzigen bewussten Aktion ausserhalb des App-Speichers sichern können. Ein ZIP-Archiv und ein einzelner Speichervorgang je Bild wurden ausdrücklich verworfen.

## Entscheid

- Die Erfassung bietet getrennte Aktionen `Foto aufnehmen` und `Aus Galerie wählen`.
- `Foto aufnehmen` fordert die rückseitige Kamera an. `Aus Galerie wählen` verwendet keinen Kamerazwang und erlaubt die Mehrfachauswahl vorhandener Bilder.
- Die Abschlussansicht bietet bei vorhandenen Bildern genau eine Aktion `Alle {Anzahl} Bilder sichern`.
- PlauderBox startet mit derselben Benutzeraktion die Downloads aller einzelnen Bilddateien. Der Android-Teilen- und Diensteauswahldialog wird nicht verwendet. Der Browser darf einmalig die Freigabe mehrerer Downloads verlangen.
- Es wird kein ZIP erzeugt. Dateinamen enthalten Projekt, Protokoll, Eintragsreihenfolge, Gruppe und Bildreihenfolge.
- Die externe Sicherung löscht keine interne Kopie und behauptet keine Übergabe an HappyHour. Interne Bilder bleiben bis zu einer später ausdrücklich geregelten Löschung erhalten.

## Grenzen

- Eine Browser-PWA kann nicht direkt in den geschützten Android-Galeriespeicher schreiben. Die Dateien landen im Downloadbereich; ob eine Galerie-App diesen Ordner anzeigt, bestimmt Android beziehungsweise die Galerie-App.
- PlauderBox kann den gestarteten Download, aber nicht die endgültige Ablage jeder Datei durch Android beweisen. Eine garantierte Galerieablage würde eine native Android-Anwendung und einen neuen Architekturentscheid erfordern.
- Die Bildübertragung nach `tblDokument` ist inzwischen als eigenständiger Vertrag in E010 geregelt; die zusätzliche externe Sicherung dieses Entscheids bleibt davon unabhängig.

## Ablösung des ursprünglichen Teilen-Dialogs

Der am 11.11.2026 beschlossene Web-Share-Vorrang wurde nach der Mobilgeräteprüfung am 13.11.2026 abgelöst. Der native Dialog zwang zur Auswahl eines fremden Dienstes und erfüllte den erwarteten direkten Sicherungsablauf nicht. Die unveränderten Entscheide `eine Aktion`, `Einzeldateien`, `kein ZIP` und `keine Löschung der internen Kopien` bleiben bestehen.

## Verknüpfungen

- [[D011 - Mobile Begehung vollständig lokal durchführen]]
- [[E007 - Mobile Begehungsführung gemäss freigegebenem Designplan umsetzen]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
- [[T007 - Vollständigen mobilen Begehungsablauf prüfen]]
