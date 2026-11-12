---
typ: entscheid
id: E011
status: umgesetzt-testoffen
datum: 2026-11-11
anforderung: D011
---

# E011 – Rundgangsfreigabe für eine lokale Begehung sicher erneuern

## Ausgangslage

Eine PlauderBox-Begehung kann länger lokal bestehen als die zeitlich begrenzte HappyHour-Rundgangsfreigabe. Insbesondere ein Neustart der internen Testanwendung verliert den cachebasierten Token, während Punkte und Bilder korrekt im internen App-Speicher erhalten bleiben. Ein Verwerfen und erneutes Erfassen wäre fachlich falsch und könnte lokale Beweismittel verlieren.

## Entscheid

Am Abschluss kann der Mitarbeiter bewusst `Freigabe erneuern` wählen und einen neu in HappyHour ausgestellten QR-Code scannen. PlauderBox lädt den zugehörigen Kontext über die bestehende Servergrenze und akzeptiert die Freigabe ausschliesslich, wenn die Protokoll-ID exakt der lokalen Begehung entspricht.

Die Erneuerung ersetzt nur den opaken Freigabetoken. Lokaler Protokollkontext, Einträge, Audio, Bilder, Zustände und Zeitstempel der fachlichen Übergabe bleiben unverändert. Der neue Token wird erst nach erfolgreichem IndexedDB-Commit kanonisch. Bei fremdem Protokoll, ungültigem Code, Netzwerk- oder Speicherfehler bleibt die bisherige Begehung vollständig unverändert.

## Folgen

- Eine abgelaufene Freigabe erzwingt keine Neuerfassung.
- Ein QR-Code kann keine lokale Begehung unbemerkt auf ein anderes Protokoll umlenken.
- Die Funktion erweitert weder Scope noch Laufzeit der alten Freigabe; HappyHour muss bewusst eine neue Freigabe ausstellen.
- Protokollabschluss und Versand bleiben HappyHour vorbehalten.

## Verknüpfungen

- [[D011 - Mobile Begehung vollständig lokal durchführen]]
- [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]]
- [[T009 - Idempotente HappyHour-Bildübergabe prüfen]]
