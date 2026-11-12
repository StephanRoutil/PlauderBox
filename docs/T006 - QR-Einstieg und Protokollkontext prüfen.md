---
typ: test
id: T006
status: teilweise-bestanden
datum: 2026-11-10
anforderung: D010
---

# T006 – QR-Einstieg und Protokollkontext prüfen

## Automatisierter Lauf

- TypeScript-Typecheck: bestanden.
- Vitest: 15 Tests in 2 Dateien bestanden. Geprüft werden unter anderem QR-Tokenformat, Ablehnung zusätzlicher Parameter und fremder URLs, ausschliesslicher Abruf über die PlauderBox-Servergrenze, ungültige Kontextantwort sowie ungültige oder abgelaufene Freigaben.
- Vue-Produktionsbuild: bestanden.
- .NET-Solution im Release-Modus: bestanden, 0 Warnungen und 0 Fehler.
- Lokaler HTTP-Vertrag: Ein syntaktisch ungültiger Token liefert Status 410; ein gültig geformter Token liefert ohne konfigurierte HappyHour-Basisadresse erwartungsgemäss Status 503. Es wurde dabei keine externe Verbindung aufgebaut.

## Manuell zu prüfen

1. Auf einem repräsentativen Android-Gerät Kamera erlauben, QR-Code erfassen und Kameraabschluss prüfen.
2. Kameraberechtigung ablehnen und verständliche Meldung sowie erneuten Versuch prüfen.
3. Fremden beziehungsweise veränderten QR-Code scannen und Ablehnung prüfen.
4. Erreichbarkeit der konfigurierten HappyHour-Basisadresse ab Delphi01 prüfen.
5. Mit einer von HappyHour ausgestellten begrenzten Rundgangsfreigabe den vorgesehenen Protokollkontext laden und Kopfdaten, Verteiler, Gruppen und Punkte mit HappyHour vergleichen.

## Bewertung

Die lokalen Code-, Vertrags- und Buildprüfungen sind bestanden. Die manuellen Prüfschritte 1 bis 5 bleiben offen, weil der echte interne Datenabruf mit ausgestellter Freigabe und der Mobilgerätetest noch fehlen.
