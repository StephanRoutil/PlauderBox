using System.Net;

namespace PlauderBox.UI.Sicherheit;

public sealed class QuellUndUrsprungsMiddleware
{
    private readonly RequestDelegate _naechster;
    private readonly string? _erlaubterUrsprung;
    private readonly string? _erlaubtesProxyNetz;

    public QuellUndUrsprungsMiddleware(
        RequestDelegate naechster,
        PlauderBoxOptionen optionen)
    {
        _naechster = naechster;
        _erlaubterUrsprung = optionen.ErlaubterUrsprung;
        _erlaubtesProxyNetz = optionen.ErlaubtesProxyNetz;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        bool istLoopbackQuelle = context.Connection.RemoteIpAddress is null
            || IPAddress.IsLoopback(context.Connection.RemoteIpAddress);
        if (!istLoopbackQuelle
            && !Ipv4Netz.Enthaelt(context.Connection.RemoteIpAddress!, _erlaubtesProxyNetz))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        context.Response.Headers["Cache-Control"] = "no-store";
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self'; media-src 'self' blob:; script-src 'self'; style-src 'self'; img-src 'self' data: blob:";

        if (HttpMethods.IsPost(context.Request.Method)
            && context.Request.Path.StartsWithSegments("/api"))
        {
            string origin = context.Request.Headers.Origin.ToString();
            bool istLoopbackUrsprung = Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri)
                && IPAddress.TryParse(uri.Host, out IPAddress? ip)
                && IPAddress.IsLoopback(ip);
            bool istKonfigurierterUrsprung = !string.IsNullOrWhiteSpace(_erlaubterUrsprung)
                && string.Equals(
                    origin.TrimEnd('/'),
                    _erlaubterUrsprung,
                    StringComparison.OrdinalIgnoreCase);
            if ((!istLoopbackQuelle && !istKonfigurierterUrsprung)
                || (!string.IsNullOrWhiteSpace(origin)
                    && !istLoopbackUrsprung
                    && !istKonfigurierterUrsprung))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        await _naechster(context);
    }

    public static string ErmittleQuellPartition(HttpContext context, string? erlaubtesProxyNetz)
    {
        IPAddress? remoteAdresse = context.Connection.RemoteIpAddress;
        if (remoteAdresse is not null && Ipv4Netz.Enthaelt(remoteAdresse, erlaubtesProxyNetz))
        {
            string weitergeleitet = context.Request.Headers["X-Forwarded-For"]
                .ToString()
                .Split(',', 2)[0]
                .Trim();
            if (IPAddress.TryParse(weitergeleitet, out IPAddress? clientAdresse))
                return clientAdresse.ToString();
            return "proxy_ohne_clientadresse";
        }

        return remoteAdresse?.ToString() ?? "unbekannte_quelle";
    }
}
