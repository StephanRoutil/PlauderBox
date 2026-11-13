using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PlauderBox.Logik;

namespace PlauderBox.Integrationstests;

internal sealed class IntegrationstestFabrik : WebApplicationFactory<Program>
{
    private readonly IProtokollpunktStrukturierer _strukturierer;
    private readonly string? _kiGueltigBis;

    public IntegrationstestFabrik(
        IProtokollpunktStrukturierer? strukturierer = null,
        string? kiGueltigBis = null)
    {
        _strukturierer = strukturierer ?? new StrukturiererAttrappe();
        _kiGueltigBis = kiGueltigBis;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("PlauderBox:KI:ApiKey", "synthetischer-testschluessel");
        if (_kiGueltigBis is not null)
            builder.UseSetting("PlauderBox:KI:GueltigBis", _kiGueltigBis);
        builder.UseSetting("PlauderBox:ErlaubterUrsprung", "https://plauderbox.test");
        builder.UseSetting("PlauderBox:ErlaubtesProxyNetz", "172.22.0.0/24");
        builder.UseSetting("PlauderBox:HappyHour:Basisadresse", "https://happyhour.test/");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IHappyHourFreigabeQuelle>();
            services.RemoveAll<IHappyHourProtokollpunktZiel>();
            services.RemoveAll<IHappyHourProtokollpunktBildZiel>();
            services.RemoveAll<ITranskriptionsdienst>();
            services.RemoveAll<IProtokollpunktStrukturierer>();

            HappyHourAttrappe happyHour = new();
            services.AddSingleton<IHappyHourFreigabeQuelle>(happyHour);
            services.AddSingleton<IHappyHourProtokollpunktZiel>(happyHour);
            services.AddSingleton<IHappyHourProtokollpunktBildZiel>(happyHour);
            services.AddSingleton<ITranskriptionsdienst, Transkriptionsattrappe>();
            services.AddSingleton<IProtokollpunktStrukturierer>(_strukturierer);
        });
    }
}

internal sealed class HappyHourAttrappe :
    IHappyHourFreigabeQuelle,
    IHappyHourProtokollpunktZiel,
    IHappyHourProtokollpunktBildZiel
{
    public Task<HappyHourProtokollKontext> LadeAsync(string freigabeToken, CancellationToken cancellationToken)
    {
        if (freigabeToken == Testdaten.UngueltigeFreigabe)
            throw new HappyHourFreigabeUngueltigException();
        if (freigabeToken == Testdaten.TechnischerFehlerFreigabe)
            throw new InvalidOperationException("synthetischer technischer Fehler");

        return Task.FromResult(Testdaten.Protokoll);
    }

    public Task<ProtokollpunktUebergabeErgebnis> SchreibeAsync(
        string freigabeToken,
        ProtokollpunktUebergabeEintrag eintrag,
        CancellationToken cancellationToken) =>
        Task.FromResult(new ProtokollpunktUebergabeErgebnis(eintrag.ErfassungsId, 41, true));

    public Task<ProtokollpunktBildUebergabeErgebnis> SchreibeBildAsync(
        string freigabeToken,
        ProtokollpunktBildUebergabe bild,
        CancellationToken cancellationToken) =>
        Task.FromResult(new ProtokollpunktBildUebergabeErgebnis(bild.BildId, bild.ProtokollpunktId, 91, true));
}

internal sealed class Transkriptionsattrappe : ITranskriptionsdienst
{
    public bool IstKonfiguriert => true;

    public Task<Transkriptionsergebnis> TranskribierenAsync(
        Stream audioInhalt,
        string medientyp,
        string dateiendung,
        CancellationToken cancellationToken) =>
        Task.FromResult(new Transkriptionsergebnis("Synthetischer Text"));
}

internal sealed class StrukturiererAttrappe : IProtokollpunktStrukturierer
{
    public Task<ProtokollpunktStrukturierung> StrukturierenAsync(
        string transkript,
        CancellationToken cancellationToken) =>
        Task.FromResult(new ProtokollpunktStrukturierung("Gruppe", "Thema", "Inhalt", string.Empty));
}

internal sealed class FehlerhafterStrukturierer : IProtokollpunktStrukturierer
{
    public Task<ProtokollpunktStrukturierung> StrukturierenAsync(
        string transkript,
        CancellationToken cancellationToken) =>
        throw new System.Text.Json.JsonException("synthetisch ungültige Providerantwort");
}

internal static class Testdaten
{
    public const string GueltigeFreigabe = "AbCdEf0123456789_AbCdEf0123456789-AbCdEf0123456789";
    public const string UngueltigeFreigabe = "BbCdEf0123456789_BbCdEf0123456789-BbCdEf0123456789";
    public const string TechnischerFehlerFreigabe = "CbCdEf0123456789_CbCdEf0123456789-CbCdEf0123456789";

    public static readonly HappyHourProtokollKontext Protokoll = new(
        378,
        1,
        "Synthetisches Protokoll",
        "Protokoll",
        "Entwurf",
        "2026-11-12",
        null,
        new HappyHourProjektKontext(1, 203m, "Testprojekt"),
        null,
        new HappyHourMitarbeiterKontext(1, "Testperson"),
        [],
        [],
        [],
        []);
}
