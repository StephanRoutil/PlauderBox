# Tagesprotokoll 11.11.2026

## Session – Pflichtfeld «Wer» konsistent normalisieren

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

### Bearbeitete Themen und Ergebnisse

Die Zuständigkeit `Wer` wird nun zentral gegen den aktuellen HappyHour-Verteiler normalisiert. Ein im Verteiler gültiger Kandidat bleibt erhalten. Ist er ungültig oder fehlt er, wird nur bei genau einer eindeutig als Protokollschreiber markierten Projektansprechpartner-ID diese verwendet; andernfalls bleibt die Zuständigkeit leer. Die Regel gilt für vorbereitete Protokollpunkte, neue protokollbezogen erzeugte Einträge, alte Begehungen beim Wiederanlauf, Legacy-Importe, lokale Commits und die HappyHour-Übergabegrenze. Doppelte Verteilerzeilen mit derselben Projektansprechpartner-ID erscheinen im Feld `Wer` nur einmal.

Die Übergabe-Allowlist dokumentiert `Wer` ausdrücklich als `intProjektAnsprechpartnerFKID`. Die Serververtragsprüfung weist den Wert `0` weiterhin als ungültig ab. D012, E008, LD009, T008 und der übergreifende Testnachweis T007 wurden auf den gültigen Stand gebracht.

### Qualitätsnachweis

Der vollständige Prüflauf bestand TypeScript-Typecheck, 51 Frontendtests in acht Dateien, Vue-Produktionsbuild mit 38 Modulen, .NET-Release-Build mit 0 Warnungen und 0 Fehlern, Provider-/Vertragstests, Offline-App-Shell und Token-Logschutz.

### Offene Punkte und nächster Schritt

Es erfolgte kein Deployment. Als nächster Schritt ist der aktualisierte Stand durch den unabhängigen Quality-Agent zu prüfen; danach kann eine ausdrücklich freigegebene Testbereitstellung erfolgen.

## Session – Zuständigkeit in HappyHour real bestätigt

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

### Ergebnis

Der End-to-End-Nachweis mit Protokoll 378 wurde in HappyHour fachlich kontrolliert. Das Protokoll zeigt vier Punkte. Zwei bestehende Punkte wurden per `UPDATE` mit Stephan als `Wer` aktualisiert. Zwei neue Punkte wurden per `INSERT` mit Tanja beziehungsweise Stephan als `Wer` angelegt. Damit ist die Übergabe von `intProjektAnsprechpartnerFKID` für beide Schreibpfade real bestätigt.

Bilder blieben wie vereinbart lokal. Bei einem der neuen Punkte ist in HappyHour kein Dokument erfasst. Die Dokumentation behauptet daher weiterhin keine Bild- oder Dokumentübertragung. Der echte Wiederholungsfall mit denselben GUIDs und ein Teilabbruch mit anschliessender Wiederaufnahme bleiben offen.

### Geänderte Dokumente und nächster Schritt

LD009 und T008 wurden um den realen Nachweis ergänzt. Es erfolgten keine Codeänderung und kein Deployment. Als nächster Schritt bleiben Wiederholungs-, Teilabbruch- und Konfliktnegativfälle gegen echte Testdaten.

## Session – Kamera, Galerie und einmalige Bildsicherung

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

### Entscheid und Umsetzung

Mit E009 wurde entschieden, Kamera und Galerie getrennt anzubieten und alle Rundgangsbilder am Abschluss mit genau einer bewussten Aktion als einzelne Dateien extern zu sichern. Ein ZIP und wiederholtes Antippen pro Bild sind ausgeschlossen. Bei unterstütztem Web Share werden alle Dateien gemeinsam übergeben; andernfalls startet dieselbe Aktion alle Einzel-Downloads. Interne Bildkopien und der HappyHour-Vertrag bleiben unverändert.

