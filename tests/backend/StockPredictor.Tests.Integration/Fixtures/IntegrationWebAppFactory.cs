using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace StockPredictor.Tests.Integration.Fixtures;

/// <summary>
/// Spins up a Postgres container, wires it into the real Program.cs host,
/// swaps IEmailService for <see cref="FakeEmailService"/>, and stubs the
/// Turnstile HTTP client so tests don't reach Cloudflare. One instance is
/// shared across a collection of tests; each test truncates the database
/// via <see cref="ResetDatabaseAsync"/>.
/// </summary>
public class IntegrationWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("stockpredictor_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public FakeEmailService Email { get; } = new();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        // Program.cs reads config during service registration, BEFORE
        // ConfigureWebHost overrides land. Env vars are picked up by the
        // default WebApplicationBuilder configuration pipeline, so they
        // are visible from the first config read.
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Test");
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", _postgres.GetConnectionString());
        Environment.SetEnvironmentVariable("Jwt__Key", "test-integration-jwt-key-must-be-at-least-32-characters");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "StockPredictorTest");
        Environment.SetEnvironmentVariable("Jwt__Audience", "StockPredictorTest");
        Environment.SetEnvironmentVariable("Jwt__ExpiryDays", "1");
        Environment.SetEnvironmentVariable("MlService__BaseUrl", "http://ml-not-reachable.invalid");
        Environment.SetEnvironmentVariable("Turnstile__SecretKey", "test-secret");
        Environment.SetEnvironmentVariable("Turnstile__SiteVerifyUrl", "https://challenges.cloudflare.invalid/turnstile/v0/siteverify");
        Environment.SetEnvironmentVariable("Cors__AllowedOrigins__0", "http://localhost:3000");
        // A cron that never fires — suppresses the recurring-job registration side-effects.
        Environment.SetEnvironmentVariable("Hangfire__RefreshCron", "0 0 31 2 *");
        Environment.SetEnvironmentVariable("Hangfire__CleanupCron", "0 0 31 2 *");
        // Disable the auth rate limiter during integration tests so the 10-per-15-min
        // window doesn't short-circuit a test run that exercises register/login repeatedly.
        Environment.SetEnvironmentVariable("RateLimit__Auth__Permit", "10000");
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureServices(services =>
        {
            // FakeEmailService captures confirmation tokens so auth tests can assert
            // the email that would have been sent. AuthService already accepts a
            // nullable IEmailService; we always register the fake in tests.
            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService>(Email);

            // Stub the Turnstile HTTP client so it never reaches Cloudflare.
            services.AddHttpClient("Turnstile")
                .ConfigurePrimaryHttpMessageHandler(() => new StubTurnstileHandler());
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // TRUNCATE every user-data table; CASCADE clears FKs automatically.
        await db.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                "UserPredictionLogs",
                "StockVisits",
                "Predictions",
                "WatchlistItems",
                "StockPrices",
                "Users",
                "Stocks"
            RESTART IDENTITY CASCADE
            """);
        Email.Clear();
    }
}
