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
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository users,
        IWatchlistService watchlist,
        IConfiguration config,
        ILogger<AuthService> logger)
    {
        _users = users;
        _watchlist = watchlist;
        _config = config;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
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

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByEmailAsync(request.Email.ToLower(), cancellationToken)
            ?? throw new UnauthorizedException();

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException();

        _logger.LogInformation("User logged in: {Username}", user.Username);

        return BuildAuthResponse(user);
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
}
