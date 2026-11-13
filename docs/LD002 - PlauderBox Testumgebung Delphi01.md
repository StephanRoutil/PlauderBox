---
typ: loesungsdokumentation
id: LD002
status: testbetrieb
datum: 2026-11-13
---

# LD002 – PlauderBox-Testumgebung Delphi01

> **Gültigkeitsvermerk vom 13.11.2026:** Die Testumgebung läuft mit dem Usability-Korrekturstand `ec65e60` und verbindet sich direkt mit `https://test.siwako.ch`. Kontrollierte Protokollpunkte und Bilder werden gemäss [[LD009 - Kontrollierte Protokollpunkte an HappyHour übergeben]] und [[LD010 - Begehungsbilder kontrolliert an HappyHour übertragen]] geschrieben. HappyHour-Abschluss und Versand bleiben ausgeschlossen.

## Gültiger Stand

PlauderBox läuft als getrennte Testumgebung auf Delphi01. FileBox und der zentrale PostgreSQL-Dienst wurden nicht verändert. Die Anwendung ist ausschliesslich im internen Netz über HTTPS erreichbar; es bestehen kein öffentlicher DNS-Eintrag und keine öffentliche Weiterleitung.

## Bereitstellung

| Bestandteil | Stand |
|---|---|
| Quellstand | Commit `ec65e600699eb19b070b04bd8a4d6e9a8044a684` |
| Anwendungsimage | `plauderbox:delphi01-test-ec65e60` |
| Image-ID | `sha256:5ffe84fd1c593751d8bda2614cdd3d31d11f88c7996c083c25746d286ef634cd` |
| Rückfallimage | vorheriger Stand `plauderbox:delphi01-test-20261110-full` |
| Laufende Ablage | `/home/zeus/plauderbox-test-vorbereitung` |
| Anwendungslistener | `127.0.0.1:5187` auf Delphi01 |
| Interner HTTPS-Zugriff | `https://192.168.68.8` |
| Zertifikatsdownload | `http://192.168.68.8:8080/delphi01-root.crt` |
| Android-Zertifikat | `http://192.168.68.8:8080/delphi01-android.cer`, DER-Format |
| Anwendung | eigener PlauderBox-Container, unprivilegierter Benutzer |
| HTTPS | eigener Caddy-Container mit interner CA |
| Persistenz | keine serverseitige Datenbank; Begehung, Bilder, Audio und Warteschlange liegen im app-eigenen IndexedDB-Speicher des Mobilgeräts |

Die OpenAI-Testschlüsseldatei wurde nach ausdrücklicher Freigabe ausschliesslich unter `secrets/openai.json` auf Delphi01 abgelegt. Verzeichnisberechtigung `700`, Dateiberechtigung `600`. Schlüsselwerte wurden weder ausgegeben noch in Git oder Image aufgenommen.

## Erfolgreiche Prüfungen

- TypeScript-, Vue-, .NET-, Vertrags-, Offline-App-Shell-, Tokenlog- und Docker-Buildkontextprüfungen lokal bestanden.
- Vollständiges Linux-Docker-Image aus Commit `ec65e60` einschliesslich der TypeScript-Logikschicht erfolgreich gebaut; der aktuelle Stand ist `plauderbox:delphi01-test-ec65e60`, ID `sha256:5ffe84fd1c59…`.
- Anwendungscontainer aus `/home/zeus/plauderbox-test-vorbereitung` in `Production` erfolgreich ersetzt; der bestehende HTTPS-Container blieb unverändert. Der unmittelbar vorherige Anwendungsstand bleibt bis zur Mobilabnahme als Rückfallimage erhalten.
- Anwendung bindet nur an Delphi01-Loopback.
- Root, PWA-Manifest, Service Worker sowie die gebauten JavaScript- und CSS-Assets liefern über internes HTTPS Status 200; das Manifest besitzt den korrekten MIME-Typ.
- `/api/v1/status` meldet die KI-Anbindung als bereit.
- Delphi01 erreicht `https://test.siwako.ch` direkt. Ein synthetischer ungültiger HappyHour-Freigabe-Token liefert über die PlauderBox-API erwartungsgemäss Status 410.
- Ein markierter Dummy-Token erscheint nicht im Containerlog.
- Download des öffentlichen Caddy-Stammzertifikats liefert HTTP 200.
- QR-Codes für Zertifikatsdownload und Testanwendung lokal erzeugt.
- FileBox und der zentrale PostgreSQL-Dienst blieben unverändert.

## Bedienung vom Handy

Das Handy muss sich im internen WLAN befinden. Zuerst wird das Caddy-Stammzertifikat geladen, installiert und als vertrauenswürdig aktiviert. Danach wird `https://192.168.68.8` geöffnet. Ohne bestätigtes Zertifikatsvertrauen behandelt der mobile Browser die Seite nicht als sicheren Kontext und kann den Mikrofonzugriff blockieren.

## OFFEN

- vollständige Mobilgeräteabnahme des aktuellen Begehungsablaufs einschliesslich getrennter Kamera-/Galerieauswahl, Einmal-Sicherung vieler Einzelbilder, Mikrofon, Offline-Neustart und Warteschlange,
- serverpersistente Idempotenz beziehungsweise Duplikatschutz für Transkriptionsaufträge; die stabile `erfassungsId` wird aktuell validiert, aber nicht serverseitig persistent gespeichert,
- Verschieben der laufenden Ablage nach `/srv/docker/plauderbox-test`; dies benötigt eine interaktive `sudo`-Bestätigung,
- Start nach Host-Neustart praktisch prüfen,
- Caddy-Stammzertifikat und Schlüssel in die spätere Sicherungsregel aufnehmen,
- reale mobile End-to-End-Abnahme der Bildübergabe gegen `test.siwako.ch`; PlauderBox schliesst oder versendet weiterhin kein Protokoll.

## Verknüpfungen

- [[D004 - Testbereitstellung auf Delphi01 vorbereiten]]
- [[LD001 - Lokaler Aufnahmeprototyp mit OpenAI-Transkription]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
- [[T007 - Vollständigen mobilen Begehungsablauf prüfen]]
