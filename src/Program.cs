using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using PlauderBox.Datenmanagement;
using PlauderBox.Logik;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
object freigabeKontingentSperre = new();
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
// Freigabe-Tokens stehen technisch im Pfad. Diese Kategorien dürfen deshalb keine Request-URLs protokollieren.
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Server.Kestrel", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http.HttpClient.HappyHour", LogLevel.Warning);
builder.WebHost.UseUrls(builder.Configuration["PlauderBox:Url"] ?? "http://127.0.0.1:5187");

const long maximaleDateigroesse = 20L * 1024 * 1024;
(string? apiKey, string? konfigurationsfehler) = LadeApiKey(builder.Configuration);
string modell = builder.Configuration["PlauderBox:KI:Modell"] ?? "gpt-transcribe";
string strukturmodell = builder.Configuration["PlauderBox:KI:Strukturmodell"] ?? "gpt-6-luna";
string? erlaubterUrsprung = builder.Configuration["PlauderBox:ErlaubterUrsprung"]?.TrimEnd('/');
string? erlaubtesProxyNetz = builder.Configuration["PlauderBox:ErlaubtesProxyNetz"];
Uri? happyHourBasisadresse = Uri.TryCreate(
    builder.Configuration["PlauderBox:HappyHour:Basisadresse"]?.TrimEnd('/') + "/",
    UriKind.Absolute,
    out Uri? konfigurierteHappyHourBasisadresse)
    ? konfigurierteHappyHourBasisadresse
    : null;

builder.Services.Configure<FormOptions>(options =>
{
    options.MemoryBufferThreshold = (int)maximaleDateigroesse;
    options.MultipartBodyLengthLimit = maximaleDateigroesse;
});
builder.Services.AddHttpClient("OpenAI", client =>
{
    client.BaseAddress = new Uri("https://api.openai.com/v1/");
    client.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddHttpClient("HappyHour")
    .RemoveAllLoggers()
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddScoped<HappyHourFreigabeQuelle>(services =>
    new HappyHourFreigabeQuelle(
        services.GetRequiredService<IHttpClientFactory>().CreateClient("HappyHour"),
        happyHourBasisadresse));
builder.Services.AddScoped<IHappyHourFreigabeQuelle>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddScoped<IHappyHourProtokollpunktZiel>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddScoped<IHappyHourProtokollpunktBildZiel>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IProtokollpunktStrukturierer>(services =>
    new OpenAiProtokollpunktStrukturierer(
        services.GetRequiredService<IHttpClientFactory>().CreateClient("OpenAI"),
        apiKey ?? string.Empty,
        strukturmodell));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("Transkription", context => RateLimitPartition.GetFixedWindowLimiter(
        "transkription:" + LadeQuellPartition(context, erlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0
        }));
    options.AddPolicy("Bilduebergabe", context => RateLimitPartition.GetFixedWindowLimiter(
        "bilduebergabe:" + LadeQuellPartition(context, erlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 1000,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0
        }));
});

WebApplication app = builder.Build();
app.Use(async (context, next) =>
{
    bool istLoopbackQuelle = context.Connection.RemoteIpAddress is null ||
        IPAddress.IsLoopback(context.Connection.RemoteIpAddress);
    if (!istLoopbackQuelle &&
        !IstAdresseInIpv4Netz(context.Connection.RemoteIpAddress!, erlaubtesProxyNetz))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    context.Response.Headers["Cache-Control"] = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self'; media-src 'self' blob:; script-src 'self'; style-src 'self'; img-src 'self' data: blob:";

    if (HttpMethods.IsPost(context.Request.Method) && context.Request.Path.StartsWithSegments("/api"))
    {
        string origin = context.Request.Headers.Origin.ToString();
        bool istLoopbackUrsprung = Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri)
            && IPAddress.TryParse(uri.Host, out IPAddress? ip)
            && IPAddress.IsLoopback(ip);
        bool istKonfigurierterUrsprung = !string.IsNullOrWhiteSpace(erlaubterUrsprung)
            && string.Equals(origin.TrimEnd('/'), erlaubterUrsprung, StringComparison.OrdinalIgnoreCase);
        if ((!istLoopbackQuelle && !istKonfigurierterUrsprung) ||
            (!string.IsNullOrWhiteSpace(origin) && !istLoopbackUrsprung && !istKonfigurierterUrsprung))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }

    await next();
});
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/status", () => Results.Ok(new
{
    kiBereit = !string.IsNullOrWhiteSpace(apiKey),
    modell,
    strukturmodell,
    hinweis = konfigurationsfehler
}));

