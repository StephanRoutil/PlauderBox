namespace PlauderBox.Logik;

public sealed record HappyHourProjektKontext(int Id, decimal Nummer, string Bezeichnung);
public sealed record HappyHourObjektKontext(int Id, string Bezeichnung, string? Adresse, string? Gemeinde);
public sealed record HappyHourMitarbeiterKontext(int Id, string Name);
public sealed record HappyHourVerteilerEintrag(
    int Id,
    int ProjektAnsprechpartnerId,
    string Person,
    string? Firma,
    string? Funktion,
    bool IstTeilnehmer,
    bool IstCc,
    bool IstProtokollschreiber);
#pragma warning disable CA1720 // "Guid" ist Teil des unveränderlichen HappyHour-Vertrags.
public sealed record HappyHourProtokollpunktKontext(
    int Id,
    Guid Guid,
    int ProtokollpunktArtId,
    int? ProjektAnsprechpartnerId,
    string Gruppe,
    int Reihenfolge,
    string Thema,
    string Inhalt,
    string? Rechtsverweis);
#pragma warning restore CA1720
public sealed record HappyHourProtokollpunktArtKontext(int Id, string Bezeichnung);
public sealed record HappyHourProtokollKontext(
    int ProtokollId,
    int ProtokollNummer,
    string Thema,
    string Typ,
    string Status,
    string Datum,
    string? Ort,
    HappyHourProjektKontext Projekt,
    HappyHourObjektKontext? Objekt,
    HappyHourMitarbeiterKontext Mitarbeiter,
    IReadOnlyList<string> Traktanden,
    IReadOnlyList<HappyHourVerteilerEintrag> Verteiler,
    IReadOnlyList<HappyHourProtokollpunktKontext> Protokollpunkte,
    IReadOnlyList<HappyHourProtokollpunktArtKontext> ProtokollpunktArten);

public interface IHappyHourFreigabeQuelle
{
    Task<HappyHourProtokollKontext> LadeAsync(string freigabeToken, CancellationToken cancellationToken);
}

public sealed class HappyHourNichtKonfiguriertException : Exception;
public sealed class HappyHourFreigabeUngueltigException : Exception;
public sealed class HappyHourNichtErreichbarException : Exception;
public sealed class HappyHourAntwortUngueltigException : Exception;
