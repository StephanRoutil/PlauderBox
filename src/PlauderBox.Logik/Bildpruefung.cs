namespace PlauderBox.Logik;

public static class Bildpruefung
{
    public static bool IstGueltig(string medientyp, ReadOnlySpan<byte> anfang)
    {
        string typ = medientyp.Split(';', 2)[0].Trim().ToLowerInvariant();
        return typ switch
        {
            "image/jpeg" => BeginntMit(anfang, [0xFF, 0xD8, 0xFF]),
            "image/png" => BeginntMit(anfang, [0x89, 0x50, 0x4E, 0x47]),
            "image/gif" => BeginntMit(anfang, [0x47, 0x49, 0x46, 0x38]),
            "image/tiff" or "image/tif" => BeginntMit(anfang, [0x49, 0x49, 0x2A, 0x00])
                || BeginntMit(anfang, [0x4D, 0x4D, 0x00, 0x2A]),
            _ => false
        };
    }

    private static bool BeginntMit(ReadOnlySpan<byte> inhalt, ReadOnlySpan<byte> signatur) =>
        inhalt.Length >= signatur.Length && inhalt[..signatur.Length].SequenceEqual(signatur);
}
