using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.WebHost.UseUrls(builder.Configuration["PlauderBox:Url"] ?? "http://127.0.0.1:5187");

const long maximaleDateigroesse = 20L * 1024 * 1024;
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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("Transkription", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "lokal",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0
        }));
});

(string? apiKey, string? konfigurationsfehler) = LadeApiKey(builder.Configuration);
string modell = builder.Configuration["PlauderBox:KI:Modell"] ?? "gpt-transcribe";

WebApplication app = builder.Build();
app.Use(async (context, next) =>
{
    if (context.Connection.RemoteIpAddress is not null && !IPAddress.IsLoopback(context.Connection.RemoteIpAddress))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    context.Response.Headers["Cache-Control"] = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self'; media-src 'self' blob:; script-src 'self'; style-src 'self'; img-src 'self' data:";

    if (HttpMethods.IsPost(context.Request.Method) && context.Request.Path.StartsWithSegments("/api"))
    {
        string origin = context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin) && (!Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri)
            || !IPAddress.TryParse(uri.Host, out IPAddress? ip) || !IPAddress.IsLoopback(ip)))
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
    hinweis = konfigurationsfehler
}));

app.MapPost("/api/transkribieren", async (HttpRequest request, IHttpClientFactory clientFactory, CancellationToken token) =>
{
    if (string.IsNullOrWhiteSpace(apiKey))
        return Problem("Die KI-Anbindung ist lokal noch nicht konfiguriert.", StatusCodes.Status503ServiceUnavailable);
    if (!request.HasFormContentType)
        return Problem("Es wurde keine Audioaufnahme übermittelt.", StatusCodes.Status400BadRequest);

    IFormCollection form;
    try { form = await request.ReadFormAsync(token); }
    catch (InvalidDataException) { return Problem("Die Aufnahme ist zu gross oder ungültig.", StatusCodes.Status413PayloadTooLarge); }

    IFormFile? audio = form.Files.GetFile("audio");
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

        return Results.Ok(new { text = textElement.GetString(), modell });
    }
    catch (OperationCanceledException) when (!token.IsCancellationRequested)
    {
        return Problem("Die Transkription hat zu lange gedauert.", StatusCodes.Status504GatewayTimeout);
    }
    catch (HttpRequestException)
    {
        return Problem("OpenAI ist momentan nicht erreichbar.", StatusCodes.Status502BadGateway);
    }
}).DisableAntiforgery().RequireRateLimiting("Transkription");

app.Run();

static IResult Problem(string meldung, int status) => Results.Problem(
    title: "Transkription nicht möglich",
    detail: meldung,
    statusCode: status);

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

