using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace PlauderBox.Integrationstests;

public sealed class ServergrenzeTests
{
    [Fact]
    public async Task FremdeQuelleWirdAbgewiesen()
    {
        await using IntegrationstestFabrik fabrik = new();
        HttpContext context = await fabrik.Server.SendAsync(testkontext =>
        {
            testkontext.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");
            testkontext.Request.Method = HttpMethod.Get.Method;
            testkontext.Request.Path = "/api/status";
        });

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task PostMitFremdemUrsprungWirdAbgewiesen()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();
        using HttpRequestMessage anfrage = new(HttpMethod.Post, "/api/transkribieren");
        anfrage.Headers.Add("Origin", "https://fremd.test");
        anfrage.Content = new StringContent("ungueltig", Encoding.UTF8, "text/plain");

        using HttpResponseMessage antwort = await client.SendAsync(anfrage);

        Assert.Equal(HttpStatusCode.Forbidden, antwort.StatusCode);
    }

    [Fact]
    public async Task TranskriptionPrueftFreigabeVorBody()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();
        using HttpResponseMessage ohneFreigabe = await client.PostAsync(
            "/api/transkribieren",
            new StringContent("kein Formular", Encoding.UTF8, "text/plain"));
        using HttpRequestMessage anfrage = new(HttpMethod.Post, "/api/transkribieren");
        anfrage.Headers.Add("X-PlauderBox-Freigabe", Testdaten.UngueltigeFreigabe);
        anfrage.Content = new StringContent("kein Formular", Encoding.UTF8, "text/plain");
        using HttpResponseMessage ungueltigeFreigabe = await client.SendAsync(anfrage);

