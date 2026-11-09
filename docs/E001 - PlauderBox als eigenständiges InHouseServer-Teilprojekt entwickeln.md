---
typ: entscheid
id: E001
status: entschieden
datum: 2026-11-09
---

# E001 – PlauderBox als eigenständiges InHouseServer-Teilprojekt entwickeln

## Ausgangslage

Die fachliche Idee der sprachgestützten Projektdokumentation entstand im HappyHour-Projekt. Das Werkzeug soll jedoch eigenständig betrieben, unabhängig aktualisiert und später als Container auf `olymp01` bereitgestellt werden können.

## Entscheid

PlauderBox wird analog FileBox als eigenständiges Teilprojekt unter `InHouseServer/PlauderBox` entwickelt.

- Quellcode, technische Anforderungen, Tests und Betriebsartefakte von PlauderBox werden hier gepflegt.
- Fachliche HappyHour-Anforderungen und HappyHour-seitige Schnittstellenänderungen verbleiben im HappyHour-Repository.
- Informationen werden nicht dupliziert, sondern projektübergreifend referenziert.

## Folgen

- Der erste Prototyp besitzt keine HappyHour-Abhängigkeit.
- Eine spätere Verbindung benötigt einen ausdrücklich definierten Schnittstellenvertrag.
- Produktive Container-, Caddy-, DNS-, Firewall- und Netzwerkänderungen bleiben einem eigenen Auftrag vorbehalten.

