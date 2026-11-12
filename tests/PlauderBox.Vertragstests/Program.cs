using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using PlauderBox.Datenmanagement;
using PlauderBox.Logik;
using PlauderBox.UI;
using PlauderBox.UI.Endpunkte;
using PlauderBox.UI.Sicherheit;

await PruefeLogikAsync();
await PruefeHappyHourProviderAsync();
await PruefeHappyHourSchreibenAsync();
await PruefeHappyHourBildSchreibenAsync();
await PruefeKiSchemaAsync();
await PruefeTranskriptionsdienstAsync();
await PruefeServerstrukturAsync();
await PruefeHappyHourFehlerabbildungAsync();
PruefeSchichtenarchitektur();
Console.WriteLine("PlauderBox-Vertragstests bestanden: serverseitige Erfassungs-ID, Token, HappyHour-Provider, Transkriptionsdienst und striktes KI-Schema.");

static Task PruefeLogikAsync()
{
    Guid id = Guid.Parse("00000000-0000-4000-8000-000000000001");
    Pruefe(ErfassungsId.IstGueltig(id.ToString("D")), "Stabile GUID muss gültig sein.");
    Pruefe(!ErfassungsId.IstGueltig("keine-guid"), "Ungültige Erfassungs-ID wurde akzeptiert.");
    const string tokenwert = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    Pruefe(RundgangsfreigabeToken.TryCreate(tokenwert, out RundgangsfreigabeToken? token) && token is not null, "Gültiger Token wurde abgewiesen.");
    Pruefe(!token!.ToString().Contains(tokenwert, StringComparison.Ordinal), "Token darf durch ToString nicht protokollierbar sein.");
    Pruefe(!RundgangsfreigabeToken.TryCreate("zu-kurz", out _), "Zu kurzer Token wurde akzeptiert.");
    Pruefe(Bildpruefung.IstGueltig("image/jpeg", [0xFF, 0xD8, 0xFF]), "JPEG-Signatur wurde abgewiesen.");
    Pruefe(Bildpruefung.IstGueltig("image/png", [0x89, 0x50, 0x4E, 0x47]), "PNG-Signatur wurde abgewiesen.");
    Pruefe(Bildpruefung.IstGueltig("image/gif", [0x47, 0x49, 0x46, 0x38]), "GIF-Signatur wurde abgewiesen.");
    Pruefe(Bildpruefung.IstGueltig("image/tiff", [0x49, 0x49, 0x2A, 0x00]), "TIFF-Signatur wurde abgewiesen.");
    Pruefe(!Bildpruefung.IstGueltig("image/png", [0xFF, 0xD8, 0xFF]), "Abweichender Bildinhalt wurde akzeptiert.");
    Pruefe(!Bildpruefung.IstGueltig("text/plain", [0x47, 0x49, 0x46, 0x38]), "Fremder Bildmedientyp wurde akzeptiert.");
    ProtokollpunktUebergabeEintrag eintrag = new(id, null, 1, 77, "Brandschutz", "Türe", "Blockiert", null);
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [eintrag]), 200) == BegehungUebergabePruefergebnis.Gueltig, "Vollständige Übergabe wurde abgewiesen.");
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "aktiv", [eintrag]), 200) == BegehungUebergabePruefergebnis.EintragUngueltig, "Aktive Begehung wurde zur Übergabe akzeptiert.");
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [eintrag, eintrag]), 200) == BegehungUebergabePruefergebnis.DoppelteErfassungsId, "Doppelte Erfassungs-ID wurde nicht erkannt.");
    ProtokollpunktUebergabeEintrag ohneZustaendigkeit = eintrag with { ProjektAnsprechpartnerId = 0 };
    Pruefe(BegehungUebergabePruefung.Pruefe(new BegehungUebergabeAnforderung(tokenwert, "lokal_abgeschlossen", [ohneZustaendigkeit]), 200) == BegehungUebergabePruefergebnis.EintragUngueltig, "Zuständigkeits-ID 0 wurde akzeptiert.");
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
        new ProtokollpunktBildUebergabe(bildId, 41, "foto.jpg", "image/jpeg", DateTimeOffset.Parse("2026-11-12T08:15:30.123Z"), new MemoryStream([0xFF, 0xD8, 0xFF, 0xD9])),
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
            new ProtokollpunktBildUebergabe(bildId, 41, "foto.jpg", "image/jpeg", DateTimeOffset.Parse("2026-11-12T08:15:30.123Z"), new MemoryStream([0xFF, 0xD8, 0xFF, 0xD9])),
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

    await PruefeStrukturantwortUngueltigAsync("kein-json");
    await PruefeStrukturantwortUngueltigAsync("{\"output\":{}}");
}

