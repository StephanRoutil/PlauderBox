namespace PlauderBox.Logik;

public sealed class RundgangsfreigabeToken
{
    private RundgangsfreigabeToken(string wert) => Wert = wert;

    public string Wert { get; }

    public static bool TryCreate(string? rohwert, out RundgangsfreigabeToken? token)
    {
        token = null;
        if (rohwert is null || rohwert.Length is < 32 or > 128) return false;
        if (!rohwert.All(zeichen => char.IsAsciiLetterOrDigit(zeichen) || zeichen is '-' or '_')) return false;
        token = new RundgangsfreigabeToken(rohwert);
        return true;
    }

    public override string ToString() => "[Rundgangsfreigabe redigiert]";
}
