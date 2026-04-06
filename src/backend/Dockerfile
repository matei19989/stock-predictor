FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Domain/StockPredictor.Domain.csproj", "Domain/"]
COPY ["Application/StockPredictor.Application.csproj", "Application/"]
COPY ["Infrastructure/StockPredictor.Infrastructure.csproj", "Infrastructure/"]
COPY ["API/StockPredictor.API.csproj", "API/"]
RUN dotnet restore "API/StockPredictor.API.csproj"
COPY . .
RUN dotnet publish "API/StockPredictor.API.csproj" -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "StockPredictor.API.dll"]
