using Microsoft.Extensions.Caching.Memory;

namespace PlauderBox.UI.Sicherheit;

public sealed class Freigabekontingent
{
    private readonly IMemoryCache _cache;
    private readonly PlauderBoxOptionen _optionen;
    private readonly object _sperre = new();

    public Freigabekontingent(IMemoryCache cache, PlauderBoxOptionen optionen)
    {
        _cache = cache;
        _optionen = optionen;
    }

    public bool Reserviere(string art, string freigabeToken, int grenze)
    {
        string schluessel = "PlauderBox.FreigabeKontingent:" + art + ":" + freigabeToken;
        lock (_sperre)
        {
            int anzahl = _cache.TryGetValue(schluessel, out int vorhanden) ? vorhanden : 0;
            if (anzahl >= grenze) return false;
            _cache.Set(schluessel, anzahl + 1, _optionen.RatenlimitFenster);
            return true;
        }
    }
}