app.MapGet("/api/happyhour/freigaben/{freigabeToken}", async (
    string freigabeToken,
    IHappyHourFreigabeQuelle quelle,
    CancellationToken token) =>
{
    try
    {
        HappyHourProtokollKontext kontext = await quelle.LadeAsync(freigabeToken, token);
        return Results.Ok(kontext);
    }
    catch (HappyHourNichtKonfiguriertException)
    {
        return Results.Problem(
            title: "HappyHour-Verbindung nicht konfiguriert",
            detail: "Die Testverbindung zu HappyHour ist serverseitig noch nicht eingerichtet.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourFreigabeUngueltigException)
    {
        return Results.Problem(
            title: "Rundgangsfreigabe ungültig",
            detail: "Die Rundgangsfreigabe ist ungültig, abgelaufen oder wurde widerrufen.",
            statusCode: StatusCodes.Status410Gone);
    }
    catch (HappyHourAntwortUngueltigException)
    {
        return Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway);
    }
    catch (HappyHourNichtErreichbarException)
    {
        return Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapPost("/api/happyhour/protokollpunkte/uebergeben", async (
    BegehungUebergabeAnforderung anforderung,
    IHappyHourProtokollpunktZiel ziel,
    CancellationToken token) =>
{
    BegehungUebergabePruefergebnis pruefung = BegehungUebergabePruefung.Pruefe(anforderung);
    if (pruefung == BegehungUebergabePruefergebnis.FreigabeUngueltig)
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    if (pruefung != BegehungUebergabePruefergebnis.Gueltig)
        return Results.Problem(title: "Ungültige Übergabe", detail: "Die Protokollpunkte sind unvollständig oder widersprüchlich.", statusCode: StatusCodes.Status400BadRequest);
    RundgangsfreigabeToken.TryCreate(anforderung.FreigabeToken, out RundgangsfreigabeToken? freigabe);

    try
    {
        List<ProtokollpunktUebergabeErgebnis> ergebnisse = [];
        foreach (ProtokollpunktUebergabeEintrag eintrag in anforderung.Eintraege)
            ergebnisse.Add(await ziel.SchreibeAsync(freigabe!.Wert, eintrag, token));
        return Results.Ok(new { ergebnisse });
    }
    catch (HappyHourFreigabeUngueltigException)
    {
        return Results.Problem(title: "Rundgangsfreigabe ungültig", detail: "Die Freigabe ist abgelaufen oder wurde widerrufen.", statusCode: StatusCodes.Status410Gone);
    }
    catch (HappyHourUebergabeUngueltigException)
    {
        return Results.Problem(title: "Protokollpunkt ungültig", detail: "HappyHour hat mindestens einen Protokollpunkt abgewiesen.", statusCode: StatusCodes.Status400BadRequest);
    }
    catch (HappyHourUebergabeKonfliktException)
    {
        return Results.Problem(title: "Übergabekonflikt", detail: "Das Protokoll oder ein vorbereiteter Punkt wurde zwischenzeitlich geändert.", statusCode: StatusCodes.Status409Conflict);
    }
    catch (HappyHourAntwortUngueltigException)
    {
        return Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway);
    }
    catch (HappyHourNichtKonfiguriertException)
    {
        return Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourNichtErreichbarException)
    {
        return Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).DisableAntiforgery();

app.MapPost("/api/happyhour/protokollpunkte/{protokollpunktId:int}/bilder/{bildId:guid}", async (
    int protokollpunktId,
    Guid bildId,
    HttpRequest request,
    IHappyHourFreigabeQuelle freigabeQuelle,
    IHappyHourProtokollpunktBildZiel ziel,
    IMemoryCache freigabeKontingente,
    CancellationToken token) =>
{
    if (protokollpunktId <= 0 || bildId == Guid.Empty || !request.HasFormContentType)
        return Results.Problem(title: "Ungültige Bildübergabe", statusCode: StatusCodes.Status400BadRequest);

    string headerFreigabeToken = request.Headers["X-PlauderBox-Freigabe"].ToString();
    if (!RundgangsfreigabeToken.TryCreate(headerFreigabeToken, out RundgangsfreigabeToken? headerFreigabe) || headerFreigabe is null)
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    try
    {
        await freigabeQuelle.LadeAsync(headerFreigabe.Wert, token);
    }
    catch (HappyHourFreigabeUngueltigException)
    {
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    }
    catch (HappyHourNichtKonfiguriertException)
    {
        return Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourNichtErreichbarException)
    {
        return Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourAntwortUngueltigException)
    {
        return Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway);
    }
    if (!ReserviereFreigabeKontingent(freigabeKontingente, freigabeKontingentSperre, "bilder", headerFreigabe.Wert, 500))
        return Results.Problem(title: "Bildkontingent ausgeschöpft", statusCode: StatusCodes.Status429TooManyRequests);

    IFormCollection formular;
    try { formular = await request.ReadFormAsync(token); }
    catch (InvalidDataException) { return Results.Problem(title: "Das Bild ist zu gross oder ungültig.", statusCode: StatusCodes.Status413PayloadTooLarge); }
    string freigabeToken = formular["freigabeToken"].ToString();
    if (!string.Equals(freigabeToken, headerFreigabeToken, StringComparison.Ordinal))
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? freigabe) || freigabe is null)
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    IFormFile? datei = formular.Files.GetFile("bild");
    if (formular.Files.Count != 1 || datei is null || datei.Length <= 0 || datei.Length > 15L * 1024 * 1024)
        return Results.Problem(title: "Das Bild ist leer oder grösser als 15 MB.", statusCode: StatusCodes.Status400BadRequest);
    if (!DateTimeOffset.TryParse(
            formular["aufnahmezeitpunkt"].ToString(),
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
            out DateTimeOffset aufnahmezeitpunkt))
        return Results.Problem(title: "Der Aufnahmezeitpunkt ist ungültig.", statusCode: StatusCodes.Status400BadRequest);

    try
    {
        await using MemoryStream inhalt = new((int)datei.Length);
        await datei.CopyToAsync(inhalt, token);
        ProtokollpunktBildUebergabeErgebnis ergebnis = await ziel.SchreibeBildAsync(
            freigabe.Wert,
            new ProtokollpunktBildUebergabe(
                bildId,
                protokollpunktId,
                Path.GetFileName(datei.FileName),
                datei.ContentType,
                aufnahmezeitpunkt,
                inhalt.ToArray()),
            token);
        return Results.Ok(ergebnis);
    }
    catch (HappyHourFreigabeUngueltigException)
    {
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    }
    catch (HappyHourUebergabeUngueltigException)
    {
        return Results.Problem(title: "Bild ungültig", statusCode: StatusCodes.Status400BadRequest);
    }
    catch (HappyHourUebergabeKonfliktException)
    {
        return Results.Problem(title: "Übergabekonflikt", statusCode: StatusCodes.Status409Conflict);
    }
    catch (HappyHourBildkontingentException)
    {
        return Results.Problem(title: "Bildkontingent ausgeschöpft", statusCode: StatusCodes.Status429TooManyRequests);
    }
    catch (HappyHourAntwortUngueltigException)
    {
        return Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway);
    }
    catch (HappyHourNichtKonfiguriertException)
    {
        return Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourNichtErreichbarException)
    {
        return Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).DisableAntiforgery().RequireRateLimiting("Bilduebergabe");

app.MapPost("/api/transkribieren", async (
    HttpRequest request,
    IHttpClientFactory clientFactory,
    IHappyHourFreigabeQuelle freigabeQuelle,
    IProtokollpunktStrukturierer strukturierer,
    IMemoryCache freigabeKontingente,
    CancellationToken token) =>
{
    string freigabeToken = request.Headers["X-PlauderBox-Freigabe"].ToString();
    if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? freigabe) || freigabe is null)
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status401Unauthorized);

    try
    {
        await freigabeQuelle.LadeAsync(freigabe.Wert, token);
    }
    catch (HappyHourFreigabeUngueltigException)
    {
        return Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone);
    }
    catch (HappyHourNichtKonfiguriertException)
    {
        return Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourNichtErreichbarException)
    {
        return Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (HappyHourAntwortUngueltigException)
    {
        return Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway);
    }
    if (!ReserviereFreigabeKontingent(freigabeKontingente, freigabeKontingentSperre, "transkription", freigabe.Wert, 20))
        return Results.Problem(title: "Transkriptionskontingent ausgeschöpft", statusCode: StatusCodes.Status429TooManyRequests);

    if (string.IsNullOrWhiteSpace(apiKey))
        return Problem("Die KI-Anbindung ist lokal noch nicht konfiguriert.", StatusCodes.Status503ServiceUnavailable);
    if (!request.HasFormContentType)
        return Problem("Es wurde keine Audioaufnahme übermittelt.", StatusCodes.Status400BadRequest);

    IFormCollection form;
    try { form = await request.ReadFormAsync(token); }
    catch (InvalidDataException) { return Problem("Die Aufnahme ist zu gross oder ungültig.", StatusCodes.Status413PayloadTooLarge); }

    IFormFile? audio = form.Files.GetFile("audio");
    if (!ErfassungsId.IstGueltig(form["erfassungsId"].ToString()))
        return Problem("Die stabile Erfassungskennung fehlt oder ist ungültig.", StatusCodes.Status400BadRequest);
    if (audio is null || audio.Length == 0)
        return Problem("Die Aufnahme ist leer.", StatusCodes.Status400BadRequest);
    if (audio.Length > maximaleDateigroesse)
        return Problem("Die Aufnahme überschreitet 20 MB.", StatusCodes.Status413PayloadTooLarge);

    string medientyp = audio.ContentType.Split(';', 2)[0].Trim().ToLowerInvariant();
    string? endung = medientyp switch
    {
        "audio/webm" => ".webm",
        "audio/ogg" => ".ogg",
        "audio/mp4" => ".mp4",
        "audio/mpeg" => ".mp3",
        "audio/wav" or "audio/x-wav" => ".wav",
        _ => null
    };
    if (endung is null)
        return Problem("Dieses Audioformat wird nicht unterstützt.", StatusCodes.Status415UnsupportedMediaType);

    try
    {
        using Stream audioStream = audio.OpenReadStream();
        using StreamContent audioInhalt = new(audioStream);
        audioInhalt.Headers.ContentType = new MediaTypeHeaderValue(medientyp);
        using MultipartFormDataContent inhalt = new();
        inhalt.Add(audioInhalt, "file", "aufnahme" + endung);
        inhalt.Add(new StringContent(modell), "model");
        inhalt.Add(new StringContent("de"), "language");
        inhalt.Add(new StringContent("Transkribiere das Gesprochene in deutscher Standardsprache. Erhalte Inhalt, Zahlen, Masse, Namen und Fachbegriffe. Erfinde nichts."), "prompt");

        using HttpRequestMessage apiRequest = new(HttpMethod.Post, "audio/transcriptions");
        apiRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        apiRequest.Content = inhalt;
        using HttpResponseMessage apiResponse = await clientFactory.CreateClient("OpenAI").SendAsync(apiRequest, token);

        if (!apiResponse.IsSuccessStatusCode)
        {
            string meldung = apiResponse.StatusCode switch
            {
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => "OpenAI weist den konfigurierten Schlüssel zurück.",
                HttpStatusCode.TooManyRequests => "OpenAI-Kontingent oder Anfragelimit erreicht.",
                HttpStatusCode.BadRequest => "OpenAI konnte diese Aufnahme nicht verarbeiten.",
                _ => "Die Transkription ist momentan nicht verfügbar."
            };
            return Problem(meldung, StatusCodes.Status502BadGateway);
        }

        await using Stream antwort = await apiResponse.Content.ReadAsStreamAsync(token);
        using JsonDocument json = await JsonDocument.ParseAsync(antwort, cancellationToken: token);
        if (!json.RootElement.TryGetProperty("text", out JsonElement textElement)
            || string.IsNullOrWhiteSpace(textElement.GetString()))
            return Problem("OpenAI hat keinen erkannten Text zurückgegeben.", StatusCodes.Status502BadGateway);

        string transkript = textElement.GetString()!;
        ProtokollpunktStrukturierung struktur = await strukturierer.StrukturierenAsync(transkript, token);
        return Results.Ok(new
        {
            text = transkript,
            gruppe = struktur.Gruppe,
            thema = struktur.Thema,
            inhalt = struktur.Inhalt,
            rechtsverweis = struktur.Rechtsverweis,
            modell,
            strukturmodell
        });
    }
    catch (OperationCanceledException) when (!token.IsCancellationRequested)
    {
        return Problem("Die Transkription hat zu lange gedauert.", StatusCodes.Status504GatewayTimeout);
    }
    catch (HttpRequestException)
    {
        return Problem("OpenAI ist momentan nicht erreichbar oder konnte das Diktat nicht strukturieren.", StatusCodes.Status502BadGateway);
    }
    catch (InvalidDataException)
    {
        return Problem("Die strukturierte Auswertung konnte nicht gelesen werden.", StatusCodes.Status502BadGateway);
    }
}).DisableAntiforgery().RequireRateLimiting("Transkription");

