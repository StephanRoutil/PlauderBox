namespace PlauderBox.Logik;

/// <summary>
/// Kapselt die providerunabhängige Transkription einer Audioaufnahme.
/// </summary>
public interface ITranskriptionsdienst
{
    bool IstKonfiguriert { get; }

    Task<Transkriptionsergebnis> TranskribierenAsync(
        Stream audioInhalt,
        string medientyp,
        string dateiendung,
        CancellationToken cancellationToken);
}

public sealed record Transkriptionsergebnis(string Text);

public static class AudioformatPruefung
{
    public static string? ErmittleDateiendung(string medientyp)
    {
        return medientyp switch
        {
            "audio/webm" => ".webm",
            "audio/ogg" => ".ogg",
            "audio/mp4" => ".mp4",
            "audio/mpeg" => ".mp3",
            "audio/wav" or "audio/x-wav" => ".wav",
            _ => null
        };
    }
}

public abstract class TranskriptionsdienstException : Exception
{
    protected TranskriptionsdienstException(string meldung)
        : base(meldung)
    {
    }
}

public sealed class TranskriptionszugangAbgelehntException : TranskriptionsdienstException
{
    public TranskriptionszugangAbgelehntException()
        : base("Der Transkriptionsanbieter hat den konfigurierten Zugang abgelehnt.")
    {
    }
}

public sealed class TranskriptionskontingentException : TranskriptionsdienstException
{
    public TranskriptionskontingentException()
        : base("Das Transkriptionskontingent ist ausgeschöpft.")
    {
    }
}

public sealed class TranskriptionsaufnahmeUngueltigException : TranskriptionsdienstException
{
    public TranskriptionsaufnahmeUngueltigException()
        : base("Der Transkriptionsanbieter konnte die Aufnahme nicht verarbeiten.")
    {
    }
}

public sealed class TranskriptionsdienstNichtVerfuegbarException : TranskriptionsdienstException
{
    public TranskriptionsdienstNichtVerfuegbarException()
        : base("Der Transkriptionsdienst ist momentan nicht verfügbar.")
    {
    }
}

public sealed class TranskriptionsantwortLeerException : TranskriptionsdienstException
{
    public TranskriptionsantwortLeerException()
        : base("Der Transkriptionsdienst hat keinen Text zurückgegeben.")
    {
    }
}
