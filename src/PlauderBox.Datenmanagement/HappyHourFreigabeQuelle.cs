using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using PlauderBox.Logik;

namespace PlauderBox.Datenmanagement;

public sealed class HappyHourFreigabeQuelle(HttpClient httpClient, Uri? basisadresse) : IHappyHourFreigabeQuelle, IHappyHourProtokollpunktZiel, IHappyHourProtokollpunktBildZiel
{
    public async Task<HappyHourProtokollKontext> LadeAsync(string freigabeToken, CancellationToken cancellationToken)
    {
        if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? token) || token is null)
            throw new HappyHourFreigabeUngueltigException();
        if (basisadresse is null) throw new HappyHourNichtKonfiguriertException();

        string escapedToken = Uri.EscapeDataString(token.Wert);
        using HttpRequestMessage anfrage = new(HttpMethod.Get, new Uri(basisadresse, $"api.svc/PlauderBox/Freigabe/{escapedToken}"));
        anfrage.Headers.Accept.ParseAdd("application/json");
        HttpResponseMessage antwort;
        try
        {
            antwort = await httpClient.SendAsync(anfrage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException)
        {
            throw new HappyHourNichtErreichbarException();
        }

        using (antwort)
        {
            if (antwort.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
                or HttpStatusCode.NotFound or HttpStatusCode.Gone or HttpStatusCode.Redirect)
                throw new HappyHourFreigabeUngueltigException();
            if (!antwort.IsSuccessStatusCode)
                throw new HappyHourNichtErreichbarException();

            HappyHourFreigabeAntwort? freigabe;
            try
            {
                freigabe = await antwort.Content.ReadFromJsonAsync<HappyHourFreigabeAntwort>(cancellationToken: cancellationToken);
            }
            catch (Exception ex) when (ex is System.Text.Json.JsonException or NotSupportedException)
            {
                throw new HappyHourAntwortUngueltigException();
            }
            HappyHourAntwort? daten = freigabe?.Protokoll;
            if (daten?.Projekt is null || daten.Mitarbeiter is null || daten.intProtokollID <= 0)
                throw new HappyHourAntwortUngueltigException();
            return daten.InKontext();
        }
    }

    public async Task<ProtokollpunktUebergabeErgebnis> SchreibeAsync(
        string freigabeToken,
        ProtokollpunktUebergabeEintrag eintrag,
        CancellationToken cancellationToken)
    {
        if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? token) || token is null)
            throw new HappyHourFreigabeUngueltigException();
        if (basisadresse is null) throw new HappyHourNichtKonfiguriertException();

        string escapedToken = Uri.EscapeDataString(token.Wert);
        var inhalt = new ProtokollpunktSchreibanforderung(
            eintrag.ErfassungsId,
            eintrag.VorbereiteterProtokollpunktId,
            eintrag.ProtokollpunktArtId,
            eintrag.ProjektAnsprechpartnerId,
            eintrag.Gruppe,
            eintrag.Thema,
            eintrag.Inhalt,
            eintrag.Rechtsverweis);
        using HttpRequestMessage anfrage = new(
            HttpMethod.Post,
            new Uri(basisadresse, $"api.svc/PlauderBox/Freigabe/{escapedToken}/Protokollpunkt"))
        {
            Content = JsonContent.Create(inhalt)
        };
        anfrage.Headers.Accept.ParseAdd("application/json");

        HttpResponseMessage antwort;
        try
        {
            antwort = await httpClient.SendAsync(anfrage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException)
        {
            throw new HappyHourNichtErreichbarException();
        }

        using (antwort)
        {
            if (antwort.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
                or HttpStatusCode.NotFound or HttpStatusCode.Gone or HttpStatusCode.Redirect)
                throw new HappyHourFreigabeUngueltigException();
            if (antwort.StatusCode is HttpStatusCode.BadRequest)
                throw new HappyHourUebergabeUngueltigException();
            if (antwort.StatusCode is HttpStatusCode.Conflict)
                throw new HappyHourUebergabeKonfliktException();
            if (!antwort.IsSuccessStatusCode)
                throw new HappyHourNichtErreichbarException();

            ProtokollpunktSchreibantwort? ergebnis;
            try
            {
                ergebnis = await antwort.Content.ReadFromJsonAsync<ProtokollpunktSchreibantwort>(
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex) when (ex is System.Text.Json.JsonException or NotSupportedException)
            {
                throw new HappyHourAntwortUngueltigException();
            }

            if (ergebnis is null || ergebnis.intProtokollpunktID <= 0 || ergebnis.GUID != eintrag.ErfassungsId)
                throw new HappyHourAntwortUngueltigException();
            return new ProtokollpunktUebergabeErgebnis(
                ergebnis.GUID,
                ergebnis.intProtokollpunktID,
                ergebnis.blnErstellt);
        }
    }

    public async Task<ProtokollpunktBildUebergabeErgebnis> SchreibeBildAsync(
        string freigabeToken,
        ProtokollpunktBildUebergabe bild,
        CancellationToken cancellationToken)
    {
        if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? token) || token is null)
            throw new HappyHourFreigabeUngueltigException();
        if (basisadresse is null) throw new HappyHourNichtKonfiguriertException();

        string escapedToken = Uri.EscapeDataString(token.Wert);
        string escapedBildId = Uri.EscapeDataString(bild.BildId.ToString("D"));
        string escapedAufnahmezeitpunkt = Uri.EscapeDataString(
            bild.Aufnahmezeitpunkt.ToUniversalTime().ToString("O", System.Globalization.CultureInfo.InvariantCulture));
        using ByteArrayContent datei = new(bild.Inhalt);
        if (!System.Net.Http.Headers.MediaTypeHeaderValue.TryParse(bild.Medientyp, out var medientyp)
            || !medientyp.MediaType!.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            medientyp = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        datei.Headers.ContentType = medientyp;
        using HttpRequestMessage anfrage = new(
            HttpMethod.Post,
            new Uri(basisadresse, $"api.svc/PlauderBox/Freigabe/{escapedToken}/Protokollpunkt/{bild.ProtokollpunktId}/Bild/{escapedBildId}?aufnahmezeitpunkt={escapedAufnahmezeitpunkt}"))
        {
            Content = datei
        };
        anfrage.Headers.Accept.ParseAdd("application/json");

        HttpResponseMessage antwort;
        try
        {
            antwort = await httpClient.SendAsync(anfrage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException)
        {
            throw new HappyHourNichtErreichbarException();
        }

        using (antwort)
        {
            if (antwort.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
                or HttpStatusCode.NotFound or HttpStatusCode.Gone or HttpStatusCode.Redirect)
                throw new HappyHourFreigabeUngueltigException();
            if (antwort.StatusCode is HttpStatusCode.BadRequest)
                throw new HappyHourUebergabeUngueltigException();
            if (antwort.StatusCode is HttpStatusCode.Conflict)
                throw new HappyHourUebergabeKonfliktException();
            if (antwort.StatusCode is HttpStatusCode.TooManyRequests)
                throw new HappyHourBildkontingentException();
            if (!antwort.IsSuccessStatusCode)
                throw new HappyHourNichtErreichbarException();

            ProtokollpunktBildSchreibantwort? ergebnis;
            try
            {
                ergebnis = await antwort.Content.ReadFromJsonAsync<ProtokollpunktBildSchreibantwort>(
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex) when (ex is System.Text.Json.JsonException or NotSupportedException)
            {
                throw new HappyHourAntwortUngueltigException();
            }

            if (ergebnis is null || ergebnis.intDokumentID <= 0 ||
                ergebnis.intProtokollpunktID != bild.ProtokollpunktId || ergebnis.GUID != bild.BildId)
                throw new HappyHourAntwortUngueltigException();
            return new ProtokollpunktBildUebergabeErgebnis(
                ergebnis.GUID,
                ergebnis.intProtokollpunktID,
                ergebnis.intDokumentID,
                ergebnis.blnErstellt);
        }
    }

    private sealed class HappyHourFreigabeAntwort
    {
        public HappyHourAntwort? Protokoll { get; init; }
        public string strScope { get; init; } = string.Empty;
        public string datAblaufUtc { get; init; } = string.Empty;
    }

    private sealed class HappyHourAntwort
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

        public HappyHourProtokollKontext InKontext() => new(
            intProtokollID, intProtokollNr, strProtokoll, strProtokollTyp, strProtokollStatus, datProtokoll, strOrt,
            Projekt!.InKontext(), Objekt?.InKontext(), Mitarbeiter!.InKontext(), Traktanden,
            Verteiler.Select(x => x.InKontext()).ToList(), Protokollpunkte.Select(x => x.InKontext()).ToList(),
            ProtokollpunktArten.Select(x => x.InKontext()).ToList());
    }

    private sealed record ProjektAntwort(int intProjektID, decimal decProjektNr, string strProjekt)
    {
        public HappyHourProjektKontext InKontext() => new(intProjektID, decProjektNr, strProjekt);
    }
    private sealed record ObjektAntwort(int intObjektID, string strObjekt, string? strObjektAdresse, string? strObjektGemeinde)
    {
        public HappyHourObjektKontext InKontext() => new(intObjektID, strObjekt, strObjektAdresse, strObjektGemeinde);
    }
    private sealed record MitarbeiterAntwort(int intMitarbeiterID, string strMitarbeiter)
    {
        public HappyHourMitarbeiterKontext InKontext() => new(intMitarbeiterID, strMitarbeiter);
    }
    private sealed record VerteilerAntwort(
        int intProtokollTeilnehmerID,
        int intProjektAnsprechpartnerFKID,
        string strPerson,
        string? strFirma,
        string? strFunktion,
        bool blnTeilnehmer,
        bool blnCC,
        bool blnProtokollSchreiber)
    {
        public HappyHourVerteilerEintrag InKontext() => new(
            intProtokollTeilnehmerID, intProjektAnsprechpartnerFKID, strPerson, strFirma, strFunktion,
            blnTeilnehmer, blnCC, blnProtokollSchreiber);
    }
    private sealed record ProtokollpunktAntwort(
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
        public HappyHourProtokollpunktKontext InKontext() => new(
            intProtokollpunktID, GUID, intProtokollpunktArtFKID, intProjektAnsprechpartnerFKID, strGruppe, intReihenfolge,
            strProtokollpunkt, txtProtokollpunkt, strRechtsverweis);
    }

    private sealed record ProtokollpunktArtAntwort(int intProtokollpunktArtID, string strProtokollpunktArt)
    {
        public HappyHourProtokollpunktArtKontext InKontext() => new(intProtokollpunktArtID, strProtokollpunktArt);
    }

    private sealed record ProtokollpunktSchreibanforderung(
        [property: JsonPropertyName("GUID")] Guid GUID,
        int? intVorbereiteterProtokollpunktID,
        int intProtokollpunktArtFKID,
        int intProjektAnsprechpartnerFKID,
        string strGruppe,
        string strProtokollpunkt,
        string txtProtokollpunkt,
        string? strRechtsverweis);

    private sealed class ProtokollpunktSchreibantwort
    {
        public int intProtokollpunktID { get; init; }
        public Guid GUID { get; init; }
        public bool blnErstellt { get; init; }
    }

    private sealed class ProtokollpunktBildSchreibantwort
    {
        public int intProtokollpunktID { get; init; }
        public Guid GUID { get; init; }
        public int intDokumentID { get; init; }
        public bool blnErstellt { get; init; }
    }
}
