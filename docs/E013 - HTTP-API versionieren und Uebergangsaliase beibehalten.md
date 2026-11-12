# E013 – HTTP-API versionieren und Übergangsaliase beibehalten

## Status

Entschieden am 12.11.2026 durch Stephan Routil.

## Ausgangslage

Installierte PlauderBox-PWAs können nach einer Serveraktualisierung noch einen älteren App-Shell aus dem lokalen Cache verwenden. Ein sofortiges Entfernen der bisherigen Pfade unter `/api/...` könnte deshalb laufende oder offline vorbereitete Begehungen unterbrechen.

## Entscheid

- Der aktuelle HTTP-Vertrag wird unter `/api/v1/...` bereitgestellt.
- Der PlauderBox-Client verwendet ausschliesslich `/api/v1/...`.
- Die bisherigen Pfade unter `/api/...` bleiben als technisch gleichwertige Übergangsaliase bestehen.
- Die Aliase bleiben mindestens 90 Tage ab dem 12.11.2026 und mindestens zwei produktive PlauderBox-Releases erhalten. Massgeblich ist der später eintretende Zeitpunkt.
- Eine Entfernung der Aliase erfolgt nicht automatisch, sondern erst nach einem eigenen Entscheid und einem Nachweis, dass keine unterstützte PWA-Version sie mehr verwendet.

## Folgen

Routen, HTTP-Statuscodes, JSON-Feldnamen, deutsche Meldungstexte und Sicherheitsgrenzen bleiben identisch. Neue API-Änderungen innerhalb dieses Vertrags werden unter `v1` kompatibel gehalten; eine inkompatible Änderung benötigt eine neue Hauptversion und einen eigenen Entscheid.

## Nachweis

- `src/Endpunkte/HappyHourEndpunkte.cs`
- `src/Endpunkte/TranskriptionsEndpunkte.cs`
- `tests/PlauderBox.Integrationstests/ServergrenzeTests.cs`
- Clientdienste unter `src/PlauderBox.UI.Client/src/services`
