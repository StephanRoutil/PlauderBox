using PlauderBox.Logik;
using PlauderBox.UI.Sicherheit;

namespace PlauderBox.UI.Endpunkte;

public static class TranskriptionsEndpunkte
{
    public static void MappeTranskriptionsEndpunkte(this WebApplication app)
    {
        MappeTranskriptionsEndpunkte(app, "/api/v1");
        MappeTranskriptionsEndpunkte(app, "/api");
    }

    private static void MappeTranskriptionsEndpunkte(WebApplication app, string praefix)
    {
        app.MapGet($"{praefix}/status", (PlauderBoxOptionen optionen, KiSchluesselGueltigkeit gueltigkeit) => Results.Ok(new
        {
            kiBereit = gueltigkeit.Ermittle(optionen, HeutigesDatum()).IstBereit
        }));
        app.MapGet($"{praefix}/ki-schluesselstatus", (PlauderBoxOptionen optionen, KiSchluesselGueltigkeit gueltigkeit) =>
        {
            KiSchluesselStatus status = gueltigkeit.Ermittle(optionen, HeutigesDatum());
            return Results.Ok(new
            {
                kiBereit = status.IstBereit,
                kiAbgelaufen = status.IstAbgelaufen,
                kiGueltigBis = status.GueltigBis?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
                kiMeldung = status.Meldung
            });
        });

        app.MapPost($"{praefix}/transkribieren", TranskribiereAsync)
            .DisableAntiforgery()
            .RequireRateLimiting("Transkription");
    }

