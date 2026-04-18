using Azure.Communication.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.Infrastructure.Services;

public class AzureEmailService : IEmailService
{
    private readonly EmailClient _client;
    private readonly string _senderAddress;
    private readonly string _frontendUrl;
    private readonly ILogger<AzureEmailService> _logger;

    public AzureEmailService(IConfiguration config, ILogger<AzureEmailService> logger)
    {
        var connectionString = config["Email:ConnectionString"]
            ?? throw new InvalidOperationException("Email:ConnectionString is not configured.");
        _client = new EmailClient(connectionString);
        _senderAddress = config["Email:SenderAddress"]
            ?? throw new InvalidOperationException("Email:SenderAddress is not configured.");
        _frontendUrl = config["Email:FrontendUrl"]
            ?? throw new InvalidOperationException("Email:FrontendUrl is not configured.");
        _logger = logger;
    }

    public async Task SendConfirmationEmailAsync(string toEmail, string confirmationToken, CancellationToken ct = default)
    {
        var confirmUrl = $"{_frontendUrl.TrimEnd('/')}/confirm-email?token={confirmationToken}";

        var htmlBody = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e;">
                <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Confirm your email</h1>
                <p style="font-size: 15px; line-height: 1.6; color: #555; margin-bottom: 32px;">
                    Click the button below to verify your email address and activate your Grafynt account.
                    This link expires in 1 hour.
                </p>
                <a href="{confirmUrl}"
                   style="display: inline-block; background-color: #a855f7; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; mso-padding-alt: 0; mso-line-height-rule: exactly;">
                    Confirm Email
                </a>
                <p style="font-size: 13px; line-height: 1.5; color: #888; margin-top: 32px;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
            """;

        var message = new EmailMessage(
            senderAddress: _senderAddress,
            recipientAddress: toEmail,
            content: new EmailContent("Confirm your email — Grafynt")
            {
                Html = htmlBody
            });

        try
        {
            await _client.SendAsync(Azure.WaitUntil.Started, message, ct);
            _logger.LogInformation("Confirmation email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}", toEmail);
            throw;
        }
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        var resetUrl = $"{_frontendUrl.TrimEnd('/')}/reset-password?token={resetToken}";

        var htmlBody = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e;">
                <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Reset your password</h1>
                <p style="font-size: 15px; line-height: 1.6; color: #555; margin-bottom: 32px;">
                    Someone (hopefully you) asked to reset the password on your Grafynt account.
                    Click the button below to pick a new one. This link expires in 1 hour.
                </p>
                <a href="{resetUrl}"
                   style="display: inline-block; background-color: #a855f7; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; mso-padding-alt: 0; mso-line-height-rule: exactly;">
                    Reset password
                </a>
                <p style="font-size: 13px; line-height: 1.5; color: #888; margin-top: 32px;">
                    If you didn't request a password reset, you can safely ignore this email — your password won't change.
                </p>
            </div>
            """;

        var message = new EmailMessage(
            senderAddress: _senderAddress,
            recipientAddress: toEmail,
            content: new EmailContent("Reset your password — Grafynt")
            {
                Html = htmlBody
            });

        try
        {
            await _client.SendAsync(Azure.WaitUntil.Started, message, ct);
            _logger.LogInformation("Password reset email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
            throw;
        }
    }
}
