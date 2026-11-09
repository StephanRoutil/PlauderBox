---
typ: loesungsdokumentation
id: LD002
status: testbetrieb
datum: 2026-11-09
---

# LD002 – PlauderBox-Testumgebung Delphi01

## Gültiger Stand

PlauderBox läuft als getrennte Testumgebung auf Delphi01. FileBox und der zentrale PostgreSQL-Dienst wurden nicht verändert. Die Anwendung ist ausschliesslich im internen Netz über HTTPS erreichbar; es bestehen kein öffentlicher DNS-Eintrag und keine öffentliche Weiterleitung.

## Bereitstellung

| Bestandteil | Stand |
|---|---|
| Quellstand | GitHub `main`, Commit `a9db0c8` |
| Anwendungsimage | `plauderbox:delphi01-test-20261109` |
| Image-ID | `sha256:4e98c9a8010a…` |
| Laufende Ablage | `/home/zeus/plauderbox-test-vorbereitung` |
| Anwendungslistener | `127.0.0.1:5187` auf Delphi01 |
| Interner HTTPS-Zugriff | `https://192.168.68.8` |
| Zertifikatsdownload | `http://192.168.68.8:8080/delphi01-root.crt` |
| Anwendung | eigener PlauderBox-Container, unprivilegierter Benutzer |
| HTTPS | eigener Caddy-Container mit interner CA |
| Datenbank | keine; der aktuelle Prototyp persistiert nichts |

Die OpenAI-Testschlüsseldatei wurde nach ausdrücklicher Freigabe ausschliesslich unter `secrets/openai.json` auf Delphi01 abgelegt. Verzeichnisberechtigung `700`, Dateiberechtigung `600`. Schlüsselwerte wurden weder ausgegeben noch in Git oder Image aufgenommen.

## Erfolgreiche Prüfungen

- Visual-Studio-Solution und Prototyptest lokal ohne Fehler oder Warnungen.
- Docker-Image auf Delphi01 aus dem veröffentlichten Git-Stand gebaut.
- Anwendungs- und HTTPS-Container gestartet.
- Anwendung bindet nur an Delphi01-Loopback.
- HTTPS-Aufruf vom Arbeitsplatz erfolgreich.
- `/api/status` meldet KI-Bereitschaft und Modell `gpt-transcribe`.
- Download des öffentlichen Caddy-Stammzertifikats liefert HTTP 200.
- QR-Codes für Zertifikatsdownload und Testanwendung lokal erzeugt.

## Bedienung vom Handy

Das Handy muss sich im internen WLAN befinden. Zuerst wird das Caddy-Stammzertifikat geladen, installiert und als vertrauenswürdig aktiviert. Danach wird `https://192.168.68.8` geöffnet. Ohne bestätigtes Zertifikatsvertrauen behandelt der mobile Browser die Seite nicht als sicheren Kontext und kann den Mikrofonzugriff blockieren.

## OFFEN

- echter Mikrofon- und Transkriptionstest auf dem Zielhandy,
- Verschieben der laufenden Ablage nach `/srv/docker/plauderbox-test`; dies benötigt eine interaktive `sudo`-Bestätigung,
- Start nach Host-Neustart praktisch prüfen,
- Caddy-Stammzertifikat und Schlüssel in die spätere Sicherungsregel aufnehmen,
- Vue-/PWA-Migration und Offlinewarteschlange sind noch nicht umgesetzt.

## Verknüpfungen

- [[D004 - Testbereitstellung auf Delphi01 vorbereiten]]
- [[LD001 - Lokaler Aufnahmeprototyp mit OpenAI-Transkription]]
- [[E002 - Aufnahmen offline sichern und später transkribieren]]
