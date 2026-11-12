using PlauderBox.Logik;
using PlauderBox.UI.Sicherheit;

namespace PlauderBox.UI.Endpunkte;

public static class HappyHourEndpunkte
{
    public static void MappeHappyHourEndpunkte(this WebApplication app)
    {
        MappeHappyHourEndpunkte(app, "/api/v1");
        MappeHappyHourEndpunkte(app, "/api");
    }

    private static void MappeHappyHourEndpunkte(WebApplication app, string praefix)
    {
        app.MapGet($"{praefix}/happyhour/freigaben/{{freigabeToken}}", LadeFreigabeAsync)
            .RequireRateLimiting("Freigabeabruf");
        app.MapPost($"{praefix}/happyhour/protokollpunkte/uebergeben", UebergebeProtokollpunkteAsync)
            .DisableAntiforgery()
            .RequireRateLimiting("Punktuebergabe");
        app.MapPost(
                $"{praefix}/happyhour/protokollpunkte/{{protokollpunktId:int}}/bilder/{{bildId:guid}}",
                UebergebeBildAsync)
            .DisableAntiforgery()
            .RequireRateLimiting("Bilduebergabe");
    }

    private static Task<IResult> LadeFreigabeAsync(
        string freigabeToken,
        IHappyHourFreigabeQuelle quelle,
        CancellationToken token)
    {
        return HappyHourFehlerabbildung.FuehreAsync(async () =>
        {
            HappyHourProtokollKontext kontext = await quelle.LadeAsync(freigabeToken, token);
            return Results.Ok(kontext);
        }, HappyHourFehlerkontext.Freigabeabruf);
    }

    private static Task<IResult> UebergebeProtokollpunkteAsync(
        BegehungUebergabeAnforderung anforderung,
        IHappyHourProtokollpunktZiel ziel,
        PlauderBoxOptionen optionen,
        CancellationToken token)
    {
        BegehungUebergabePruefergebnis pruefung = BegehungUebergabePruefung.Pruefe(
            anforderung,
            optionen.MaximaleProtokollpunkteJeUebergabe);
        if (pruefung == BegehungUebergabePruefergebnis.FreigabeUngueltig)
            return Task.FromResult(Results.Problem(
                title: "Rundgangsfreigabe ungültig",
                statusCode: StatusCodes.Status410Gone));
        if (pruefung != BegehungUebergabePruefergebnis.Gueltig)
            return Task.FromResult(Results.Problem(
                title: "Ungültige Übergabe",
                detail: "Die Protokollpunkte sind unvollständig oder widersprüchlich.",
                statusCode: StatusCodes.Status400BadRequest));
        RundgangsfreigabeToken.TryCreate(
            anforderung.FreigabeToken,
            out RundgangsfreigabeToken? freigabe);

        return HappyHourFehlerabbildung.FuehreAsync(async () =>
        {
            List<ProtokollpunktUebergabeErgebnis> ergebnisse = [];
            foreach (ProtokollpunktUebergabeEintrag eintrag in anforderung.Eintraege)
                ergebnisse.Add(await ziel.SchreibeAsync(freigabe!.Wert, eintrag, token));
            return Results.Ok(new { ergebnisse });
        }, HappyHourFehlerkontext.Protokollpunktuebergabe);
    }

    private static Task<IResult> UebergebeBildAsync(
        int protokollpunktId,
        Guid bildId,
        HttpRequest request,
        IHappyHourFreigabeQuelle freigabeQuelle,
        IHappyHourProtokollpunktBildZiel ziel,
        Freigabekontingent freigabekontingent,
        PlauderBoxOptionen optionen,
        CancellationToken token)
    {
        if (protokollpunktId <= 0 || bildId == Guid.Empty || !request.HasFormContentType)
            return Task.FromResult(Results.Problem(
                title: "Ungültige Bildübergabe",
                statusCode: StatusCodes.Status400BadRequest));

        string headerFreigabeToken = request.Headers["X-PlauderBox-Freigabe"].ToString();
        if (!RundgangsfreigabeToken.TryCreate(
                headerFreigabeToken,
                out RundgangsfreigabeToken? headerFreigabe)
            || headerFreigabe is null)
            return Task.FromResult(Results.Problem(
                title: "Rundgangsfreigabe ungültig",
                statusCode: StatusCodes.Status410Gone));

        return HappyHourFehlerabbildung.FuehreAsync(async () =>
        {
            await freigabeQuelle.LadeAsync(headerFreigabe.Wert, token);
            if (!freigabekontingent.Reserviere(
                    "bilder",
                    headerFreigabe.Wert,
                    optionen.BilderJeFreigabe))
                return Results.Problem(
                    title: "Bildkontingent ausgeschöpft",
                    statusCode: StatusCodes.Status429TooManyRequests);

            IFormCollection formular;
            try
            {
                formular = await request.ReadFormAsync(token);
            }
            catch (InvalidDataException)
            {
                return Results.Problem(
                    title: "Das Bild ist zu gross oder ungültig.",
                    statusCode: StatusCodes.Status413PayloadTooLarge);
            }

            string freigabeToken = formular["freigabeToken"].ToString();
            if (!string.Equals(freigabeToken, headerFreigabeToken, StringComparison.Ordinal))
                return Results.Problem(
                    title: "Rundgangsfreigabe ungültig",
                    statusCode: StatusCodes.Status410Gone);
            if (!RundgangsfreigabeToken.TryCreate(
                    freigabeToken,
                    out RundgangsfreigabeToken? freigabe)
                || freigabe is null)
                return Results.Problem(
                    title: "Rundgangsfreigabe ungültig",
                    statusCode: StatusCodes.Status410Gone);

            IFormFile? datei = formular.Files.GetFile("bild");
            if (formular.Files.Count != 1
                || datei is null
                || datei.Length <= 0
                || datei.Length > optionen.MaximaleBilddateigroesseBytes)
                return Results.Problem(
                    title: $"Das Bild ist leer oder grösser als {PlauderBoxOptionen.FormatiereMegabyte(optionen.MaximaleBilddateigroesseBytes)}.",
                    statusCode: StatusCodes.Status400BadRequest);
            if (!DateTimeOffset.TryParse(
                    formular["aufnahmezeitpunkt"].ToString(),
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal
                        | System.Globalization.DateTimeStyles.AdjustToUniversal,
                    out DateTimeOffset aufnahmezeitpunkt))
                return Results.Problem(
                    title: "Der Aufnahmezeitpunkt ist ungültig.",
                    statusCode: StatusCodes.Status400BadRequest);

            await using Stream bildinhalt = datei.OpenReadStream();
            byte[] signatur = new byte[4];
            int signaturlaenge = await bildinhalt.ReadAsync(signatur, token);
            if (!Bildpruefung.IstGueltig(datei.ContentType, signatur.AsSpan(0, signaturlaenge)))
                return Results.Problem(
                    title: "Das Bildformat stimmt nicht mit dem Bildinhalt überein.",
                    statusCode: StatusCodes.Status400BadRequest);
            bildinhalt.Position = 0;
            ProtokollpunktBildUebergabeErgebnis ergebnis = await ziel.SchreibeBildAsync(
                freigabe.Wert,
                new ProtokollpunktBildUebergabe(
                    bildId,
                    protokollpunktId,
                    Path.GetFileName(datei.FileName),
                    datei.ContentType,
                    aufnahmezeitpunkt,
                    bildinhalt),
                token);
            return Results.Ok(ergebnis);
        }, HappyHourFehlerkontext.Bilduebergabe);
    }
}

