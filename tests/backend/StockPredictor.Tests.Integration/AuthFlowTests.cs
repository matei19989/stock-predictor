using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Tests.Integration.Fixtures;

namespace StockPredictor.Tests.Integration;

[Collection(nameof(IntegrationCollection))]
public class AuthFlowTests : IAsyncLifetime
{
    private const string ValidTurnstile = "valid-turnstile-token";

    private readonly IntegrationWebAppFactory _factory;
    private readonly HttpClient _client;

    public AuthFlowTests(IntegrationWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ─── Register ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_returns_201_persists_unconfirmed_user_and_captures_email()
    {
        var payload = new
        {
            username = "alice",
            email = "alice@example.com",
            password = "CorrectHorseBatteryStaple1!",
            turnstileToken = ValidTurnstile
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Email == "alice@example.com");

        user.IsEmailConfirmed.Should().BeFalse();
        user.EmailConfirmationToken.Should().NotBeNullOrEmpty();
        user.EmailConfirmationTokenExpiresAt.Should().NotBeNull();

        var sent = _factory.Email.LastFor("alice@example.com");
        sent.Should().NotBeNull();
        sent!.Token.Should().Be(user.EmailConfirmationToken);
    }

    [Fact]
    public async Task Register_with_duplicate_email_returns_409()
    {
        await RegisterAsync("bob@example.com", "bob");

        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "bob2",
            email = "bob@example.com",
            password = "CorrectHorseBatteryStaple1!",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ─── Confirm email ────────────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmEmail_with_valid_token_marks_user_confirmed()
    {
        await RegisterAsync("charlie@example.com", "charlie");
        var token = _factory.Email.LastFor("charlie@example.com")!.Token;

        var response = await _client.PostAsJsonAsync("/api/auth/confirm-email", new { token });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Email == "charlie@example.com");
        user.IsEmailConfirmed.Should().BeTrue();
        user.EmailConfirmationToken.Should().BeNull();
        user.EmailConfirmationTokenExpiresAt.Should().BeNull();
    }

    [Fact]
    public async Task ConfirmEmail_with_expired_token_returns_410()
    {
        await RegisterAsync("dave@example.com", "dave");
        var token = _factory.Email.LastFor("dave@example.com")!.Token;

        // Force the token to be expired by hand.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == "dave@example.com");
            user.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync("/api/auth/confirm-email", new { token });

        response.StatusCode.Should().Be(HttpStatusCode.Gone);
    }

    [Fact]
    public async Task ConfirmEmail_with_invalid_token_returns_404()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/confirm-email", new
        {
            token = "definitely-not-a-real-token"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_before_email_is_confirmed_returns_403()
    {
        await RegisterAsync("erin@example.com", "erin", password: "MySecret1!");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "erin@example.com",
            password = "MySecret1!",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Login_after_confirmation_returns_200_with_valid_jwt()
    {
        await RegisterAsync("frank@example.com", "frank", password: "MySecret1!");
        await ConfirmAsync("frank@example.com");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "frank@example.com",
            password = "MySecret1!",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        body.GetProperty("username").GetString().Should().Be("frank");
        var token = body.GetProperty("token").GetString();
        token.Should().NotBeNullOrWhiteSpace();
        token!.Split('.').Should().HaveCount(3, "JWTs have three dot-separated segments");
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        await RegisterAsync("gina@example.com", "gina", password: "MySecret1!");
        await ConfirmAsync("gina@example.com");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "gina@example.com",
            password = "wrong-password",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─── Resend confirmation ──────────────────────────────────────────────────

    [Fact]
    public async Task ResendConfirmation_for_unconfirmed_user_issues_a_new_token()
    {
        await RegisterAsync("hank@example.com", "hank");
        var originalToken = _factory.Email.LastFor("hank@example.com")!.Token;

        var response = await _client.PostAsJsonAsync("/api/auth/resend-confirmation", new
        {
            email = "hank@example.com",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newToken = _factory.Email.LastFor("hank@example.com")!.Token;
        newToken.Should().NotBe(originalToken);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Email == "hank@example.com");
        user.EmailConfirmationToken.Should().Be(newToken);
    }

    [Fact]
    public async Task ResendConfirmation_for_already_confirmed_user_is_silent_200()
    {
        await RegisterAsync("ivy@example.com", "ivy");
        await ConfirmAsync("ivy@example.com");
        _factory.Email.Clear();

        var response = await _client.PostAsJsonAsync("/api/auth/resend-confirmation", new
        {
            email = "ivy@example.com",
            turnstileToken = ValidTurnstile
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _factory.Email.Captured.Should().BeEmpty("no new email is issued once the account is already confirmed");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task RegisterAsync(string email, string username, string password = "CorrectHorseBatteryStaple1!")
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email,
            password,
            turnstileToken = ValidTurnstile
        });
        response.EnsureSuccessStatusCode();
    }

    private async Task ConfirmAsync(string email)
    {
        var token = _factory.Email.LastFor(email)!.Token;
        var response = await _client.PostAsJsonAsync("/api/auth/confirm-email", new { token });
        response.EnsureSuccessStatusCode();
    }
}

/// <summary>
/// xUnit serializes tests that share the factory so they don't race on the
/// same Postgres instance while unit tests keep running in parallel.
/// </summary>
[CollectionDefinition(nameof(IntegrationCollection))]
public class IntegrationCollection : ICollectionFixture<IntegrationWebAppFactory> { }