static async Task PruefeStrukturantwortUngueltigAsync(string antwort)
{
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(HttpStatusCode.OK)
    {
        Content = new StringContent(antwort, Encoding.UTF8, "application/json")
    });
    OpenAiProtokollpunktStrukturierer strukturierer = new(
        new HttpClient(handler) { BaseAddress = new Uri("https://api.openai.test/v1/") },
        "synthetischer-testschluessel",
        "synthetisches-testmodell");
    await PruefeAusnahmeAsync<InvalidDataException>(() => strukturierer.StrukturierenAsync(
        "Synthetisches Diktat",
        CancellationToken.None));
}

static async Task PruefeTranskriptionsdienstAsync()
{
    Pruefe(AudioformatPruefung.ErmittleDateiendung("audio/webm") == ".webm", "WebM-Endung wurde nicht erkannt.");
    Pruefe(AudioformatPruefung.ErmittleDateiendung("audio/x-wav") == ".wav", "WAV-Endung wurde nicht erkannt.");
    Pruefe(AudioformatPruefung.ErmittleDateiendung("text/plain") is null, "Fremder Audiotyp wurde akzeptiert.");

    AufzeichnenderHandler erfolgHandler = new(_ => new HttpResponseMessage(HttpStatusCode.OK)
    {
        Content = new StringContent("{\"text\":\"Brandschutztüre blockiert\"}", Encoding.UTF8, "application/json")
    });
    OpenAiTranskriptionsdienst dienst = new(
        new HttpClient(erfolgHandler) { BaseAddress = new Uri("https://api.openai.test/v1/") },
        "synthetischer-testschluessel",
        "synthetisches-testmodell");
    await using MemoryStream audio = new([0x52, 0x49, 0x46, 0x46]);
    Transkriptionsergebnis ergebnis = await dienst.TranskribierenAsync(
        audio,
        "audio/wav",
        ".wav",
        CancellationToken.None);
    Pruefe(ergebnis.Text == "Brandschutztüre blockiert", "Transkription wurde nicht korrekt gelesen.");
    Pruefe(erfolgHandler.LetzteMethode == HttpMethod.Post, "Transkriptionsvertrag muss POST verwenden.");
    Pruefe(erfolgHandler.LetzteUri?.AbsolutePath == "/v1/audio/transcriptions", "Transkriptionsdienst verwendet nicht den gebundenen Pfad.");
    Pruefe(erfolgHandler.LetzterInhalt?.Contains("synthetisches-testmodell", StringComparison.Ordinal) == true, "Transkriptionsmodell fehlt im Multipart-Inhalt.");

    await PruefeTranskriptionsstatusAsync<TranskriptionszugangAbgelehntException>(HttpStatusCode.Unauthorized);
    await PruefeTranskriptionsstatusAsync<TranskriptionskontingentException>(HttpStatusCode.TooManyRequests);
    await PruefeTranskriptionsstatusAsync<TranskriptionsaufnahmeUngueltigException>(HttpStatusCode.BadRequest);

    AufzeichnenderHandler timeoutHandler = new(_ => throw new OperationCanceledException("Synthetische Zeitüberschreitung"));
    OpenAiTranskriptionsdienst timeoutDienst = new(
        new HttpClient(timeoutHandler) { BaseAddress = new Uri("https://api.openai.test/v1/") },
        "synthetischer-testschluessel",
        "synthetisches-testmodell");
    await using MemoryStream timeoutAudio = new([0x52, 0x49, 0x46, 0x46]);
    await PruefeAusnahmeAsync<OperationCanceledException>(() => timeoutDienst.TranskribierenAsync(
        timeoutAudio,
        "audio/wav",
        ".wav",
        CancellationToken.None));
}