app.Run();

static IResult Problem(string meldung, int status) => Results.Problem(
    title: "Transkription nicht möglich",
    detail: meldung,
    statusCode: status);

static string LadeQuellPartition(HttpContext context, string? erlaubtesProxyNetz)
{
    IPAddress? remoteAdresse = context.Connection.RemoteIpAddress;
    if (remoteAdresse is not null && IstAdresseInIpv4Netz(remoteAdresse, erlaubtesProxyNetz))
    {
        string weitergeleitet = context.Request.Headers["X-Forwarded-For"].ToString().Split(',', 2)[0].Trim();
        if (IPAddress.TryParse(weitergeleitet, out IPAddress? clientAdresse)) return clientAdresse.ToString();
        return "proxy_ohne_clientadresse";
    }

    return remoteAdresse?.ToString() ?? "unbekannte_quelle";
}

static bool ReserviereFreigabeKontingent(
    IMemoryCache cache,
    object sperre,
    string art,
    string freigabeToken,
    int grenze)
{
    string schluessel = "PlauderBox.FreigabeKontingent:" + art + ":" + freigabeToken;
    lock (sperre)
    {
        int anzahl = cache.TryGetValue(schluessel, out int vorhanden) ? vorhanden : 0;
        if (anzahl >= grenze) return false;
        cache.Set(schluessel, anzahl + 1, TimeSpan.FromHours(1));
        return true;
    }
}

