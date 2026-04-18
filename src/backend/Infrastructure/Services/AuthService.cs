using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using StockPredictor.Application.DTOs.Auth;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IWatchlistService _watchlist;
    private readonly IEmailService? _email;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository users,
        IWatchlistService watchlist,
        IConfiguration config,
        ILogger<AuthService> logger,
        IEmailService? email = null)
    {
        _users = users;
        _watchlist = watchlist;
        _config = config;
        _logger = logger;
        _email = email;
    }

    public async Task<object> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await _users.EmailExistsAsync(request.Email.ToLower(), cancellationToken))
            throw new ConflictException("An account with this email already exists.");

        if (await _users.UsernameExistsAsync(request.Username, cancellationToken))
            throw new ConflictException("This username is already taken.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow
        };

        if (_email is not null)
        {
            user.IsEmailConfirmed = false;
            user.EmailConfirmationToken = Guid.NewGuid().ToString();
            user.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        }
        else
        {
            user.IsEmailConfirmed = true;
        }

        try
        {
            await _users.AddAsync(user, cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("An account with this email or username already exists.");
        }

        _logger.LogInformation("User registered: {Username}", user.Username);

        await _watchlist.SeedDefaultsAsync(user.Id, cancellationToken);

        if (_email is not null)
        {
            await _email.SendConfirmationEmailAsync(user.Email, user.EmailConfirmationToken!, cancellationToken);
            return new RegisterPendingResponse("Check your email to confirm your account.", MaskEmail(user.Email));
        }

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByEmailAsync(request.Email.ToLower(), cancellationToken)
            ?? throw new UnauthorizedException();

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException();

        if (!user.IsEmailConfirmed)
            throw new ForbiddenException("Please confirm your email before logging in.");

        _logger.LogInformation("User logged in: {Username}", user.Username);

        return BuildAuthResponse(user);
    }

    public async Task ConfirmEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByConfirmationTokenAsync(token, cancellationToken)
            ?? throw new NotFoundException("Invalid confirmation link.");

        if (user.EmailConfirmationTokenExpiresAt < DateTime.UtcNow)
            throw new AppGoneException("Confirmation link has expired. Please request a new one.");

        user.IsEmailConfirmed = true;
        user.EmailConfirmationToken = null;
        user.EmailConfirmationTokenExpiresAt = null;
        await _users.UpdateAsync(user, cancellationToken);

        _logger.LogInformation("Email confirmed for user: {Username}", user.Username);
    }

    public async Task ResendConfirmationAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByEmailAsync(email.ToLower(), cancellationToken);

        if (user is null || user.IsEmailConfirmed || _email is null)
            return;

        user.EmailConfirmationToken = Guid.NewGuid().ToString();
        user.EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        await _users.UpdateAsync(user, cancellationToken);

        await _email.SendConfirmationEmailAsync(user.Email, user.EmailConfirmationToken, cancellationToken);

        _logger.LogInformation("Resent confirmation email for user: {Username}", user.Username);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedException("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _users.UpdateAsync(user, cancellationToken);

        _logger.LogInformation("Password changed for user: {Username}", user.Username);
    }

    public async Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByEmailAsync(email.ToLower(), cancellationToken);

        // Info-leak prevention: silent no-op when user doesn't exist or email service is off.
        if (user is null || _email is null)
            return;

        user.PasswordResetToken = Guid.NewGuid().ToString();
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        await _users.UpdateAsync(user, cancellationToken);

        await _email.SendPasswordResetEmailAsync(user.Email, user.PasswordResetToken, cancellationToken);

        _logger.LogInformation("Password reset requested for {Username}", user.Username);
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByPasswordResetTokenAsync(token, cancellationToken)
            ?? throw new NotFoundException("Invalid or already-used reset link.");

        if (user.PasswordResetTokenExpiresAt < DateTime.UtcNow)
            throw new AppGoneException("Reset link has expired. Please request a new one.");

        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            throw new ConflictException("New password must be different from the current password.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresAt = null;
        await _users.UpdateAsync(user, cancellationToken);

        _logger.LogInformation("Password reset for {Username}", user.Username);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var expiryDays = int.TryParse(_config["Jwt:ExpiryDays"], out var days) ? days : 7;
        var expiry = DateTime.UtcNow.AddDays(expiryDays);
        var token = GenerateToken(user, expiry);
        return new AuthResponse(token, user.Username, user.Email, expiry);
    }

    private string GenerateToken(User user, DateTime expiry)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        if (parts.Length != 2 || parts[0].Length < 2)
            return email;
        return $"{parts[0][0]}***@{parts[1]}";
    }
}
