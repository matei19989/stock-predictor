using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Tests.Integration.Fixtures;

namespace StockPredictor.Tests.Integration;

[Collection(nameof(IntegrationCollection))]
public class PasswordResetFlowTests : IAsyncLifetime
{
    private const string ValidTurnstile = "valid-turnstile-token";

    private readonly IntegrationWebAppFactory _factory;
    private readonly HttpClient _client;

    public PasswordResetFlowTests(IntegrationWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task FullFlow_RegisterConfirmForgotResetLogin_Succeeds()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var username = $"u{Guid.NewGuid():N}".Substring(0, 10);
        const string originalPassword = "OriginalPass1!";

        // 1. Register
        var registerResp = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email,
            password = originalPassword,
            turnstileToken = ValidTurnstile,
        });
        registerResp.EnsureSuccessStatusCode();

        // 2. Confirm email
        var confirmToken = _factory.Email.LastFor(email, EmailKind.Confirmation)!.Token;
        var confirmResp = await _client.PostAsJsonAsync("/api/auth/confirm-email", new { token = confirmToken });
        confirmResp.EnsureSuccessStatusCode();

        // 3. Forgot password
        var forgotResp = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email,
            turnstileToken = ValidTurnstile,
        });
        forgotResp.EnsureSuccessStatusCode();

        var resetToken = _factory.Email.LastFor(email, EmailKind.PasswordReset)!.Token;
        resetToken.Should().NotBeNullOrEmpty();

        // 4. Reset password
        const string newPassword = "BrandNewPass1!";
        var resetResp = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword,
        });
        resetResp.EnsureSuccessStatusCode();

        // 5. Old password fails
        var oldLogin = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = originalPassword,
            turnstileToken = ValidTurnstile,
        });
        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // 6. New password succeeds
        var newLogin = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = newPassword,
            turnstileToken = ValidTurnstile,
        });
        newLogin.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_Returns200_AndSendsNothing()
    {
        _factory.Email.Clear();

        var resp = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "nobody-at-all@example.com",
            turnstileToken = ValidTurnstile,
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        _factory.Email.Captured.Should().BeEmpty("no email is sent for unknown address");
    }

    [Fact]
    public async Task ForgotPassword_WithoutTurnstile_Returns403()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "someone@example.com",
            turnstileToken = "invalid-turnstile-token",
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_Returns404()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = "completely-bogus-token",
            newPassword = "SomeNewPass1!",
        });

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_Returns410()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var username = $"u{Guid.NewGuid():N}".Substring(0, 10);

        await RegisterAndConfirmAsync(email, username, "OldPass1!");

        await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email,
            turnstileToken = ValidTurnstile,
        });

        var resetToken = _factory.Email.LastFor(email, EmailKind.PasswordReset)!.Token;

        // Manually expire the token
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == email);
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync();
        }

        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword = "BrandNew1!",
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Gone);
    }

    [Fact]
    public async Task ResetPassword_SameAsCurrent_Returns409()
    {
        const string password = "SamePass1!";
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var username = $"u{Guid.NewGuid():N}".Substring(0, 10);

        await RegisterAndConfirmAsync(email, username, password);

        await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email,
            turnstileToken = ValidTurnstile,
        });

        var resetToken = _factory.Email.LastFor(email, EmailKind.PasswordReset)!.Token;

        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword = password,
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ResetPassword_SecondUseOfSameToken_Returns404()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var username = $"u{Guid.NewGuid():N}".Substring(0, 10);

        await RegisterAndConfirmAsync(email, username, "OldPass1!");

        await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email,
            turnstileToken = ValidTurnstile,
        });

        var resetToken = _factory.Email.LastFor(email, EmailKind.PasswordReset)!.Token;

        // First use — should succeed
        var first = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword = "NewPass1!",
        });
        first.EnsureSuccessStatusCode();

        // Second use — token should be gone
        var second = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword = "AnotherPass1!",
        });
        second.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ResetPassword_NewPasswordLetsUserLogIn()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var username = $"u{Guid.NewGuid():N}".Substring(0, 10);
        const string newPassword = "FreshPass1!";

        await RegisterAndConfirmAsync(email, username, "OldPass1!");

        await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email,
            turnstileToken = ValidTurnstile,
        });

        var resetToken = _factory.Email.LastFor(email, EmailKind.PasswordReset)!.Token;

        var resetResp = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = resetToken,
            newPassword,
        });
        resetResp.EnsureSuccessStatusCode();

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = newPassword,
            turnstileToken = ValidTurnstile,
        });
        loginResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task RegisterAndConfirmAsync(string email, string username, string password = "CorrectHorseBatteryStaple1!")
    {
        var registerResp = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email,
            password,
            turnstileToken = ValidTurnstile,
        });
        registerResp.EnsureSuccessStatusCode();

        var confirmToken = _factory.Email.LastFor(email, EmailKind.Confirmation)!.Token;
        var confirmResp = await _client.PostAsJsonAsync("/api/auth/confirm-email", new { token = confirmToken });
        confirmResp.EnsureSuccessStatusCode();
    }
}
