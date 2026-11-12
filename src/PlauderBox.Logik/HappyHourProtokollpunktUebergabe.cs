namespace PlauderBox.Logik;

public sealed record ProtokollpunktUebergabeEintrag(
    Guid ErfassungsId,
    int? VorbereiteterProtokollpunktId,
    int ProtokollpunktArtId,
    int ProjektAnsprechpartnerId,
    string Gruppe,
    string Thema,
    string Inhalt,
    string? Rechtsverweis);

public sealed record ProtokollpunktUebergabeErgebnis(
    Guid ErfassungsId,
    int ProtokollpunktId,
    bool Erstellt);

public sealed record ProtokollpunktBildUebergabe(
    Guid BildId,
    int ProtokollpunktId,
    string Dateiname,
    string Medientyp,
    DateTimeOffset Aufnahmezeitpunkt,
    byte[] Inhalt);

public sealed record ProtokollpunktBildUebergabeErgebnis(
    Guid BildId,
    int ProtokollpunktId,
    int DokumentId,
    bool Erstellt);

public sealed record BegehungUebergabeAnforderung(
    string FreigabeToken,
    string BegehungStatus,
    IReadOnlyList<ProtokollpunktUebergabeEintrag> Eintraege);

public enum BegehungUebergabePruefergebnis
{
    Gueltig,
    FreigabeUngueltig,
    AnzahlUngueltig,
    DoppelteErfassungsId,
    DoppelteVorbereitetePunktId,
    EintragUngueltig
}

public static class BegehungUebergabePruefung
{
    public static BegehungUebergabePruefergebnis Pruefe(
        BegehungUebergabeAnforderung anforderung,
        int maximaleAnzahlEintraege)
    {
        if (!RundgangsfreigabeToken.TryCreate(anforderung.FreigabeToken, out _))
            return BegehungUebergabePruefergebnis.FreigabeUngueltig;
        if (!string.Equals(anforderung.BegehungStatus, "lokal_abgeschlossen", StringComparison.Ordinal))
            return BegehungUebergabePruefergebnis.EintragUngueltig;
        if (anforderung.Eintraege is null
            || anforderung.Eintraege.Count < 1
            || anforderung.Eintraege.Count > maximaleAnzahlEintraege)
            return BegehungUebergabePruefergebnis.AnzahlUngueltig;
        if (anforderung.Eintraege.Select(x => x.ErfassungsId).Distinct().Count() != anforderung.Eintraege.Count)
            return BegehungUebergabePruefergebnis.DoppelteErfassungsId;
        int[] vorbereiteteIds = anforderung.Eintraege
            .Where(x => x.VorbereiteterProtokollpunktId.HasValue)
            .Select(x => x.VorbereiteterProtokollpunktId!.Value)
            .ToArray();
        if (vorbereiteteIds.Distinct().Count() != vorbereiteteIds.Length)
            return BegehungUebergabePruefergebnis.DoppelteVorbereitetePunktId;
        if (anforderung.Eintraege.Any(IstUngueltig))
            return BegehungUebergabePruefergebnis.EintragUngueltig;
        return BegehungUebergabePruefergebnis.Gueltig;
    }

    private static bool IstUngueltig(ProtokollpunktUebergabeEintrag eintrag) =>
        eintrag.ErfassungsId == Guid.Empty || eintrag.ProtokollpunktArtId <= 0
        || eintrag.ProjektAnsprechpartnerId <= 0
        || string.IsNullOrWhiteSpace(eintrag.Gruppe) || eintrag.Gruppe.Trim().Length > 250
        || string.IsNullOrWhiteSpace(eintrag.Thema) || eintrag.Thema.Trim().Length > 250
        || string.IsNullOrWhiteSpace(eintrag.Inhalt)
        || (eintrag.Rechtsverweis?.Trim().Length ?? 0) > 250;
}

public interface IHappyHourProtokollpunktZiel
{
    Task<ProtokollpunktUebergabeErgebnis> SchreibeAsync(
        string freigabeToken,
        ProtokollpunktUebergabeEintrag eintrag,
        CancellationToken cancellationToken);
}

public interface IHappyHourProtokollpunktBildZiel
{
    Task<ProtokollpunktBildUebergabeErgebnis> SchreibeBildAsync(
        string freigabeToken,
        ProtokollpunktBildUebergabe bild,
        CancellationToken cancellationToken);
}

public sealed class HappyHourUebergabeKonfliktException : Exception;
public sealed class HappyHourUebergabeUngueltigException : Exception;
public sealed class HappyHourBildkontingentException : Exception;
