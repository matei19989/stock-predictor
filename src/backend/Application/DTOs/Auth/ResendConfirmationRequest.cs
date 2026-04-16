namespace StockPredictor.Application.DTOs.Auth;

public class ResendConfirmationRequest
{
    public string Email { get; set; } = string.Empty;
    public string TurnstileToken { get; set; } = string.Empty;
}
