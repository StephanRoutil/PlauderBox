using System.Text.Json;
using System.Globalization;

namespace PlauderBox.UI;

public sealed class PlauderBoxOptionen
{
    public long MaximaleAudiodateigroesseBytes { get; init; } = 20L * 1024 * 1024;
    public long MaximaleBilddateigroesseBytes { get; init; } = 15L * 1024 * 1024;
    public int TranskriptionsanfragenProStunde { get; init; } = 60;
    public int BildanfragenProStunde { get; init; } = 1000;
    public int FreigabeabrufeProStunde { get; init; } = 60;
    public int PunktuebergabenProStunde { get; init; } = 30;
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
            MaximaleAudiodateigroesseBytes = LeseLong(konfiguration, "MaximaleAudiodateigroesseBytes", 20L * 1024 * 1024, 1, 1024L * 1024 * 1024),
            MaximaleBilddateigroesseBytes = LeseLong(konfiguration, "MaximaleBilddateigroesseBytes", 15L * 1024 * 1024, 1, 1024L * 1024 * 1024),
            TranskriptionsanfragenProStunde = LeseInt(konfiguration, "TranskriptionsanfragenProStunde", 60, 1, 1_000_000),
            BildanfragenProStunde = LeseInt(konfiguration, "BildanfragenProStunde", 1000, 1, 1_000_000),
            FreigabeabrufeProStunde = LeseInt(konfiguration, "FreigabeabrufeProStunde", 60, 1, 1_000_000),
            PunktuebergabenProStunde = LeseInt(konfiguration, "PunktuebergabenProStunde", 30, 1, 1_000_000),
            TranskriptionenJeFreigabe = LeseInt(konfiguration, "TranskriptionenJeFreigabe", 20, 1, 1_000_000),
            BilderJeFreigabe = LeseInt(konfiguration, "BilderJeFreigabe", 500, 1, 1_000_000),
            MaximaleProtokollpunkteJeUebergabe = LeseInt(konfiguration, "MaximaleProtokollpunkteJeUebergabe", 200, 1, 10_000),
            RatenlimitFenster = TimeSpan.FromSeconds(LeseInt(konfiguration, "RatenlimitFensterSekunden", 3600, 1, 86_400)),
            OpenAiZeitlimit = TimeSpan.FromSeconds(LeseInt(konfiguration, "OpenAiZeitlimitSekunden", 120, 1, 86_400)),
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

    public static string FormatiereMegabyte(long bytes)
    {
        return (bytes / (1024d * 1024d)).ToString("0.##", CultureInfo.InvariantCulture) + " MB";
    }

    private static int LeseInt(IConfiguration konfiguration, string name, int standard, int minimum, int maximum)
    {
        string? rohwert = konfiguration[$"PlauderBox:Grenzen:{name}"];
        if (string.IsNullOrWhiteSpace(rohwert)) return standard;
        if (!int.TryParse(rohwert, NumberStyles.Integer, CultureInfo.InvariantCulture, out int wert)
            || wert < minimum
            || wert > maximum)
            throw new InvalidOperationException($"PlauderBox:Grenzen:{name} muss zwischen {minimum} und {maximum} liegen.");
        return wert;
    }

    private static long LeseLong(IConfiguration konfiguration, string name, long standard, long minimum, long maximum)
    {
        string? rohwert = konfiguration[$"PlauderBox:Grenzen:{name}"];
        if (string.IsNullOrWhiteSpace(rohwert)) return standard;
        if (!long.TryParse(rohwert, NumberStyles.Integer, CultureInfo.InvariantCulture, out long wert)
            || wert < minimum
            || wert > maximum)
            throw new InvalidOperationException($"PlauderBox:Grenzen:{name} muss zwischen {minimum} und {maximum} liegen.");
        return wert;
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
