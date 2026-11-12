using System.Text.Json.Serialization;
using PlauderBox.Logik;

namespace PlauderBox.Datenmanagement;

internal sealed class HappyHourFreigabeAntwort
{
    public HappyHourAntwort? Protokoll { get; init; }
    public string strScope { get; init; } = string.Empty;
    public string datAblaufUtc { get; init; } = string.Empty;
}

internal sealed class HappyHourAntwort
{
    public int intProtokollID { get; init; }
    public int intProtokollNr { get; init; }
    public string strProtokoll { get; init; } = string.Empty;
    public string strProtokollTyp { get; init; } = string.Empty;
    public string strProtokollStatus { get; init; } = string.Empty;
    public string datProtokoll { get; init; } = string.Empty;
    public string? strOrt { get; init; }
    public ProjektAntwort? Projekt { get; init; }
    public ObjektAntwort? Objekt { get; init; }
    public MitarbeiterAntwort? Mitarbeiter { get; init; }
    public List<string> Traktanden { get; init; } = [];
    public List<VerteilerAntwort> Verteiler { get; init; } = [];
    public List<ProtokollpunktAntwort> Protokollpunkte { get; init; } = [];
    public List<ProtokollpunktArtAntwort> ProtokollpunktArten { get; init; } = [];

    internal HappyHourProtokollKontext InKontext() => new(
        intProtokollID, intProtokollNr, strProtokoll, strProtokollTyp, strProtokollStatus, datProtokoll, strOrt,
        Projekt!.InKontext(), Objekt?.InKontext(), Mitarbeiter!.InKontext(), Traktanden,
        Verteiler.Select(x => x.InKontext()).ToList(), Protokollpunkte.Select(x => x.InKontext()).ToList(),
        ProtokollpunktArten.Select(x => x.InKontext()).ToList());
}

internal sealed record ProjektAntwort(int intProjektID, decimal decProjektNr, string strProjekt)
{
    internal HappyHourProjektKontext InKontext() => new(intProjektID, decProjektNr, strProjekt);
}

internal sealed record ObjektAntwort(int intObjektID, string strObjekt, string? strObjektAdresse, string? strObjektGemeinde)
{
    internal HappyHourObjektKontext InKontext() => new(intObjektID, strObjekt, strObjektAdresse, strObjektGemeinde);
}

internal sealed record MitarbeiterAntwort(int intMitarbeiterID, string strMitarbeiter)
{
    internal HappyHourMitarbeiterKontext InKontext() => new(intMitarbeiterID, strMitarbeiter);
}

internal sealed record VerteilerAntwort(
    int intProtokollTeilnehmerID,
    int intProjektAnsprechpartnerFKID,
    string strPerson,
    string? strFirma,
    string? strFunktion,
    bool blnTeilnehmer,
    bool blnCC,
    bool blnProtokollSchreiber)
{
    internal HappyHourVerteilerEintrag InKontext() => new(
        intProtokollTeilnehmerID, intProjektAnsprechpartnerFKID, strPerson, strFirma, strFunktion,
        blnTeilnehmer, blnCC, blnProtokollSchreiber);
}

internal sealed record ProtokollpunktAntwort(
    int intProtokollpunktID,
    Guid GUID,
    int intProtokollpunktArtFKID,
    int? intProjektAnsprechpartnerFKID,
    string strGruppe,
    int intReihenfolge,
    string strProtokollpunkt,
    string txtProtokollpunkt,
    string? strRechtsverweis)
{
    internal HappyHourProtokollpunktKontext InKontext() => new(
        intProtokollpunktID, GUID, intProtokollpunktArtFKID, intProjektAnsprechpartnerFKID, strGruppe, intReihenfolge,
        strProtokollpunkt, txtProtokollpunkt, strRechtsverweis);
}

internal sealed record ProtokollpunktArtAntwort(int intProtokollpunktArtID, string strProtokollpunktArt)
{
    internal HappyHourProtokollpunktArtKontext InKontext() => new(intProtokollpunktArtID, strProtokollpunktArt);
}

internal sealed record ProtokollpunktSchreibanforderung(
    [property: JsonPropertyName("GUID")] Guid GUID,
    int? intVorbereiteterProtokollpunktID,
    int intProtokollpunktArtFKID,
    int intProjektAnsprechpartnerFKID,
    string strGruppe,
    string strProtokollpunkt,
    string txtProtokollpunkt,
    string? strRechtsverweis);

internal sealed class ProtokollpunktSchreibantwort
{
    public int intProtokollpunktID { get; init; }
    public Guid GUID { get; init; }
    public bool blnErstellt { get; init; }
}

internal sealed class ProtokollpunktBildSchreibantwort
{
    public int intProtokollpunktID { get; init; }
    public Guid GUID { get; init; }
    public int intDokumentID { get; init; }
    public bool blnErstellt { get; init; }
}
