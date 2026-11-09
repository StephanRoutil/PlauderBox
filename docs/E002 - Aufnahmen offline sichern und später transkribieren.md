---
typ: entscheid
id: E002
status: entschieden
datum: 2026-11-09
---

# E002 – Aufnahmen offline sichern und später transkribieren

## Ausgangslage

PlauderBox soll auch bei Rundgängen in Kellern und anderen Bereichen ohne Mobilfunk- oder WLAN-Verbindung nutzbar sein. Die serverseitige Transkription durch OpenAI benötigt eine Netzwerkverbindung. Eine vollständige Sprache-zu-Text-Verarbeitung direkt auf dem Mobilgerät würde den ersten Produktumfang erheblich vergrössern.

## Entscheid

1. PlauderBox muss im Offlinebetrieb keinen Text erzeugen.
2. Vor Beginn werden die App und der benötigte Protokollkontext bei bestehender Verbindung auf das Gerät geladen.
3. Aufnahme, Fotos und zugehörige Metadaten werden ohne Verbindung im internen, app-eigenen Speicher des Mobilgeräts dauerhaft vorgemerkt und eindeutig als `Noch nicht übertragen` angezeigt. Sie werden nicht in Downloads, Galerie, SD-Karte oder eine Cloudablage geschrieben.
4. Jede lokale Erfassung erhält eine stabile Kennung. Wiederholte Übertragungsversuche dürfen keine Duplikate erzeugen.
5. Sobald PlauderBox wieder eine Verbindung erkennt, startet sie die Übertragung und Transkription automatisch. Beim erneuten Öffnen der App werden ausstehende Übertragungen ebenfalls fortgesetzt.
6. Eine manuelle Wiederholung bleibt verfügbar, falls die automatische Übertragung fehlschlägt oder vom Betriebssystem im Hintergrund nicht ausgeführt wurde.
7. Aufnahme und Metadaten bleiben lokal erhalten, bis der Server die vollständige Übernahme und Transkription bestätigt hat.
8. Erst nach dieser Bestätigung darf PlauderBox die lokale Aufnahme löschen.

## Begründung

- Vor Ort ist die verlustfreie Erfassung wichtiger als ein sofort sichtbares Transkript.
- Die KI-Anbindung und der API-Schlüssel bleiben serverseitig.
- Der erste Produktumfang benötigt kein rechenintensives Sprachmodell auf dem Mobilgerät.
- Eine lokale Warteschlange kann später auch Fotos und weitere Erfassungen nach demselben Muster behandeln.

## Folgen

- Die mobile Anwendung benötigt eine offlinefähige App-Hülle und dauerhafte lokale Speicherung.
- Der lokale Speicher liegt in der durch Browser beziehungsweise installierte PWA verwalteten Sandbox. Die konkrete Umsetzung darf IndexedDB und/oder Origin Private File System verwenden, aber keinen gemeinsam sichtbaren Medien- oder Downloadordner.
- Übertragungszustand, Fehler und ausstehende Elemente müssen verständlich sichtbar sein.
- Die Synchronisierung benötigt stabile Kennungen und serverseitigen Duplikatschutz.
- Benutzer dürfen die App-Daten nicht löschen, solange noch nicht übertragene Aufnahmen bestehen; PlauderBox muss davor sichtbar warnen.

## OFFEN

- konkrete Wahl und Grenzen von IndexedDB beziehungsweise Origin Private File System,
- Speichergrenzen und maximale Aufnahmedauer auf den Zielgeräten,
- Verhalten von iOS und Android bei App-Wechsel, Energiesparen und Hintergrundsynchronisierung,
- Schutz lokaler Projektdaten auf dem Gerät,
- Konflikt- und Wiederherstellungsverhalten bei beschädigten oder manuell gelöschten App-Daten.
