using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.DTOs.Auth;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IWatchlistService> _watchlist = new();
    private readonly IConfiguration _config;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "test-secret-key-minimum-32-characters-long-xxx",
                ["Jwt:Issuer"] = "StockPredictor",
                ["Jwt:Audience"] = "StockPredictor",
                ["Jwt:ExpiryDays"] = "7"
            })
            .Build();

        _sut = new AuthService(_users.Object, _watchlist.Object, _config,
            NullLogger<AuthService>.Instance);
    }

    [Fact]
    public async Task RegisterAsync_ValidData_ReturnsTokenWithCorrectUsername()
    {
        _users.Setup(r => r.EmailExistsAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _watchlist.Setup(w => w.SeedDefaultsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.RegisterAsync(new RegisterRequest
        {
            Username = "alice",
            Email = "test@example.com",
            Password = "password123"
        });

        result.Token.Should().NotBeNullOrEmpty();
        result.Username.Should().Be("alice");
        result.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsConflictException()
    {
        _users.Setup(r => r.EmailExistsAsync("taken@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.Invoking(s => s.RegisterAsync(new RegisterRequest
            {
                Username = "alice",
                Email = "taken@example.com",
                Password = "password123"
            }))
            .Should().ThrowAsync<ConflictException>()
            .WithMessage("*email*");
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ThrowsConflictException()
    {
        _users.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.Invoking(s => s.RegisterAsync(new RegisterRequest
            {
                Username = "alice",
                Email = "new@example.com",
                Password = "password123"
            }))
            .Should().ThrowAsync<ConflictException>()
            .WithMessage("*username*");
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedException()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "alice",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow
        };

        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await _sut.Invoking(s => s.LoginAsync(new LoginRequest
            {
                Email = "test@example.com",
                Password = "wrong_password"
            }))
            .Should().ThrowAsync<UnauthorizedException>();
    }

    [Fact]
    public async Task LoginAsync_EmailNotFound_ThrowsUnauthorizedException()
    {
        _users.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await _sut.Invoking(s => s.LoginAsync(new LoginRequest
            {
                Email = "ghost@example.com",
                Password = "password123"
            }))
            .Should().ThrowAsync<UnauthorizedException>();
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "alice",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow
        };

        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var result = await _sut.LoginAsync(new LoginRequest
        {
            Email = "test@example.com",
            Password = "correct_password"
        });

        result.Token.Should().NotBeNullOrEmpty();
        result.Username.Should().Be("alice");
    }
}
