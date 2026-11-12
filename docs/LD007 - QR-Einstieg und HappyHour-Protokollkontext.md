---
typ: loesungsdokumentation
id: LD007
status: lokal-umgesetzt-nicht-mobil-abgenommen
datum: 2026-11-10
---

# LD007 – QR-Einstieg und HappyHour-Protokollkontext

## Gültiger lokaler Stand

PlauderBox startet mit Ansicht 1 `Code scannen`. `BrowserQrCodeScanner` kapselt `BarcodeDetector` und `getUserMedia`, bevorzugt die rückseitige Kamera und beendet den Medienstream nach Erkennung, Abbruch oder Verlassen der Ansicht.

Der Browser prüft den QR-Inhalt mit `leseHappyHourBegehungsfreigabe`. Er übernimmt nur einen 32 bis 128 Zeichen langen URL-sicheren Token aus `plauderbox://begehung?freigabe={Token}`. Der Datenabruf erfolgt ausschliesslich über `GET /api/happyhour/freigaben/{Token}` derselben PlauderBox-Instanz. Der QR-Code enthält keine Serveradresse und keine Protokoll-ID.

Die serverseitige Klasse `HappyHourFreigabeQuelle` verwendet nur die konfigurierte Einstellung `PlauderBox:HappyHour:Basisadresse` und ruft ausschliesslich `api.svc/PlauderBox/Freigabe/{escaped Token}` auf. Automatische HTTP-Weiterleitungen sind deaktiviert. Ungültige, abgelaufene oder widerrufene Freigaben werden gemeinsam als nicht mehr verwendbar behandelt. Provider-DTOs werden im Datenmanagement in den bestehenden Kontextvertrag der Logik übersetzt. Ansicht 2 zeigt den gelesenen Kontext und startet nach bewusster Aktion die lokal gespeicherte Begehung gemäss [[LD008 - Mobile Begehungsführung mit Offline-Warteschlange]].

Da der opake Token technisch im URL-Pfad steht, werden ASP.NET-Hosting-/Kestrel-Requestlogs für die betroffenen Kategorien auf `Warning` begrenzt und die Standardlogger des HappyHour-HttpClients entfernt. `RundgangsfreigabeToken.ToString()` gibt ausschliesslich einen redigierten Platzhalter zurück. Der automatisierte Lauf in [[T007 - Vollständigen mobilen Begehungsablauf prüfen]] weist nach, dass ein markierter Token nicht in den Anwendungslogs erscheint.

Das Deploy-Testartefakt `deploy/delphi01-test/compose.yaml` setzt die Basisadresse auf `http://localhost:8081` auf Delphi01. Ein vom Entwicklungsrechner aufgebauter verschlüsselter SSH-Reverse-Tunnel leitet Delphi01 `127.0.0.1:8081` an den HappyHour-Listener `127.0.0.1:8081` weiter. Die gleiche Portnummer erzeugt den von HappyHour erwarteten Hostheader; der Tunneltest erreichte den Freigabeendpunkt mit der erwarteten Antwort `404` und `Cache-Control: no-store`. Es wird kein HappyHour-Port im LAN geöffnet. Der Zugriff bleibt durch den opaken Rundgangsfreigabe-Token fachlich begrenzt; Browser und QR-Code kennen die Zieladresse nicht. Der Reverse-Tunnel ist kein Produktivmuster. Ein Produktivbetrieb verlangt eine direkte HTTPS-Basisadresse mit vertrauenswürdigem Zertifikat.

## Relevante Dateien

| Verantwortung | Datei |
|---|---|
| QR-Kamera | `src/PlauderBox.UI.Client/src/services/qrCodeScanner.ts` |
| QR-Prüfung und UI-Vertrag | `src/PlauderBox.UI.Client/src/services/happyHourProtokollKontext.ts` |
| Ansicht 1 | `src/PlauderBox.UI.Client/src/components/QrCodeStart.vue` |
| Ansicht 2 | `src/PlauderBox.UI.Client/src/components/BegehungStart.vue` |
| Fachvertrag | `src/PlauderBox.Logik/HappyHourProtokollKontext.cs` |
| Providerzugriff und Mapping | `src/PlauderBox.Datenmanagement/HappyHourFreigabeQuelle.cs` |
| HTTP-Grenze und Konfiguration | `src/Program.cs`, `src/appsettings.json` |
| Delphi01-Testkonfiguration | `deploy/delphi01-test/compose.yaml`, `deploy/delphi01-test/README.md` |

## Grenzen

- Die HappyHour-Basisadresse ist im Delphi01-Testartefakt gesetzt; das Artefakt wurde in diesem Arbeitsschritt nicht bereitgestellt.
- Die Erreichbarkeit des internen HappyHour-Testhosts ab Delphi01 ist noch nicht nachgewiesen.
- Ein echter Scan auf Android und ein echter Abruf mit einer von HappyHour ausgestellten Freigabe sind noch nicht durchgeführt.
- Es erfolgte kein Deployment auf Delphi01.

## Nachweis

TypeScript-Typecheck, Frontendtests, Vue-Produktionsbuild und .NET-Release-Build sind lokal bestanden. Der genaue Lauf ist in [[T006 - QR-Einstieg und Protokollkontext prüfen]] festgehalten.