`EintragErfassen.vue`, `BegehungAbschluss.vue`, `bildSicherung.ts`, D011, E007, LD008 und T007 wurden entsprechend ergänzt. Nach dem ersten Quality-Befund bleiben Ablehnungen ungültiger oder über 15 MB grosser Dateien auch bei einer gemischten Auswahl sichtbar. 59 Frontendtests in neun Dateien, Typecheck, Vue-Build mit 39 Modulen, .NET-Build ohne Warnungen oder Fehler, PWA-, Vertrags- und Tokenlogprüfung sind bestanden. Der Quality-Nachreview gab den Stand frei.

Das Image `sha256:f7f1d60381dd…` wurde auf Delphi01 bereitgestellt. HTTPS, KI-Status und das ausgelieferte Foto-Frontend wurden geprüft; der vorherige Stand ist als `plauderbox:delphi01-test-before-fotosicherung` gesichert. Die reale Mobilgeräteabnahme von Kamera, Galerie, Web Share und Mehrfachdownloads bleibt offen.

## Session – Bilder kontrolliert an HappyHour übergeben

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

### Entscheid und Umsetzung

D013 und E010 ergänzen die bestehende Punktübergabe um einen nachgelagerten, idempotenten Bildvertrag. PlauderBox ordnet die vollständige Punktantwort den lokalen Einträgen zu und sendet danach jedes Bild einzeln mit stabiler Bild-GUID. Erst nach Bestätigung sämtlicher Bilder wird die Begehung als übertragen markiert; bei Fehlern bleibt der lokale Stand vollständig erhalten.

Der PlauderBox-Server begrenzt Bilder auf 15 MB, 500 Anfragen je Stunde und Quelladresse. HappyHour verwendet den eigenen Scope `bilder_schreiben`, verlangt Dokument-Neurecht und begrenzt jede Freigabe auf 500 Bildversuche beziehungsweise 2 GB. Die Ablage erfolgt als `tblDokument` unter `App_Data/Dokumente/{MandantID}/Protokollpunkt/{ID}`. Punkt und Entwurfsstatus bleiben während der Dokumentablage gesperrt; Datei- und Commitfehler werden kompensiert. HEIC und WebP werden bereits bei der Auswahl verständlich abgewiesen.

### Qualitätsnachweis und offen

Der vollständige PlauderBox-Prüflauf ist mit 63 Frontendtests, Typecheck, Vue-Build, .NET-Build ohne Warnungen oder Fehler, PWA-, Vertrags- und Tokenlogprüfung bestanden. Die 429-Abbildung für ein ausgeschöpftes Bildkontingent ist im Provider- und UI-Test nachgewiesen. HappyHour ist vollständig ohne neue Compilerfehler vorkompiliert; die statische Bildvertragsprüfung ist grün. Das erste Quality-Review verweigerte die Freigabe wegen Rechte-, Race-, Kontingent-, Format- und Dokumentationslücken; diese Befunde wurden korrigiert und im unabhängigen Nachreview freigegeben. Die reale mobile Bildabnahme ist noch offen.

Der erste direkte HappyHour-Aufruf deckte eine WCF-Besonderheit auf: `HttpRequest.Files` war nach dem bufferlosen WCF-Body nicht mehr verfügbar. Der Vertrag verwendet deshalb nun einen reinen Streambody; PlauderBox wandelt nur die Server-zu-Server-Strecke von Multipart auf Rohdaten um. Vollprüfungen blieben grün. Das korrigierte Image `sha256:67c6b0c823a2…` läuft auf Delphi01, der ungültige Tokenpfad ist direkt mit 404 und durch PlauderBox mit 410 bestanden. Die reale mobile Ablage bleibt offen.

### Fehlerbefund und Nachlieferung

