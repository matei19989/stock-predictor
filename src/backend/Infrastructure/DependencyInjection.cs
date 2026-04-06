using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Infrastructure.Http;
using StockPredictor.Infrastructure.Jobs;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Infrastructure.Repositories;
using StockPredictor.Infrastructure.Seeding;
using StockPredictor.Infrastructure.Services;
using Hangfire;
using Hangfire.PostgreSql;

namespace StockPredictor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        // Database
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.EnableRetryOnFailure(maxRetryCount: 3)));

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IStockRepository, StockRepository>();
        services.AddScoped<IStockPriceRepository, StockPriceRepository>();
        services.AddScoped<IWatchlistRepository, WatchlistRepository>();
        services.AddScoped<IPredictionRepository, PredictionRepository>();

        // Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<IWatchlistService, WatchlistService>();
        services.AddScoped<IPredictionService, PredictionService>();

        // ML service client with resilience
        services.AddHttpClient<IMlServiceClient, MlServiceClient>(client =>
        {
            var mlBaseUrl = configuration["MlService:BaseUrl"]
                ?? throw new InvalidOperationException("MlService:BaseUrl is not configured.");
            client.BaseAddress = new Uri(mlBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 3;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
        });

        // Hangfire
        services.AddHangfire(config =>
            config.UsePostgreSqlStorage(c =>
                c.UseNpgsqlConnection(connectionString)));
        services.AddHangfireServer();

        // Seeder and job
        services.AddScoped<DataSeeder>();
        services.AddScoped<RefreshStockPricesJob>();

        return services;
    }
}