        Assert.Equal(HttpStatusCode.Unauthorized, ohneFreigabe.StatusCode);
        Assert.Equal(HttpStatusCode.Gone, ungueltigeFreigabe.StatusCode);
    }

    [Fact]
    public async Task BildFormulartokenMussZumHeaderPassen()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();
        using HttpRequestMessage anfrage = ErstelleBildanfrage(Testdaten.GueltigeFreigabe, Testdaten.UngueltigeFreigabe, "image/jpeg", [0xFF, 0xD8, 0xFF, 0xD9]);

        using HttpResponseMessage antwort = await client.SendAsync(anfrage);

        Assert.Equal(HttpStatusCode.Gone, antwort.StatusCode);
    }

    [Fact]
    public async Task BildsignaturMussZumMedientypPassen()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();
        using HttpRequestMessage anfrage = ErstelleBildanfrage(Testdaten.GueltigeFreigabe, Testdaten.GueltigeFreigabe, "image/png", [0xFF, 0xD8, 0xFF, 0xD9]);

        using HttpResponseMessage antwort = await client.SendAsync(anfrage);
        string inhalt = await antwort.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, antwort.StatusCode);
        Assert.Contains("Das Bildformat stimmt nicht mit dem Bildinhalt überein.", inhalt, StringComparison.Ordinal);
    }

    [Fact]
    public async Task KontingentUndRatenlimitAntwortenMit429()
    {
        await using IntegrationstestFabrik kontingentFabrik = new();
        using HttpClient kontingentClient = kontingentFabrik.CreateClient();
        HttpResponseMessage? letzteKontingentantwort = null;
        for (int index = 0; index < 21; index++)
        {
            letzteKontingentantwort?.Dispose();
            using HttpRequestMessage anfrage = ErstelleAudioanfrage(Testdaten.GueltigeFreigabe);
            letzteKontingentantwort = await kontingentClient.SendAsync(anfrage);
        }
        using (letzteKontingentantwort)
            Assert.Equal(HttpStatusCode.TooManyRequests, letzteKontingentantwort!.StatusCode);

        await using IntegrationstestFabrik ratenlimitFabrik = new();
        using HttpClient ratenlimitClient = ratenlimitFabrik.CreateClient();
        HttpResponseMessage? letzteRatenantwort = null;
        for (int index = 0; index < 61; index++)
        {
            letzteRatenantwort?.Dispose();
            letzteRatenantwort = await ratenlimitClient.GetAsync($"/api/happyhour/freigaben/{Testdaten.GueltigeFreigabe}");
        }
        using (letzteRatenantwort)
            Assert.Equal(HttpStatusCode.TooManyRequests, letzteRatenantwort!.StatusCode);
    }

    [Fact]
    public async Task ProviderJsonFehlerWirdAls502Abgebildet()
    {
        await using IntegrationstestFabrik fabrik = new(new FehlerhafterStrukturierer());
        using HttpClient client = fabrik.CreateClient();
        using HttpRequestMessage anfrage = ErstelleAudioanfrage(Testdaten.GueltigeFreigabe);

        using HttpResponseMessage antwort = await client.SendAsync(anfrage);

        Assert.Equal(HttpStatusCode.BadGateway, antwort.StatusCode);
    }

    [Fact]
    public async Task UnerwarteterFehlerGibtGenerischesProblemDetails()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();

        using HttpResponseMessage antwort = await client.GetAsync($"/api/happyhour/freigaben/{Testdaten.TechnischerFehlerFreigabe}");
        string inhalt = await antwort.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, antwort.StatusCode);
        Assert.Contains("Interner Serverfehler", inhalt, StringComparison.Ordinal);
        Assert.DoesNotContain("synthetischer technischer Fehler", inhalt, StringComparison.Ordinal);
    }

    [Fact]
    public async Task StatusEnthaeltNurKiBereitschaft()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();

        using HttpResponseMessage antwort = await client.GetAsync("/api/status");
        using JsonDocument json = JsonDocument.Parse(await antwort.Content.ReadAsStringAsync());

        Assert.True(antwort.IsSuccessStatusCode);
        JsonProperty eigenschaft = Assert.Single(json.RootElement.EnumerateObject());
        Assert.Equal("kiBereit", eigenschaft.Name);
        Assert.True(eigenschaft.Value.GetBoolean());
    }

    [Fact]
    public async Task SicherheitsheaderSindGesetzt()
    {
        await using IntegrationstestFabrik fabrik = new();
        using HttpClient client = fabrik.CreateClient();

        using HttpResponseMessage antwort = await client.GetAsync("/api/status");

        Assert.Equal("camera=(self), microphone=(self), geolocation=()", HoleHeader(antwort, "Permissions-Policy"));
        Assert.Contains("frame-ancestors 'self'", HoleHeader(antwort, "Content-Security-Policy"), StringComparison.Ordinal);
    }

    private static HttpRequestMessage ErstelleAudioanfrage(string freigabeToken)
    {
        MultipartFormDataContent formular = new();
        ByteArrayContent audio = new([1, 2, 3, 4]);
        audio.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");
        formular.Add(audio, "audio", "aufnahme.webm");
        formular.Add(new StringContent("10000000-0000-4000-8000-000000000001"), "erfassungsId");
        HttpRequestMessage anfrage = new(HttpMethod.Post, "/api/transkribieren") { Content = formular };
        anfrage.Headers.Add("X-PlauderBox-Freigabe", freigabeToken);
        return anfrage;
    }

    private static HttpRequestMessage ErstelleBildanfrage(
        string headerToken,
        string formularToken,
        string medientyp,
        byte[] inhalt)
    {
        MultipartFormDataContent formular = new();
        ByteArrayContent bild = new(inhalt);
        bild.Headers.ContentType = new MediaTypeHeaderValue(medientyp);
        formular.Add(bild, "bild", "synthetisch.jpg");
        formular.Add(new StringContent(formularToken), "freigabeToken");
        formular.Add(new StringContent("2026-11-12T08:15:30.123Z"), "aufnahmezeitpunkt");
        HttpRequestMessage anfrage = new(
            HttpMethod.Post,
            "/api/happyhour/protokollpunkte/41/bilder/10000000-0000-4000-8000-000000000001")
        {
            Content = formular
        };
        anfrage.Headers.Add("X-PlauderBox-Freigabe", headerToken);
        return anfrage;
    }

    private static string HoleHeader(HttpResponseMessage antwort, string name) =>
        Assert.Single(antwort.Headers.GetValues(name));
}
