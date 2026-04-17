namespace StockPredictor.Application.DTOs.Auth;

public record ResetPasswordRequest(string Token, string NewPassword);
