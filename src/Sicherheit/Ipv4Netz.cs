using System.Net;

namespace PlauderBox.UI.Sicherheit;

public static class Ipv4Netz
{
    public static bool Enthaelt(IPAddress adresse, string? netzNotation)
    {
        if (string.IsNullOrWhiteSpace(netzNotation)) return false;

        string[] teile = netzNotation.Split('/', StringSplitOptions.TrimEntries);
        if (teile.Length != 2
            || !IPAddress.TryParse(teile[0], out IPAddress? netzAdresse)
            || !int.TryParse(teile[1], out int praefixLaenge)
            || praefixLaenge < 0
            || praefixLaenge > 32)
            return false;

        byte[] adressBytes = adresse.GetAddressBytes();
        byte[] netzBytes = netzAdresse.GetAddressBytes();
        if (adressBytes.Length != 4 || netzBytes.Length != 4) return false;

        int volleBytes = praefixLaenge / 8;
        int restBits = praefixLaenge % 8;
        for (int index = 0; index < volleBytes; index++)
            if (adressBytes[index] != netzBytes[index]) return false;

        if (restBits == 0) return true;
        int maske = 0xFF << (8 - restBits);
        return (adressBytes[volleBytes] & maske) == (netzBytes[volleBytes] & maske);
    }
}
