using System.Text.Json;

namespace PlauderBox.UI;

public sealed class PlauderBoxOptionen
{
    public long MaximaleAudiodateigroesseBytes { get; init; } = 20L * 1024 * 1024;
    public long MaximaleBilddateigroesseBytes { get; init; } = 15L * 1024 * 1024;
    public int TranskriptionsanfragenProStunde { get; init; } = 60;
    public int BildanfragenProStunde { get; init; } = 1000;
    public int TranskriptionenJeFreigabe { get; init; } = 20;
    public int BilderJeFreigabe { get; init; } = 500;
    public int MaximaleProtokollpunkteJeUebergabe { get; init; } = 200;
    public TimeSpan RatenlimitFenster { get; init; } = TimeSpan.FromHours(1);
    public TimeSpan OpenAiZeitlimit { get; init; } = TimeSpan.FromSeconds(120);
    public string Url { get; init; } = "http://127.0.0.1:5187";
    public string Modell { get; init; } = "gpt-transcribe";
    public string Strukturmodell { get; init; } = "gpt-6-luna";
    public string? ApiKey { get; init; }
    public string? KiKonfigurationsfehler { get; init; }
    public string? ErlaubterUrsprung { get; init; }
    public string? ErlaubtesProxyNetz { get; init; }
    public Uri? HappyHourBasisadresse { get; init; }

    public static PlauderBoxOptionen Lade(IConfiguration konfiguration)
    {
        (string? apiKey, string? fehler) = LadeApiKey(konfiguration);
        Uri? happyHourBasisadresse = Uri.TryCreate(
            konfiguration["PlauderBox:HappyHour:Basisadresse"]?.TrimEnd('/') + "/",
            UriKind.Absolute,
            out Uri? konfigurierteHappyHourBasisadresse)
            ? konfigurierteHappyHourBasisadresse
            : null;

        return new PlauderBoxOptionen
        {
            Url = konfiguration["PlauderBox:Url"] ?? "http://127.0.0.1:5187",
            Modell = konfiguration["PlauderBox:KI:Modell"] ?? "gpt-transcribe",
            Strukturmodell = konfiguration["PlauderBox:KI:Strukturmodell"] ?? "gpt-6-luna",
            ApiKey = apiKey,
            KiKonfigurationsfehler = fehler,
            ErlaubterUrsprung = konfiguration["PlauderBox:ErlaubterUrsprung"]?.TrimEnd('/'),
            ErlaubtesProxyNetz = konfiguration["PlauderBox:ErlaubtesProxyNetz"],
            HappyHourBasisadresse = happyHourBasisadresse
        };
    }

    private static (string? Schluessel, string? Fehler) LadeApiKey(IConfiguration konfiguration)
    {
        string? direkt = konfiguration["PlauderBox:KI:ApiKey"];
        if (!string.IsNullOrWhiteSpace(direkt)) return (direkt.Trim(), null);

        string? datei = konfiguration["PlauderBox:KI:Schluesseldatei"];
        if (string.IsNullOrWhiteSpace(datei))
            return (null, "Kein serverseitiger OpenAI-Schlüssel konfiguriert.");
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
}
