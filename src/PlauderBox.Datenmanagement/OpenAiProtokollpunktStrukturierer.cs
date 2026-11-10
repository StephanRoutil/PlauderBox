using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using PlauderBox.Logik;

namespace PlauderBox.Datenmanagement;

/// <summary>
/// Implementiert die strukturierte Protokollpunktauswertung über die OpenAI Responses API.
/// </summary>
public sealed class OpenAiProtokollpunktStrukturierer : IProtokollpunktStrukturierer
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _modell;

    public OpenAiProtokollpunktStrukturierer(HttpClient httpClient, string apiKey, string modell)
    {
        _httpClient = httpClient;
        _apiKey = apiKey;
        _modell = modell;
    }

    public async Task<ProtokollpunktStrukturierung> StrukturierenAsync(
        string transkript,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(transkript))
            return new ProtokollpunktStrukturierung(
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty);

        object anfrage = new
        {
            model = _modell,
            store = false,
            instructions =
                "Extrahiere aus einem deutschsprachigen Baustellen- oder Rundgangsdiktat Gruppe, Thema, Inhalt und einen allenfalls genannten Rechtsverweis. " +
                "Das erwartete Sprechschema lautet: Gruppe, Thema, Inhalt, optional Rechtsverweis. " +
                "Gruppe ist die fachliche Rubrik, Thema eine kurze sachliche Überschrift und Inhalt die vollständige sachliche Feststellung ohne die gesprochenen Feldbezeichnungen. " +
                "Ein Rechtsverweis darf nur übernommen werden, wenn er ausdrücklich genannt wird. " +
                "Verwende ausschliesslich Angaben aus dem Text. Wenn etwas nicht erkennbar ist, gib dafür eine leere Zeichenfolge zurück.",
            input = transkript,
            text = new
            {
                format = new
                {
                    type = "json_schema",
                    name = "protokollpunkt_strukturierung",
                    strict = true,
                    schema = new
                    {
                        type = "object",
                        properties = new
                        {
                            gruppe = new { type = "string" },
                            thema = new { type = "string" },
                            inhalt = new { type = "string" },
                            rechtsverweis = new { type = "string" }
                        },
                        required = new[] { "gruppe", "thema", "inhalt", "rechtsverweis" },
                        additionalProperties = false
                    }
                }
            }
        };

        using HttpRequestMessage request = new(HttpMethod.Post, "responses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = JsonContent.Create(anfrage);

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException("Die strukturierte KI-Auswertung ist fehlgeschlagen.");

        await using Stream antwort = await response.Content.ReadAsStreamAsync(cancellationToken);
        using JsonDocument json = await JsonDocument.ParseAsync(antwort, cancellationToken: cancellationToken);
        string? ausgabetext = LeseAusgabetext(json.RootElement);
        if (string.IsNullOrWhiteSpace(ausgabetext))
            throw new InvalidDataException("Die strukturierte KI-Auswertung enthält keine Antwort.");

        StrukturierteAntwort? struktur = JsonSerializer.Deserialize<StrukturierteAntwort>(ausgabetext);
        if (struktur is null)
            throw new InvalidDataException("Die strukturierte KI-Auswertung ist ungültig.");

        return new ProtokollpunktStrukturierung(
            struktur.Gruppe?.Trim() ?? string.Empty,
            struktur.Thema?.Trim() ?? string.Empty,
            struktur.Inhalt?.Trim() ?? string.Empty,
            struktur.Rechtsverweis?.Trim() ?? string.Empty);
    }

    private static string? LeseAusgabetext(JsonElement antwort)
    {
        if (!antwort.TryGetProperty("output", out JsonElement ausgaben)) return null;
        foreach (JsonElement ausgabe in ausgaben.EnumerateArray())
        {
            if (!ausgabe.TryGetProperty("content", out JsonElement inhalte)) continue;
            foreach (JsonElement inhalt in inhalte.EnumerateArray())
            {
                if (inhalt.TryGetProperty("type", out JsonElement typ)
                    && typ.GetString() == "output_text"
                    && inhalt.TryGetProperty("text", out JsonElement text))
                    return text.GetString();
            }
        }

        return null;
    }

    private sealed class StrukturierteAntwort
    {
        [JsonPropertyName("gruppe")]
        public string? Gruppe { get; init; }

        [JsonPropertyName("thema")]
        public string? Thema { get; init; }

        [JsonPropertyName("inhalt")]
        public string? Inhalt { get; init; }

        [JsonPropertyName("rechtsverweis")]
        public string? Rechtsverweis { get; init; }
    }
}
