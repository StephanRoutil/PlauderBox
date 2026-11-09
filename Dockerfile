FROM node:24-alpine AS frontend
WORKDIR /quelle/src/PlauderBox.UI.Client
RUN corepack enable
COPY src/PlauderBox.UI.Client/package.json src/PlauderBox.UI.Client/pnpm-lock.yaml src/PlauderBox.UI.Client/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/PlauderBox.UI.Client/ ./
RUN pnpm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /quelle

COPY src/PlauderBox.UI.csproj src/
COPY src/PlauderBox.Logik/PlauderBox.Logik.csproj src/PlauderBox.Logik/
COPY src/PlauderBox.Datenmanagement/PlauderBox.Datenmanagement.csproj src/PlauderBox.Datenmanagement/
RUN dotnet restore src/PlauderBox.UI.csproj

COPY . .
COPY --from=frontend /quelle/src/wwwroot/ src/wwwroot/
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