static async Task PruefeServerstrukturAsync()
{
    PlauderBoxOptionen optionen = PlauderBoxOptionen.Lade(new ConfigurationBuilder().Build());
    Pruefe(optionen.MaximaleAudiodateigroesseBytes == 20L * 1024 * 1024, "Audio-Grenzwert wurde verändert.");
    Pruefe(optionen.MaximaleBilddateigroesseBytes == 15L * 1024 * 1024, "Bild-Grenzwert wurde verändert.");
    Pruefe(optionen.TranskriptionsanfragenProStunde == 60, "Transkriptionsratenlimit wurde verändert.");
    Pruefe(optionen.BildanfragenProStunde == 1000, "Bildratenlimit wurde verändert.");
    Pruefe(optionen.FreigabeabrufeProStunde == 60, "Freigabeabruflimit wurde verändert.");
    Pruefe(optionen.PunktuebergabenProStunde == 30, "Punktübergabelimit wurde verändert.");
    Pruefe(optionen.TranskriptionenJeFreigabe == 20, "Transkriptionskontingent wurde verändert.");
    Pruefe(optionen.BilderJeFreigabe == 500, "Bildkontingent wurde verändert.");
    Pruefe(optionen.MaximaleProtokollpunkteJeUebergabe == 200, "Punktgrenze wurde verändert.");

    Pruefe(Ipv4Netz.Enthaelt(IPAddress.Parse("172.22.0.7"), "172.22.0.0/24"), "Adresse im Proxy-Netz wurde abgewiesen.");
    Pruefe(!Ipv4Netz.Enthaelt(IPAddress.Parse("172.23.0.7"), "172.22.0.0/24"), "Fremde Adresse wurde dem Proxy-Netz zugeordnet.");
    Pruefe(!Ipv4Netz.Enthaelt(IPAddress.IPv6Loopback, "172.22.0.0/24"), "IPv6-Adresse wurde als IPv4-Netzmitglied akzeptiert.");
    Pruefe(!Ipv4Netz.Enthaelt(IPAddress.Parse("172.22.0.7"), "172.22.0.0/33"), "Ungültiger Präfix wurde akzeptiert.");

    using MemoryCache cache = new(new MemoryCacheOptions());
    SteuerbareZeit zeit = new(TimeProvider.System.GetUtcNow());
    Freigabekontingent kontingent = new(cache, optionen, zeit);
    Pruefe(kontingent.Reserviere("test", "synthetische-freigabe", 1), "Erste Kontingentreservierung wurde abgewiesen.");
    Pruefe(!kontingent.Reserviere("test", "synthetische-freigabe", 1), "Kontingentgrenze wurde überschritten.");
    zeit.Fortschreiten(TimeSpan.FromMinutes(59));
    Pruefe(!kontingent.Reserviere("test", "synthetische-freigabe", 1), "Festes Kontingentfenster endete zu früh.");
    zeit.Fortschreiten(TimeSpan.FromMinutes(1));
    Pruefe(kontingent.Reserviere("test", "synthetische-freigabe", 1), "Kontingent wurde nach dem festen Zeitfenster nicht freigegeben.");

    bool naechsterAufgerufen = false;
    QuellUndUrsprungsMiddleware middleware = new(
        _ => { naechsterAufgerufen = true; return Task.CompletedTask; },
        new PlauderBoxOptionen
        {
            ErlaubterUrsprung = "https://plauderbox.test",
            ErlaubtesProxyNetz = "172.22.0.0/24"
        });
    DefaultHttpContext fremderKontext = new();
    fremderKontext.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");
    await middleware.InvokeAsync(fremderKontext);
    Pruefe(fremderKontext.Response.StatusCode == StatusCodes.Status403Forbidden, "Fremde Quelle wurde nicht abgewiesen.");
    Pruefe(!naechsterAufgerufen, "Middleware hat eine fremde Quelle weitergereicht.");

    DefaultHttpContext proxyKontext = new();
    proxyKontext.Connection.RemoteIpAddress = IPAddress.Parse("172.22.0.5");
    proxyKontext.Request.Method = HttpMethods.Post;
    proxyKontext.Request.Path = "/api/transkribieren";
    proxyKontext.Request.Headers.Origin = "https://plauderbox.test";
    proxyKontext.Request.Headers["X-Forwarded-For"] = "198.51.100.42";
    await middleware.InvokeAsync(proxyKontext);
    Pruefe(naechsterAufgerufen, "Erlaubte Proxyquelle mit passendem Ursprung wurde abgewiesen.");
    Pruefe(QuellUndUrsprungsMiddleware.ErmittleQuellPartition(proxyKontext, "172.22.0.0/24") == "198.51.100.42", "Bestätigte Clientquelle wurde nicht als Partition verwendet.");
    Pruefe(proxyKontext.Response.Headers["Cache-Control"] == "no-store", "Sicherheitsheader fehlt.");
    Pruefe(proxyKontext.Response.Headers["Permissions-Policy"] == "camera=(self), microphone=(self), geolocation=()", "Permissions-Policy fehlt.");
    Pruefe(proxyKontext.Response.Headers["Content-Security-Policy"].ToString().Contains("frame-ancestors 'self'", StringComparison.Ordinal), "CSP begrenzt frame-ancestors nicht.");
}

