namespace PlauderBox.Logik;

public static class ErfassungsId
{
    public static bool IstGueltig(string? wert) => Guid.TryParseExact(wert, "D", out _);
}
