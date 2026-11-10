namespace PlauderBox.Logik;

/// <summary>
/// Extrahiert erkennbare Ordnungskriterien aus einem Transkript, ohne fehlende Angaben zu erfinden.
/// </summary>
public interface IProtokollpunktStrukturierer
{
    Task<ProtokollpunktStrukturierung> StrukturierenAsync(
        string transkript,
        CancellationToken cancellationToken);
}

/// <summary>
/// Strukturierte, noch zu kontrollierende Vorschläge für einen lokalen Protokollpunkt.
/// </summary>
public sealed record ProtokollpunktStrukturierung(
    string Gruppe,
    string Thema,
    string Inhalt,
    string Rechtsverweis);