static async Task PruefeHappyHourFehlerabbildungAsync()
{
    IResult freigabe = await HappyHourFehlerabbildung.FuehreAsync(
        () => Task.FromException<IResult>(new HappyHourFreigabeUngueltigException()),
        HappyHourFehlerkontext.Freigabeabruf);
    PruefeStatusUndTitel(freigabe, StatusCodes.Status410Gone, "Rundgangsfreigabe ungültig");

    IResult nichtKonfiguriert = await HappyHourFehlerabbildung.FuehreAsync(
        () => Task.FromException<IResult>(new HappyHourNichtKonfiguriertException()),
        HappyHourFehlerkontext.Protokollpunktuebergabe);
    PruefeStatusUndTitel(nichtKonfiguriert, StatusCodes.Status503ServiceUnavailable, "HappyHour-Verbindung nicht konfiguriert");

    IResult konflikt = await HappyHourFehlerabbildung.FuehreAsync(
        () => Task.FromException<IResult>(new HappyHourUebergabeKonfliktException()),
        HappyHourFehlerkontext.Protokollpunktuebergabe);
    PruefeStatusUndTitel(konflikt, StatusCodes.Status409Conflict, "Übergabekonflikt");

    IResult bildkontingent = await HappyHourFehlerabbildung.FuehreAsync(
        () => Task.FromException<IResult>(new HappyHourBildkontingentException()),
        HappyHourFehlerkontext.Bilduebergabe);
    PruefeStatusUndTitel(bildkontingent, StatusCodes.Status429TooManyRequests, "Bildkontingent ausgeschöpft");

    IResult antwort = await HappyHourFehlerabbildung.FuehreAsync(
        () => Task.FromException<IResult>(new HappyHourAntwortUngueltigException()),
        HappyHourFehlerkontext.Transkriptionsfreigabe);
    PruefeStatusUndTitel(antwort, StatusCodes.Status502BadGateway, "Ungültige HappyHour-Antwort");
}

static void PruefeStatusUndTitel(IResult ergebnis, int status, string titel)
{
    Pruefe(ergebnis is IStatusCodeHttpResult statusErgebnis && statusErgebnis.StatusCode == status, $"Erwarteter HTTP-Status {status} fehlt.");
    Pruefe(ergebnis is IValueHttpResult wertErgebnis
        && wertErgebnis.Value is Microsoft.AspNetCore.Mvc.ProblemDetails problem
        && problem.Title == titel, $"Erwarteter ProblemDetails-Titel '{titel}' fehlt.");
}

static void PruefeSchichtenarchitektur()
{
    IReadOnlyList<string> fehler = Architekturpruefung.Pruefe(
        typeof(ITranskriptionsdienst).Assembly,
        typeof(OpenAiTranskriptionsdienst).Assembly);
    Pruefe(fehler.Count == 0, string.Join(Environment.NewLine, fehler));

    IReadOnlyList<string> referenzprobe = Architekturpruefung.PruefePlauderBoxReferenznamen(
        ["System.Runtime", "PlauderBox.UI"],
        []);
    Pruefe(referenzprobe.Count == 1, "Eine verbotene PlauderBox-Referenz würde den Architekturtest nicht auslösen.");

    IReadOnlyList<string> httpProbe = Architekturpruefung.PruefeOeffentlicheHttpSignaturen(
        [typeof(ArchitekturHttpNegativprobe)]);
    Pruefe(httpProbe.Count == 1, "Ein öffentlicher System.Net.Http-Typ würde den Architekturtest nicht auslösen.");
}

static async Task PruefeTranskriptionsstatusAsync<TAusnahme>(HttpStatusCode status)
    where TAusnahme : Exception
{
    AufzeichnenderHandler handler = new(_ => new HttpResponseMessage(status));
    OpenAiTranskriptionsdienst dienst = new(
        new HttpClient(handler) { BaseAddress = new Uri("https://api.openai.test/v1/") },
        "synthetischer-testschluessel",
        "synthetisches-testmodell");
    await using MemoryStream audio = new([0x52, 0x49, 0x46, 0x46]);
    await PruefeAusnahmeAsync<TAusnahme>(() => dienst.TranskribierenAsync(
        audio,
        "audio/wav",
        ".wav",
        CancellationToken.None));
}

static async Task PruefeAusnahmeAsync<TAusnahme>(Func<Task> aktion)
    where TAusnahme : Exception
{
    try
    {
        await aktion();
        throw new InvalidOperationException($"Erwartete Ausnahme {typeof(TAusnahme).Name} wurde nicht ausgelöst.");
    }
    catch (TAusnahme)
    {
    }
}

static void Pruefe(bool bedingung, string meldung) { if (!bedingung) throw new InvalidOperationException(meldung); }

sealed class SteuerbareZeit(DateTimeOffset jetzt) : TimeProvider
{
    private DateTimeOffset _jetzt = jetzt;

    public override DateTimeOffset GetUtcNow() => _jetzt;

    public void Fortschreiten(TimeSpan dauer) => _jetzt += dauer;
}

sealed class AufzeichnenderHandler(Func<HttpRequestMessage, HttpResponseMessage> antwort) : HttpMessageHandler
{
    public Uri? LetzteUri { get; private set; }
    public HttpMethod? LetzteMethode { get; private set; }
    public string? LetzterInhalt { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) { LetzteUri = request.RequestUri; LetzteMethode = request.Method; LetzterInhalt = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken); return antwort(request); }
}
