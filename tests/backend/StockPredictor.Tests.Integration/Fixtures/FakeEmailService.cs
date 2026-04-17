using System.Collections.Concurrent;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.Tests.Integration.Fixtures;

/// <summary>
/// Test double for IEmailService that captures every confirmation email
/// instead of dispatching it. Tests inspect Captured to assert the token
/// that would have been emailed to the user.
/// </summary>
public class FakeEmailService : IEmailService
{
    public record CapturedEmail(string Email, string Token, DateTime SentAt);

    public ConcurrentBag<CapturedEmail> Captured { get; } = new();

    public Task SendConfirmationEmailAsync(string email, string token, CancellationToken cancellationToken = default)
    {
        Captured.Add(new CapturedEmail(email, token, DateTime.UtcNow));
        return Task.CompletedTask;
    }

    public void Clear() => Captured.Clear();

    public CapturedEmail? LastFor(string email) =>
        Captured.Where(c => c.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(c => c.SentAt)
                .FirstOrDefault();
}