static bool IstAdresseInIpv4Netz(IPAddress adresse, string? netzNotation)
{
    if (string.IsNullOrWhiteSpace(netzNotation)) return false;

    string[] teile = netzNotation.Split('/', StringSplitOptions.TrimEntries);
    if (teile.Length != 2 ||
        !IPAddress.TryParse(teile[0], out IPAddress? netzAdresse) ||
        !int.TryParse(teile[1], out int praefixLaenge) ||
        praefixLaenge < 0 || praefixLaenge > 32)
        return false;

    byte[] adressBytes = adresse.GetAddressBytes();
    byte[] netzBytes = netzAdresse.GetAddressBytes();
    if (adressBytes.Length != 4 || netzBytes.Length != 4) return false;

    int volleBytes = praefixLaenge / 8;
    int restBits = praefixLaenge % 8;
    for (int index = 0; index < volleBytes; index++)
        if (adressBytes[index] != netzBytes[index]) return false;

    if (restBits == 0) return true;
    int maske = 0xFF << (8 - restBits);
    return (adressBytes[volleBytes] & maske) == (netzBytes[volleBytes] & maske);
}

static (string? Schluessel, string? Fehler) LadeApiKey(IConfiguration konfiguration)
{
    string? direkt = konfiguration["PlauderBox:KI:ApiKey"];
    if (!string.IsNullOrWhiteSpace(direkt)) return (direkt.Trim(), null);

    string? datei = konfiguration["PlauderBox:KI:Schluesseldatei"];
    if (string.IsNullOrWhiteSpace(datei)) return (null, "Kein serverseitiger OpenAI-Schlüssel konfiguriert.");
    try
    {
        using JsonDocument json = JsonDocument.Parse(File.ReadAllText(datei));
        string? schluessel = json.RootElement.GetProperty("OpenAI").GetString();
        return string.IsNullOrWhiteSpace(schluessel)
            ? (null, "Die konfigurierte Schlüsseldatei enthält keinen OpenAI-Schlüssel.")
            : (schluessel.Trim(), null);
    }
    catch (Exception)
    {
        return (null, "Die serverseitige OpenAI-Schlüsseldatei konnte nicht gelesen werden.");
    }
}

