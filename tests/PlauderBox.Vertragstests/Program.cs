using System.Net;
using System.Text;
using System.Text.Json;
using PlauderBox.Datenmanagement;
using PlauderBox.Logik;

await PruefeLogikAsync();
await PruefeHappyHourProviderAsync();
await PruefeHappyHourSchreibenAsync();
await PruefeHappyHourBildSchreibenAsync();
await PruefeKiSchemaAsync();
Console.WriteLine("PlauderBox-Vertragstests bestanden: serverseitige Erfassungs-ID, Token, HappyHour-Provider und striktes KI-Schema.");

static Task PruefeLogikAsync()
{
    Guid id = Guid.Parse("00000000-0000-4000-8000-000000000001");
    Pruefe(ErfassungsId.IstGueltig(id.ToString("D")), "Stabile GUID muss gültig sein.");
    Pruefe(!ErfassungsId.IstGueltig("keine-guid"), "Ungültige Erfassungs-ID wurde akzeptiert.");
    const string tokenwert = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    Pruefe(RundgangsfreigabeToken.TryCreate(tokenwert, out RundgangsfreigabeToken? token) && token is not null, "Gültiger Token wurde abgewiesen.");
    Pruefe(!token!.ToString().Contains(tokenwert, StringComparison.Ordinal), "Token darf durch ToString nicht protokollierbar sein.");
    Pruefe(!RundgangsfreigabeToken.TryCreate("zu-kurz", out _), "Zu kurzer Token wurde akzeptiert.");
    ProtokollpunktUebergabeEintrag eintrag = new(id, null, 1, 77, "Brandschutz", "Türe", "Blockiert", null);
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [eintrag])) == BegehungUebergabePruefergebnis.Gueltig, "Vollständige Übergabe wurde abgewiesen.");
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "aktiv", [eintrag])) == BegehungUebergabePruefergebnis.EintragUngueltig, "Aktive Begehung wurde zur Übergabe akzeptiert.");
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [eintrag, eintrag])) == BegehungUebergabePruefergebnis.DoppelteErfassungsId, "Doppelte Erfassungs-ID wurde nicht erkannt.");
    ProtokollpunktUebergabeEintrag ohneZustaendigkeit = eintrag with { ProjektAnsprechpartnerId = 0 };
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [ohneZustaendigkeit])) == BegehungUebergabePruefergebnis.EintragUngueltig, "Zuständigkeits-ID 0 wurde akzeptiert.");
    return Task.CompletedTask;
}

static async Task PruefeHappyHourProviderAsync()
{
    const string token = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    const string json = """{"Protokoll":{"intProtokollID":378,"intProtokollNr":1,"strProtokoll":"Test","strProtokollTyp":"Protokoll","strProtokollStatus":"Entwurf","datProtokoll":"2026-11-10","Projekt":{"intProjektID":1,"decProjektNr":799,"strProjekt":"Test"},"Mitarbeiter":{"intMitarbeiterID":1,"strMitarbeiter":"Test"},"Traktanden":["Brandschutz"],"Verteiler":[{"intProtokollTeilnehmerID":7,"intProjektAnsprechpartnerFKID":77,"strPerson":"Testperson","strFunktion":"Protokollführung","blnTeilnehmer":true,"blnCC":false,"blnProtokollSchreiber":true}],"Protokollpunkte":[],"ProtokollpunktArten":[{"intProtokollpunktArtID":1,"strProtokollpunktArt":"Feststellung"}]},"strScope":"lesen protokollpunkte_schreiben","datAblaufUtc":"2026-11-11T00:00:00Z"}""";
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    HappyHourFreigabeQuelle quelle = new(new HttpClient(handler), new Uri("http://localhost:8081/"));
    HappyHourProtokollKontext kontext = await quelle.LadeAsync(token, CancellationToken.None);
    Pruefe(kontext.ProtokollId == 378 && kontext.Traktanden.Single() == "Brandschutz" && kontext.Verteiler.Single().ProjektAnsprechpartnerId == 77 && kontext.Verteiler.Single().IstProtokollschreiber, "HappyHour-Kontext wurde nicht korrekt gemappt.");
    Pruefe(handler.LetzteUri?.AbsolutePath == $"/api.svc/PlauderBox/Freigabe/{token}", "Provider darf nur den festen Freigabeendpunkt aufrufen.");
}

static async Task PruefeHappyHourSchreibenAsync()
{
    const string token = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    Guid erfassungsId = Guid.Parse("00000000-0000-4000-8000-000000000123");
    string json = $$"""{"intProtokollpunktID":41,"GUID":"{{erfassungsId:D}}","blnErstellt":true}""";
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    HappyHourFreigabeQuelle ziel = new(new HttpClient(handler), new Uri("http://localhost:8081/"));

    ProtokollpunktUebergabeErgebnis ergebnis = await ziel.SchreibeAsync(
        token,
        new ProtokollpunktUebergabeEintrag(erfassungsId, null, 1, 77, "Brandschutz", "Türe", "Blockiert", "VKF"),
        CancellationToken.None);

    Pruefe(handler.LetzteMethode == HttpMethod.Post, "Schreibvertrag muss POST verwenden.");
    Pruefe(handler.LetzteUri?.AbsolutePath == $"/api.svc/PlauderBox/Freigabe/{token}/Protokollpunkt", "Provider muss den eng begrenzten Schreibpfad verwenden.");
    using JsonDocument anfrage = JsonDocument.Parse(handler.LetzterInhalt!);
    Pruefe(anfrage.RootElement.GetProperty("GUID").GetGuid() == erfassungsId, "Erfassungs-GUID wurde nicht vertragsgetreu gesendet.");
    Pruefe(anfrage.RootElement.GetProperty("intProtokollpunktArtFKID").GetInt32() == 1, "Protokollpunktart fehlt.");
    Pruefe(anfrage.RootElement.GetProperty("intProjektAnsprechpartnerFKID").GetInt32() == 77, "Zuständige Person fehlt.");
    Pruefe(ergebnis.ProtokollpunktId == 41 && ergebnis.ErfassungsId == erfassungsId && ergebnis.Erstellt, "Schreibbestätigung wurde nicht korrekt gemappt.");
}

