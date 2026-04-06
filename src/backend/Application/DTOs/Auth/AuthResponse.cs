namespace StockPredictor.Application.DTOs.Auth;

public record AuthResponse(string Token, string Username, string Email, DateTime ExpiresAt);
