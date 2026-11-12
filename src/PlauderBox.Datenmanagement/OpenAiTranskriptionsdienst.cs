using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using PlauderBox.Logik;

namespace PlauderBox.Datenmanagement;

/// <summary>
/// Implementiert die Audiotranskription über die OpenAI Transcriptions API.
/// </summary>
public sealed class OpenAiTranskriptionsdienst : ITranskriptionsdienst
{
    private const string Transkriptionsanweisung =
        "Transkribiere das Gesprochene in deutscher Standardsprache. Erhalte Inhalt, Zahlen, Masse, Namen und Fachbegriffe. Erfinde nichts.";

    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _modell;

    public OpenAiTranskriptionsdienst(HttpClient httpClient, string apiKey, string modell)
    {
        _httpClient = httpClient;
        _apiKey = apiKey;
        _modell = modell;
    }

    public bool IstKonfiguriert => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task<Transkriptionsergebnis> TranskribierenAsync(
        Stream audioInhalt,
        string medientyp,
        string dateiendung,
        CancellationToken cancellationToken)
    {
        using StreamContent audio = new(audioInhalt);
        audio.Headers.ContentType = new MediaTypeHeaderValue(medientyp);
        using MultipartFormDataContent inhalt = new();
        inhalt.Add(audio, "file", "aufnahme" + dateiendung);
        inhalt.Add(new StringContent(_modell), "model");
        inhalt.Add(new StringContent("de"), "language");
        inhalt.Add(new StringContent(Transkriptionsanweisung), "prompt");

        using HttpRequestMessage anfrage = new(HttpMethod.Post, "audio/transcriptions");
        anfrage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        anfrage.Content = inhalt;
        using HttpResponseMessage antwort = await _httpClient.SendAsync(anfrage, cancellationToken);

        if (!antwort.IsSuccessStatusCode)
            throw ErstelleStatusausnahme(antwort.StatusCode);

        await using Stream antwortInhalt = await antwort.Content.ReadAsStreamAsync(cancellationToken);
        using JsonDocument json = await JsonDocument.ParseAsync(
            antwortInhalt,
            cancellationToken: cancellationToken);
        if (!json.RootElement.TryGetProperty("text", out JsonElement textElement)
            || string.IsNullOrWhiteSpace(textElement.GetString()))
            throw new TranskriptionsantwortLeerException();

        return new Transkriptionsergebnis(textElement.GetString()!);
    }

    private static TranskriptionsdienstException ErstelleStatusausnahme(HttpStatusCode status)
    {
        return status switch
        {
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden =>
                new TranskriptionszugangAbgelehntException(),
            HttpStatusCode.TooManyRequests => new TranskriptionskontingentException(),
            HttpStatusCode.BadRequest => new TranskriptionsaufnahmeUngueltigException(),
            _ => new TranskriptionsdienstNichtVerfuegbarException()
        };
    }
}
