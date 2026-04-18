using System.Collections.Concurrent;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.Tests.Integration.Fixtures;

public enum EmailKind { Confirmation, PasswordReset }

public record CapturedEmail(string Email, string Token, DateTime SentAt, EmailKind Kind);

public class FakeEmailService : IEmailService
{
    public ConcurrentBag<CapturedEmail> Captured { get; } = new();

    public Task SendConfirmationEmailAsync(string toEmail, string confirmationToken, CancellationToken ct = default)
    {
        Captured.Add(new CapturedEmail(toEmail, confirmationToken, DateTime.UtcNow, EmailKind.Confirmation));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        Captured.Add(new CapturedEmail(toEmail, resetToken, DateTime.UtcNow, EmailKind.PasswordReset));
        return Task.CompletedTask;
    }

    public void Clear() => Captured.Clear();

    // Back-compat for existing tests: defaults to Confirmation.
    public CapturedEmail? LastFor(string email) =>
        LastFor(email, EmailKind.Confirmation);

    public CapturedEmail? LastFor(string email, EmailKind kind) =>
        Captured
            .Where(e => e.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && e.Kind == kind)
            .OrderByDescending(e => e.SentAt)
            .FirstOrDefault();
}
