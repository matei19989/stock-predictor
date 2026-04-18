namespace StockPredictor.Application.DTOs.Auth;

public record ForgotPasswordRequest(string Email, string TurnstileToken);
