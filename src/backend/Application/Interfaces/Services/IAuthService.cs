using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Interfaces.Services;

public interface IAuthService
{
    /// <summary>Returns AuthResponse (dev, auto-confirmed) or RegisterPendingResponse (prod, email sent).</summary>
    Task<object> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task ConfirmEmailAsync(string token, CancellationToken cancellationToken = default);
    Task ResendConfirmationAsync(string email, CancellationToken cancellationToken = default);
    Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default);
}
