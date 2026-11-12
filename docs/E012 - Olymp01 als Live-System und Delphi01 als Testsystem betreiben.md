# E012 – Olymp01 als Live-System und Delphi01 als Testsystem betreiben

## Entscheid

PlauderBox wird produktiv unter `https://plauderbox.routil.ch` auf Olymp01 betrieben. Delphi01 bleibt die davon getrennte Testumgebung.

Der Live-Container erhält keine Hostports. Der bestehende Caddy auf Olymp01 beendet öffentliches TLS auf TCP 443 und erreicht PlauderBox über ein dediziertes internes PlauderBox-Proxy-Netz. Für ausgehende Verbindungen zu OpenAI und HappyHour besitzt PlauderBox ein eigenes Egress-Netz mit festgelegter Gateway-Priorität. Schlüssel liegen ausschliesslich als geschützte Serverdatei vor und werden weder in Image, Git noch Compose gespeichert. Kostenpflichtige KI-Aufrufe sind zusätzlich zu Origin- und Ratenbegrenzung zwingend an eine serverseitig bestätigte HappyHour-Rundgangsfreigabe gebunden.

## Abgrenzung

Die Live-Bereitstellung von PlauderBox veröffentlicht keine HappyHour-Änderungen. Die produktive Kopplung wird erst als funktionsfähig bezeichnet, wenn die HappyHour-seitigen Freigabe-, Protokollpunkt- und Bildendpunkte separat produktiv freigegeben, bereitgestellt und geprüft sind.

## Verknüpfungen

- [[LD011 - PlauderBox Livebetrieb auf Olymp01]]
- [[T010 - PlauderBox Livebetrieb auf Olymp01 prüfen]]
