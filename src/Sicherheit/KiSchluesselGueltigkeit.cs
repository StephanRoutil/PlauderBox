using System.Globalization;

namespace PlauderBox.UI.Sicherheit;

public sealed record KiSchluesselStatus(
    bool IstBereit,
    bool IstAbgelaufen,
    DateOnly? GueltigBis,
    string? Meldung);

public sealed class KiSchluesselGueltigkeit
{
    public KiSchluesselStatus Ermittle(PlauderBoxOptionen optionen, DateOnly heute)
    {
        if (string.IsNullOrWhiteSpace(optionen.ApiKey))
            return new KiSchluesselStatus(false, false, optionen.KiSchluesselGueltigBis, optionen.KiKonfigurationsfehler);

        if (optionen.KiSchluesselGueltigBis is not DateOnly gueltigBis)
            return new KiSchluesselStatus(true, false, null, null);

        string formatiertesDatum = gueltigBis.ToString("dd.MM.yyyy", CultureInfo.GetCultureInfo("de-CH"));
        if (heute > gueltigBis)
            return new KiSchluesselStatus(
                false,
                true,
                gueltigBis,
                $"Der PlauderBox-KI-Schlüssel ist am {formatiertesDatum} abgelaufen. Bitte Administrator kontaktieren.");

        if (heute >= gueltigBis.AddDays(-optionen.KiSchluesselWarnungTage))
            return new KiSchluesselStatus(
                true,
                false,
                gueltigBis,
                $"Der PlauderBox-KI-Schlüssel läuft am {formatiertesDatum} ab. Bitte rechtzeitig erneuern.");

        return new KiSchluesselStatus(true, false, gueltigBis, null);
    }
}
