namespace StockPredictor.Application.Interfaces.Services;

public interface IEmailService
{
    Task SendConfirmationEmailAsync(string toEmail, string confirmationToken, CancellationToken ct = default);
}
