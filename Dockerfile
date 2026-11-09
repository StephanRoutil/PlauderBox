FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /quelle

COPY src/PlauderBox.UI.csproj src/
COPY src/PlauderBox.Logik/PlauderBox.Logik.csproj src/PlauderBox.Logik/
COPY src/PlauderBox.Datenmanagement/PlauderBox.Datenmanagement.csproj src/PlauderBox.Datenmanagement/
RUN dotnet restore src/PlauderBox.UI.csproj

COPY . .
RUN dotnet publish src/PlauderBox.UI.csproj \
    --configuration Release \
    --no-restore \
    --output /anwendung \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /anwendung .

USER $APP_UID
ENTRYPOINT ["dotnet", "PlauderBox.UI.dll"]