Der erste reale Mobiltest legte die Protokollpunkte an, aber kein Bild. Die Serverprotokolle zeigten keinen einzigen Browseraufruf des Bildendpunkts. Gleichzeitig sperrte die Abschlussansicht eine bereits als punktseitig übertragen markierte Begehung und behauptete noch, Bilder blieben lokal. Die Korrektur führt deshalb `bilderUebertragenAm` als eindeutige vollständige Bildbestätigung ein. Eine ältere punktseitig übertragene Begehung darf ihre Punkte idempotent erneut bestätigen lassen und danach die weiterhin lokalen Bilder nachliefern. Die Oberfläche zeigt dafür «Bilder an HappyHour nachliefern»; erst eine bestätigte Bildübergabe sperrt weitere Versuche. Die lokalen Bilder bleiben erhalten.

Typecheck, 65 Frontendtests in neun Dateien, Vue-Produktionsbuild, .NET-Release-Build ohne Warnungen oder Fehler, Vertragstests, Offline-App-Shell und Token-Logschutz sind bestanden. Der Quality-Agent gab den Stand ohne P1-, P2- oder P3-Befund frei. Image `sha256:6a966c2aa0bc…` wurde mit gesichertem Rückfallstand auf Delphi01 aktiviert. HTTPS-Status, KI-Bereitschaft, neuer Service-Worker-Cache und die beiden Frontendmerkmale für Nachlieferung und Bildbestätigung sind geprüft. Offen bleibt der mobile Nachweis mit dem bestehenden lokalen Rundgang.

## Tagesgesamtzeit

Nicht zuverlässig bestimmbar.

## Session – Freigabe einer lokalen Begehung erneuern

- **Startzeit:** nicht zuverlässig bestimmbar
- **Endzeit:** nicht zuverlässig bestimmbar
- **Dauer:** nicht zuverlässig bestimmbar

Für den noch lokal gespeicherten Rundgang zu Protokoll 379 wurde eine sichere Freigabeerneuerung ergänzt. Die Abschlussansicht scannt einen neuen QR-Code, akzeptiert ihn nur für dieselbe Protokoll-ID und ersetzt ausschliesslich den Token nach erfolgreichem IndexedDB-Commit. Punkte, Bilder und Abschlussstatus bleiben erhalten; ein fremdes Protokoll und ein Commitfehler sind negativ getestet. Ein Quality-Befund zur verdeckten Scannerfehlermeldung wurde mit testbarem Scanner-Ablauf korrigiert und im Nachreview freigegeben. D011, E011, LD008 und T009 wurden verknüpft. Der vollständige Prüflauf bestand 67 Frontendtests, Typecheck, Vue- und .NET-Build, Offline-, Vertrags- und Tokenlogprüfung. Deployment, mobile Erneuerung und reale Bildablage bleiben offen.

## Session – Livebetrieb auf Olymp01 einrichten

- **Startzeit, Endzeit und Dauer:** nicht zuverlässig bestimmbar

PlauderBox wurde als gehärtetes R4-Image auf Olymp01 ohne Hostport bereitgestellt. Der bestehende Caddy bindet die Anwendung dauerhaft über das dedizierte interne Netz `plauderbox_proxy` an und liefert `https://plauderbox.routil.ch` mit einem öffentlichen Let's-Encrypt-Zertifikat aus. Vorher wurden Caddy und Compose gesichert; alle Kandidaten sowie der vollständige lokale Prüflauf waren grün. Der Quality-Agent erteilte die Freigabe ohne offenen P1–P3-Befund. Öffentliche App-, Status-, Manifest- und Service-Worker-Prüfungen sowie die negativen Origin-/Tokenfälle bestanden. n8n, FileBox und Datenbanken blieben unverändert; nur Caddy wurde wegen `admin off` gezielt neu erstellt.

**OFFEN:** Der produktive HappyHour-Endpunkt leitet weiterhin zur Anmeldung um. Die Live-App ist erreichbar, produktive QR-Begehungen benötigen jedoch noch die separate Veröffentlichung und End-to-End-Abnahme der HappyHour-API. E012, LD011 und T010 dokumentieren Entscheid, Zielstand und Laufzeitnachweis.