    private static Task<IResult> TranskribiereAsync(
        HttpRequest request,
        IHappyHourFreigabeQuelle freigabeQuelle,
        IProtokollpunktStrukturierer strukturierer,
        ITranskriptionsdienst transkriptionsdienst,
        Freigabekontingent freigabekontingent,
        KiSchluesselGueltigkeit gueltigkeit,
        PlauderBoxOptionen optionen,
        CancellationToken token)
    {
        string freigabeToken = request.Headers["X-PlauderBox-Freigabe"].ToString();
        if (!RundgangsfreigabeToken.TryCreate(
                freigabeToken,
                out RundgangsfreigabeToken? freigabe)
            || freigabe is null)
            return Task.FromResult(Results.Problem(
                title: "Rundgangsfreigabe ungültig",
                statusCode: StatusCodes.Status401Unauthorized));

        return HappyHourFehlerabbildung.FuehreAsync(async () =>
        {
            await freigabeQuelle.LadeAsync(freigabe.Wert, token);
            KiSchluesselStatus kiStatus = gueltigkeit.Ermittle(optionen, HeutigesDatum());
            if (!kiStatus.IstBereit)
                return Problem(
                    kiStatus.Meldung ?? "Die KI-Anbindung ist lokal noch nicht konfiguriert.",
                    StatusCodes.Status503ServiceUnavailable);
            if (!freigabekontingent.Reserviere(
                    "transkription",
                    freigabe.Wert,
                    optionen.TranskriptionenJeFreigabe))
                return Results.Problem(
                    title: "Transkriptionskontingent ausgeschöpft",
                    statusCode: StatusCodes.Status429TooManyRequests);

            if (!transkriptionsdienst.IstKonfiguriert)
                return Problem(
                    "Die KI-Anbindung ist lokal noch nicht konfiguriert.",
                    StatusCodes.Status503ServiceUnavailable);
            if (!request.HasFormContentType)
                return Problem(
                    "Es wurde keine Audioaufnahme übermittelt.",
                    StatusCodes.Status400BadRequest);

            IFormCollection form;
            try
            {
                form = await request.ReadFormAsync(token);
            }
            catch (InvalidDataException)
            {
                return Problem(
                    "Die Aufnahme ist zu gross oder ungültig.",
                    StatusCodes.Status413PayloadTooLarge);
            }

            IFormFile? audio = form.Files.GetFile("audio");
            if (!ErfassungsId.IstGueltig(form["erfassungsId"].ToString()))
                return Problem(
                    "Die stabile Erfassungskennung fehlt oder ist ungültig.",
                    StatusCodes.Status400BadRequest);
            if (audio is null || audio.Length == 0)
                return Problem("Die Aufnahme ist leer.", StatusCodes.Status400BadRequest);
            if (audio.Length > optionen.MaximaleAudiodateigroesseBytes)
                return Problem(
                    $"Die Aufnahme überschreitet {PlauderBoxOptionen.FormatiereMegabyte(optionen.MaximaleAudiodateigroesseBytes)}.",
                    StatusCodes.Status413PayloadTooLarge);

            string medientyp = audio.ContentType.Split(';', 2)[0].Trim().ToLowerInvariant();
            string? endung = AudioformatPruefung.ErmittleDateiendung(medientyp);
            if (endung is null)
                return Problem(
                    "Dieses Audioformat wird nicht unterstützt.",
                    StatusCodes.Status415UnsupportedMediaType);

            try
            {
                using Stream audioStream = audio.OpenReadStream();
                Transkriptionsergebnis transkription = await transkriptionsdienst.TranskribierenAsync(
                    audioStream,
                    medientyp,
                    endung,
                    token);
                ProtokollpunktStrukturierung struktur = await strukturierer.StrukturierenAsync(
                    transkription.Text,
                    token);
                return Results.Ok(new
                {
                    text = transkription.Text,
                    gruppe = struktur.Gruppe,
                    thema = struktur.Thema,
                    inhalt = struktur.Inhalt,
                    rechtsverweis = struktur.Rechtsverweis,
                    modell = optionen.Modell,
                    strukturmodell = optionen.Strukturmodell
                });
            }
            catch (OperationCanceledException) when (!token.IsCancellationRequested)
            {
                return Problem(
                    "Die Transkription hat zu lange gedauert.",
                    StatusCodes.Status504GatewayTimeout);
            }
            catch (TranskriptionszugangAbgelehntException)
            {
                return Problem(
                    "OpenAI weist den konfigurierten Schlüssel zurück.",
                    StatusCodes.Status502BadGateway);
            }
            catch (TranskriptionskontingentException)
            {
                return Problem(
                    "OpenAI-Kontingent oder Anfragelimit erreicht.",
                    StatusCodes.Status502BadGateway);
            }
            catch (TranskriptionsaufnahmeUngueltigException)
            {
                return Problem(
                    "OpenAI konnte diese Aufnahme nicht verarbeiten.",
                    StatusCodes.Status502BadGateway);
            }
            catch (TranskriptionsdienstNichtVerfuegbarException)
            {
                return Problem(
                    "Die Transkription ist momentan nicht verfügbar.",
                    StatusCodes.Status502BadGateway);
            }
            catch (TranskriptionsantwortLeerException)
            {
                return Problem(
                    "OpenAI hat keinen erkannten Text zurückgegeben.",
                    StatusCodes.Status502BadGateway);
            }
            catch (HttpRequestException)
            {
                return Problem(
                    "OpenAI ist momentan nicht erreichbar oder konnte das Diktat nicht strukturieren.",
                    StatusCodes.Status502BadGateway);
            }
            catch (InvalidDataException)
            {
                return Problem(
                    "Die strukturierte Auswertung konnte nicht gelesen werden.",
                    StatusCodes.Status502BadGateway);
            }
            catch (System.Text.Json.JsonException)
            {
                return Problem(
                    "Die strukturierte Auswertung konnte nicht gelesen werden.",
                    StatusCodes.Status502BadGateway);
            }
        }, HappyHourFehlerkontext.Transkriptionsfreigabe);
    }

    private static IResult Problem(string meldung, int status)
    {
        return Results.Problem(
            title: "Transkription nicht möglich",
            detail: meldung,
            statusCode: status);
    }

    private static DateOnly HeutigesDatum() => DateOnly.FromDateTime(DateTime.UtcNow);
}
