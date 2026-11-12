using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using PlauderBox.Datenmanagement;
using PlauderBox.Logik;
using PlauderBox.UI;
using PlauderBox.UI.Endpunkte;
using PlauderBox.UI.Sicherheit;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
PlauderBoxOptionen optionen = PlauderBoxOptionen.Lade(builder.Configuration);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
// Freigabe-Tokens stehen technisch im Pfad. Diese Kategorien dürfen deshalb keine Request-URLs protokollieren.
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.AspNetCore.Server.Kestrel", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http.HttpClient.HappyHour", LogLevel.Warning);
builder.WebHost.UseUrls(optionen.Url);

builder.Services.AddSingleton(optionen);
builder.Services.Configure<FormOptions>(formular =>
{
    formular.MultipartBodyLengthLimit = optionen.MaximaleAudiodateigroesseBytes;
});
builder.Services.AddHttpClient("OpenAI", client =>
{
    client.BaseAddress = new Uri("https://api.openai.com/v1/");
    client.Timeout = optionen.OpenAiZeitlimit;
});
builder.Services.AddHttpClient("HappyHour")
    .RemoveAllLoggers()
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddScoped<HappyHourFreigabeQuelle>(services => new HappyHourFreigabeQuelle(
    services.GetRequiredService<IHttpClientFactory>().CreateClient("HappyHour"),
    optionen.HappyHourBasisadresse));
builder.Services.AddScoped<IHappyHourFreigabeQuelle>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddScoped<IHappyHourProtokollpunktZiel>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddScoped<IHappyHourProtokollpunktBildZiel>(services => services.GetRequiredService<HappyHourFreigabeQuelle>());
builder.Services.AddScoped<IProtokollpunktStrukturierer>(services => new OpenAiProtokollpunktStrukturierer(
    services.GetRequiredService<IHttpClientFactory>().CreateClient("OpenAI"),
    optionen.ApiKey ?? string.Empty,
    optionen.Strukturmodell));
builder.Services.AddScoped<ITranskriptionsdienst>(services => new OpenAiTranskriptionsdienst(
    services.GetRequiredService<IHttpClientFactory>().CreateClient("OpenAI"),
    optionen.ApiKey ?? string.Empty,
    optionen.Modell));
builder.Services.AddMemoryCache();
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<Freigabekontingent>();
builder.Services.AddRateLimiter(ratenlimit =>
{
    ratenlimit.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    ratenlimit.AddPolicy("Transkription", context => RateLimitPartition.GetFixedWindowLimiter(
        "transkription:" + QuellUndUrsprungsMiddleware.ErmittleQuellPartition(context, optionen.ErlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = optionen.TranskriptionsanfragenProStunde,
            Window = optionen.RatenlimitFenster,
            QueueLimit = 0
        }));
    ratenlimit.AddPolicy("Bilduebergabe", context => RateLimitPartition.GetFixedWindowLimiter(
        "bilduebergabe:" + QuellUndUrsprungsMiddleware.ErmittleQuellPartition(context, optionen.ErlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = optionen.BildanfragenProStunde,
            Window = optionen.RatenlimitFenster,
            QueueLimit = 0
        }));
    ratenlimit.AddPolicy("Freigabeabruf", context => RateLimitPartition.GetFixedWindowLimiter(
        "freigabeabruf:" + QuellUndUrsprungsMiddleware.ErmittleQuellPartition(context, optionen.ErlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = optionen.FreigabeabrufeProStunde,
            Window = optionen.RatenlimitFenster,
            QueueLimit = 0
        }));
    ratenlimit.AddPolicy("Punktuebergabe", context => RateLimitPartition.GetFixedWindowLimiter(
        "punktuebergabe:" + QuellUndUrsprungsMiddleware.ErmittleQuellPartition(context, optionen.ErlaubtesProxyNetz),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = optionen.PunktuebergabenProStunde,
            Window = optionen.RatenlimitFenster,
            QueueLimit = 0
        }));
});

WebApplication app = builder.Build();
app.Logger.LogInformation(
    "KI-Konfiguration: bereit={KiBereit}, Transkriptionsmodell={Transkriptionsmodell}, Strukturmodell={Strukturmodell}, KonfigurationshinweisVorhanden={HinweisVorhanden}",
    !string.IsNullOrWhiteSpace(optionen.ApiKey),
    optionen.Modell,
    optionen.Strukturmodell,
    !string.IsNullOrWhiteSpace(optionen.KiKonfigurationsfehler));
app.UseExceptionHandler(fehleranwendung => fehleranwendung.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await Results.Problem(
        title: "Interner Serverfehler",
        statusCode: StatusCodes.Status500InternalServerError).ExecuteAsync(context);
}));
app.UseMiddleware<QuellUndUrsprungsMiddleware>();
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MappeHappyHourEndpunkte();
app.MappeTranskriptionsEndpunkte();
app.Run();

public partial class Program;
