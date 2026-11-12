using System.Reflection;

internal static class Architekturpruefung
{
    public static IReadOnlyList<string> Pruefe(Assembly logik, Assembly datenmanagement)
    {
        List<string> fehler = [];
        fehler.AddRange(PruefePlauderBoxReferenzen(logik, []));
        fehler.AddRange(PruefePlauderBoxReferenzen(
            datenmanagement,
            ["PlauderBox.Logik"]));
        fehler.AddRange(PruefeOeffentlicheHttpSignaturen(logik.GetExportedTypes()));
        return fehler;
    }

    public static IReadOnlyList<string> PruefePlauderBoxReferenzen(
        Assembly assembly,
        IReadOnlyCollection<string> erlaubtePlauderBoxAssemblies)
    {
        return PruefePlauderBoxReferenznamen(
            assembly.GetReferencedAssemblies().Select(referenz => referenz.Name ?? string.Empty),
            erlaubtePlauderBoxAssemblies);
    }

    public static IReadOnlyList<string> PruefePlauderBoxReferenznamen(
        IEnumerable<string> referenznamen,
        IReadOnlyCollection<string> erlaubtePlauderBoxAssemblies)
    {
        return referenznamen
            .Where(name => name.StartsWith("PlauderBox.", StringComparison.Ordinal))
            .Where(name => !erlaubtePlauderBoxAssemblies.Contains(name))
            .Select(name => "Verbotene PlauderBox-Referenz: " + name)
            .ToArray();
    }

    public static IReadOnlyList<string> PruefeOeffentlicheHttpSignaturen(IEnumerable<Type> typen)
    {
        List<string> fehler = [];
        foreach (Type typ in typen)
        {
            IEnumerable<Type> signaturtypen = typ
                .GetMembers(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
                .SelectMany(LeseSignaturtypen);
            if (signaturtypen.Any(VerwendetSystemNetHttp))
                fehler.Add("Öffentliche Logiksignatur verwendet System.Net.Http: " + typ.FullName);
        }
        return fehler;
    }

    private static IEnumerable<Type> LeseSignaturtypen(MemberInfo member)
    {
        return member switch
        {
            MethodInfo methode => methode
                .GetParameters()
                .Select(parameter => parameter.ParameterType)
                .Append(methode.ReturnType),
            ConstructorInfo konstruktor => konstruktor
                .GetParameters()
                .Select(parameter => parameter.ParameterType),
            PropertyInfo eigenschaft => [eigenschaft.PropertyType],
            FieldInfo feld => [feld.FieldType],
            EventInfo ereignis when ereignis.EventHandlerType is not null => [ereignis.EventHandlerType],
            _ => []
        };
    }

    private static bool VerwendetSystemNetHttp(Type typ)
    {
        if (string.Equals(typ.Namespace, "System.Net.Http", StringComparison.Ordinal)
            || typ.Namespace?.StartsWith("System.Net.Http.", StringComparison.Ordinal) == true)
            return true;
        if (typ.HasElementType && typ.GetElementType() is Type elementtyp)
            return VerwendetSystemNetHttp(elementtyp);
        return typ.IsGenericType && typ.GetGenericArguments().Any(VerwendetSystemNetHttp);
    }
}

public sealed class ArchitekturHttpNegativprobe
{
    public HttpClient Client { get; init; } = new();
}
