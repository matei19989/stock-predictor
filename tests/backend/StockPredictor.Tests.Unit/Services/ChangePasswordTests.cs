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

public class ChangePasswordTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IWatchlistService> _watchlist = new();
    private readonly IConfiguration _config;
    private readonly AuthService _sut;

    public ChangePasswordTests()
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
    public async Task ChangePasswordAsync_UserNotFound_ThrowsNotFoundException()
    {
        _users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await _sut.Invoking(s => s.ChangePasswordAsync(
                Guid.NewGuid(),
                new ChangePasswordRequest { CurrentPassword = "old", NewPassword = "newpass123" }))
            .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ThrowsUnauthorizedException()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "alice",
            Email = "alice@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow
        };

        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        await _sut.Invoking(s => s.ChangePasswordAsync(
                user.Id,
                new ChangePasswordRequest { CurrentPassword = "wrong_password", NewPassword = "newpass123" }))
            .Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Current password is incorrect.");
    }

    [Fact]
    public async Task ChangePasswordAsync_ValidRequest_UpdatesPasswordHash()
    {
        var oldHash = BCrypt.Net.BCrypt.HashPassword("old_password");
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "alice",
            Email = "alice@example.com",
            PasswordHash = oldHash,
            CreatedAt = DateTime.UtcNow
        };

        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await _sut.ChangePasswordAsync(
            user.Id,
            new ChangePasswordRequest { CurrentPassword = "old_password", NewPassword = "new_password_123" });

        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        user.PasswordHash.Should().NotBe(oldHash);
        BCrypt.Net.BCrypt.Verify("new_password_123", user.PasswordHash).Should().BeTrue();
    }
}