static async Task PruefeHappyHourBildSchreibenAsync()
{
    const string token = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    Guid bildId = Guid.Parse("10000000-0000-4000-8000-000000000001");
    string json = $$"""{"intProtokollpunktID":41,"GUID":"{{bildId:D}}","intDokumentID":91,"blnErstellt":true}""";
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    HappyHourFreigabeQuelle ziel = new(new HttpClient(handler), new Uri("http://localhost:8081/"));

    ProtokollpunktBildUebergabeErgebnis ergebnis = await ziel.SchreibeBildAsync(
        token,
        new ProtokollpunktBildUebergabe(bildId, 41, "foto.jpg", "image/jpeg", DateTimeOffset.Parse("2026-11-12T08:15:30.123Z"), [0xFF, 0xD8, 0xFF, 0xD9]),
        CancellationToken.None);
    Pruefe(handler.LetzteMethode == HttpMethod.Post, "Bildvertrag muss POST verwenden.");
    Pruefe(handler.LetzteUri?.AbsolutePath == $"/api.svc/PlauderBox/Freigabe/{token}/Protokollpunkt/41/Bild/{bildId:D}", "Provider muss den gebundenen Bildpfad verwenden.");
    Pruefe(Uri.UnescapeDataString(handler.LetzteUri?.Query ?? string.Empty).Contains("aufnahmezeitpunkt=2026-11-12T08:15:30.123", StringComparison.Ordinal), "Aufnahmezeitpunkt wurde nicht vertragsgetreu gesendet.");
    Pruefe(ergebnis.BildId == bildId && ergebnis.ProtokollpunktId == 41 && ergebnis.DokumentId == 91 && ergebnis.Erstellt, "Bildbestätigung wurde nicht korrekt gemappt.");

    AufzeichnenderHandler kontingentHandler = new(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests));
    HappyHourFreigabeQuelle kontingentZiel = new(new HttpClient(kontingentHandler), new Uri("http://localhost:8081/"));
    try
    {
        await kontingentZiel.SchreibeBildAsync(
            token,
            new ProtokollpunktBildUebergabe(bildId, 41, "foto.jpg", "image/jpeg", DateTimeOffset.Parse("2026-11-12T08:15:30.123Z"), [0xFF, 0xD8, 0xFF, 0xD9]),
            CancellationToken.None);
        throw new InvalidOperationException("HTTP 429 wurde nicht als Bildkontingentfehler erkannt.");
    }
    catch (HappyHourBildkontingentException)
    {
    }
}

static async Task PruefeKiSchemaAsync()
{
    const string antwort = """{"output":[{"content":[{"type":"output_text","text":"{\"gruppe\":\"Brandschutz\",\"thema\":\"Türe\",\"inhalt\":\"Blockiert\",\"rechtsverweis\":\"\"}"}]}]}""";
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(antwort, Encoding.UTF8, "application/json") });
    HttpClient client = new(handler) { BaseAddress = new Uri("https://api.openai.test/v1/") };
    OpenAiProtokollpunktStrukturierer strukturierer = new(client, "test-key", "test-model");
    ProtokollpunktStrukturierung ergebnis = await strukturierer.StrukturierenAsync("Gruppe Brandschutz", CancellationToken.None);
    Pruefe(ergebnis.Gruppe == "Brandschutz" && ergebnis.Inhalt == "Blockiert", "KI-Antwort wurde nicht gemappt.");
    using JsonDocument anfrage = JsonDocument.Parse(handler.LetzterInhalt!);
    JsonElement format = anfrage.RootElement.GetProperty("text").GetProperty("format");
    JsonElement schema = format.GetProperty("schema");
    Pruefe(format.GetProperty("strict").GetBoolean(), "KI-Schema muss strikt sein.");
    Pruefe(!schema.GetProperty("additionalProperties").GetBoolean(), "Zusätzliche KI-Felder müssen verboten sein.");
    string[] eigenschaften = schema.GetProperty("properties").EnumerateObject().Select(e => e.Name).Order().ToArray();
    Pruefe(eigenschaften.SequenceEqual(new[] { "gruppe", "inhalt", "rechtsverweis", "thema" }), "KI-Schema darf insbesondere kein Ort-Feld enthalten.");
}

static void Pruefe(bool bedingung, string meldung) { if (!bedingung) throw new InvalidOperationException(meldung); }

sealed class AufzeichnenderHandler(Func<HttpRequestMessage, HttpResponseMessage> antwort) : HttpMessageHandler
{
    public Uri? LetzteUri { get; private set; }
    public HttpMethod? LetzteMethode { get; private set; }
    public string? LetzterInhalt { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) { LetzteUri = request.RequestUri; LetzteMethode = request.Method; LetzterInhalt = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken); return antwort(request); }
}
