using Microsoft.Extensions.Caching.Memory;

namespace PlauderBox.UI.Sicherheit;

public sealed class Freigabekontingent
{
    private readonly IMemoryCache _cache;
    private readonly PlauderBoxOptionen _optionen;
    private readonly TimeProvider _zeit;
    private readonly object _sperre = new();

    public Freigabekontingent(IMemoryCache cache, PlauderBoxOptionen optionen, TimeProvider? zeit = null)
    {
        _cache = cache;
        _optionen = optionen;
        _zeit = zeit ?? TimeProvider.System;
    }

    public bool Reserviere(string art, string freigabeToken, int grenze)
    {
        string schluessel = "PlauderBox.FreigabeKontingent:" + art + ":" + freigabeToken;
        lock (_sperre)
        {
            DateTimeOffset jetzt = _zeit.GetUtcNow();
            Kontingentstand stand = _cache.TryGetValue(schluessel, out Kontingentstand? vorhanden)
                && vorhanden is not null
                && jetzt < vorhanden.Fensterbeginn + _optionen.RatenlimitFenster
                    ? vorhanden
                    : new Kontingentstand(jetzt, 0);
            if (stand.Anzahl >= grenze) return false;
            Kontingentstand aktualisiert = stand with { Anzahl = stand.Anzahl + 1 };
            _cache.Set(schluessel, aktualisiert, stand.Fensterbeginn + _optionen.RatenlimitFenster);
            return true;
        }
    }

    private sealed record Kontingentstand(DateTimeOffset Fensterbeginn, int Anzahl);
}
