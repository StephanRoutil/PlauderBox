using System.Net;
using System.Net.Http.Json;
using PlauderBox.Logik;

namespace PlauderBox.Datenmanagement;

public sealed class HappyHourFreigabeQuelle(HttpClient httpClient, Uri? basisadresse) : IHappyHourFreigabeQuelle, IHappyHourProtokollpunktZiel, IHappyHourProtokollpunktBildZiel
{
    public async Task<HappyHourProtokollKontext> LadeAsync(string freigabeToken, CancellationToken cancellationToken)
    {
        using HttpRequestMessage anfrage = new(HttpMethod.Get, ErstelleAdresse(freigabeToken, string.Empty));
        anfrage.Headers.Accept.ParseAdd("application/json");
        using HttpResponseMessage antwort = await SendeAsync(anfrage, HappyHourAnfrageart.Lesen, cancellationToken);
        HappyHourFreigabeAntwort? freigabe = await LeseAntwortAsync<HappyHourFreigabeAntwort>(antwort, cancellationToken);
        HappyHourAntwort? daten = freigabe?.Protokoll;
        if (daten?.Projekt is null || daten.Mitarbeiter is null || daten.intProtokollID <= 0)
            throw new HappyHourAntwortUngueltigException();
        return daten.InKontext();
    }

    public async Task<ProtokollpunktUebergabeErgebnis> SchreibeAsync(
        string freigabeToken,
        ProtokollpunktUebergabeEintrag eintrag,
        CancellationToken cancellationToken)
    {
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
            ErstelleAdresse(freigabeToken, "Protokollpunkt"))
        {
            Content = JsonContent.Create(inhalt)
        };
        anfrage.Headers.Accept.ParseAdd("application/json");

        using HttpResponseMessage antwort = await SendeAsync(anfrage, HappyHourAnfrageart.Schreiben, cancellationToken);
        ProtokollpunktSchreibantwort? ergebnis = await LeseAntwortAsync<ProtokollpunktSchreibantwort>(antwort, cancellationToken);
        if (ergebnis is null || ergebnis.intProtokollpunktID <= 0 || ergebnis.GUID != eintrag.ErfassungsId)
            throw new HappyHourAntwortUngueltigException();
        return new ProtokollpunktUebergabeErgebnis(
            ergebnis.GUID,
            ergebnis.intProtokollpunktID,
            ergebnis.blnErstellt);
    }

    public async Task<ProtokollpunktBildUebergabeErgebnis> SchreibeBildAsync(
        string freigabeToken,
        ProtokollpunktBildUebergabe bild,
        CancellationToken cancellationToken)
    {
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
            ErstelleAdresse(freigabeToken, $"Protokollpunkt/{bild.ProtokollpunktId}/Bild/{escapedBildId}?aufnahmezeitpunkt={escapedAufnahmezeitpunkt}"))
        {
            Content = datei
        };
        anfrage.Headers.Accept.ParseAdd("application/json");

        using HttpResponseMessage antwort = await SendeAsync(anfrage, HappyHourAnfrageart.BildSchreiben, cancellationToken);
        ProtokollpunktBildSchreibantwort? ergebnis = await LeseAntwortAsync<ProtokollpunktBildSchreibantwort>(antwort, cancellationToken);
        if (ergebnis is null || ergebnis.intDokumentID <= 0 ||
            ergebnis.intProtokollpunktID != bild.ProtokollpunktId || ergebnis.GUID != bild.BildId)
            throw new HappyHourAntwortUngueltigException();
        return new ProtokollpunktBildUebergabeErgebnis(
            ergebnis.GUID,
            ergebnis.intProtokollpunktID,
            ergebnis.intDokumentID,
            ergebnis.blnErstellt);
    }

    private Uri ErstelleAdresse(string freigabeToken, string relativerPfad)
    {
        if (!RundgangsfreigabeToken.TryCreate(freigabeToken, out RundgangsfreigabeToken? token) || token is null)
            throw new HappyHourFreigabeUngueltigException();
        if (basisadresse is null) throw new HappyHourNichtKonfiguriertException();
        string escapedToken = Uri.EscapeDataString(token.Wert);
        string suffix = string.IsNullOrEmpty(relativerPfad) ? string.Empty : $"/{relativerPfad}";
        return new Uri(basisadresse, $"api.svc/PlauderBox/Freigabe/{escapedToken}{suffix}");
    }

    private async Task<HttpResponseMessage> SendeAsync(
        HttpRequestMessage anfrage,
        HappyHourAnfrageart anfrageart,
        CancellationToken cancellationToken)
    {
        HttpResponseMessage antwort;
        try
        {
            antwort = await httpClient.SendAsync(anfrage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException)
        {
            throw new HappyHourNichtErreichbarException();
        }

        if (antwort.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
            or HttpStatusCode.NotFound or HttpStatusCode.Gone or HttpStatusCode.Redirect)
            return VerwerfeMit(antwort, new HappyHourFreigabeUngueltigException());
        if (anfrageart is not HappyHourAnfrageart.Lesen && antwort.StatusCode is HttpStatusCode.BadRequest)
            return VerwerfeMit(antwort, new HappyHourUebergabeUngueltigException());
        if (anfrageart is not HappyHourAnfrageart.Lesen && antwort.StatusCode is HttpStatusCode.Conflict)
            return VerwerfeMit(antwort, new HappyHourUebergabeKonfliktException());
        if (anfrageart is HappyHourAnfrageart.BildSchreiben && antwort.StatusCode is HttpStatusCode.TooManyRequests)
            return VerwerfeMit(antwort, new HappyHourBildkontingentException());
        if (!antwort.IsSuccessStatusCode)
            return VerwerfeMit(antwort, new HappyHourNichtErreichbarException());
        return antwort;
    }

    private static async Task<T?> LeseAntwortAsync<T>(HttpResponseMessage antwort, CancellationToken cancellationToken)
    {
        try
        {
            return await antwort.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (ex is System.Text.Json.JsonException or NotSupportedException)
        {
            throw new HappyHourAntwortUngueltigException();
        }
    }

    private static HttpResponseMessage VerwerfeMit(HttpResponseMessage antwort, Exception exception)
    {
        antwort.Dispose();
        throw exception;
    }

    private enum HappyHourAnfrageart
    {
        Lesen,
        Schreiben,
        BildSchreiben
    }

}