internal enum HappyHourFehlerkontext
{
    Freigabeabruf,
    Protokollpunktuebergabe,
    Bilduebergabe,
    Transkriptionsfreigabe
}

internal static class HappyHourFehlerabbildung
{
    public static async Task<IResult> FuehreAsync(
        Func<Task<IResult>> aktion,
        HappyHourFehlerkontext kontext)
    {
        try
        {
            return await aktion();
        }
        catch (Exception ausnahme) when (IstHappyHourAusnahme(ausnahme))
        {
            return Erstelle(ausnahme, kontext);
        }
    }

    private static bool IstHappyHourAusnahme(Exception ausnahme)
    {
        return ausnahme is HappyHourNichtKonfiguriertException
            or HappyHourFreigabeUngueltigException
            or HappyHourUebergabeUngueltigException
            or HappyHourUebergabeKonfliktException
            or HappyHourBildkontingentException
            or HappyHourAntwortUngueltigException
            or HappyHourNichtErreichbarException;
    }

    private static IResult Erstelle(Exception ausnahme, HappyHourFehlerkontext kontext)
    {
        return ausnahme switch
        {
            HappyHourNichtKonfiguriertException when kontext == HappyHourFehlerkontext.Freigabeabruf =>
                Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", detail: "Die Testverbindung zu HappyHour ist serverseitig noch nicht eingerichtet.", statusCode: StatusCodes.Status503ServiceUnavailable),
            HappyHourNichtKonfiguriertException => Results.Problem(title: "HappyHour-Verbindung nicht konfiguriert", statusCode: StatusCodes.Status503ServiceUnavailable),
            HappyHourFreigabeUngueltigException when kontext == HappyHourFehlerkontext.Freigabeabruf =>
                Results.Problem(title: "Rundgangsfreigabe ungültig", detail: "Die Rundgangsfreigabe ist ungültig, abgelaufen oder wurde widerrufen.", statusCode: StatusCodes.Status410Gone),
            HappyHourFreigabeUngueltigException when kontext == HappyHourFehlerkontext.Protokollpunktuebergabe =>
                Results.Problem(title: "Rundgangsfreigabe ungültig", detail: "Die Freigabe ist abgelaufen oder wurde widerrufen.", statusCode: StatusCodes.Status410Gone),
            HappyHourFreigabeUngueltigException => Results.Problem(title: "Rundgangsfreigabe ungültig", statusCode: StatusCodes.Status410Gone),
            HappyHourUebergabeUngueltigException when kontext == HappyHourFehlerkontext.Protokollpunktuebergabe =>
                Results.Problem(title: "Protokollpunkt ungültig", detail: "HappyHour hat mindestens einen Protokollpunkt abgewiesen.", statusCode: StatusCodes.Status400BadRequest),
            HappyHourUebergabeUngueltigException => Results.Problem(title: "Bild ungültig", statusCode: StatusCodes.Status400BadRequest),
            HappyHourUebergabeKonfliktException when kontext == HappyHourFehlerkontext.Protokollpunktuebergabe =>
                Results.Problem(title: "Übergabekonflikt", detail: "Das Protokoll oder ein vorbereiteter Punkt wurde zwischenzeitlich geändert.", statusCode: StatusCodes.Status409Conflict),
            HappyHourUebergabeKonfliktException => Results.Problem(title: "Übergabekonflikt", statusCode: StatusCodes.Status409Conflict),
            HappyHourBildkontingentException => Results.Problem(title: "Bildkontingent ausgeschöpft", statusCode: StatusCodes.Status429TooManyRequests),
            HappyHourAntwortUngueltigException => Results.Problem(title: "Ungültige HappyHour-Antwort", statusCode: StatusCodes.Status502BadGateway),
            HappyHourNichtErreichbarException => Results.Problem(title: "HappyHour nicht erreichbar", statusCode: StatusCodes.Status503ServiceUnavailable),
            _ => throw ausnahme
        };
    }
}
