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
    private readonly Mock<IEmailService> _email = new();
    private readonly IConfiguration _config;

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
    }

    private AuthService CreateSut(IEmailService? email = null) =>
        new(_users.Object, _watchlist.Object, _config, NullLogger<AuthService>.Instance, email);

    // --- Register (dev mode: no email service) ---

    [Fact]
    public async Task RegisterAsync_DevMode_ReturnsAuthResponse()
    {
        var sut = CreateSut(email: null);
        _users.Setup(r => r.EmailExistsAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _watchlist.Setup(w => w.SeedDefaultsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await sut.RegisterAsync(new RegisterRequest
        {
            Username = "alice",
            Email = "test@example.com",
            Password = "password123"
        });

        result.Should().BeOfType<AuthResponse>();
        var auth = (AuthResponse)result;
        auth.Token.Should().NotBeNullOrEmpty();
        auth.Username.Should().Be("alice");
    }

    [Fact]
    public async Task RegisterAsync_ProdMode_ReturnsPendingResponse()
    {
        var sut = CreateSut(email: _email.Object);
        _users.Setup(r => r.EmailExistsAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _watchlist.Setup(w => w.SeedDefaultsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _email.Setup(e => e.SendConfirmationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await sut.RegisterAsync(new RegisterRequest
        {
            Username = "alice",
            Email = "test@example.com",
            Password = "password123"
        });

        result.Should().BeOfType<RegisterPendingResponse>();
        var pending = (RegisterPendingResponse)result;
        pending.Email.Should().Be("t***@example.com");
        _email.Verify(e => e.SendConfirmationEmailAsync("test@example.com", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsConflictException()
    {
        var sut = CreateSut();
        _users.Setup(r => r.EmailExistsAsync("taken@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await sut.Invoking(s => s.RegisterAsync(new RegisterRequest
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
        var sut = CreateSut();
        _users.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(r => r.UsernameExistsAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await sut.Invoking(s => s.RegisterAsync(new RegisterRequest
            {
                Username = "alice",
                Email = "new@example.com",
                Password = "password123"
            }))
            .Should().ThrowAsync<ConflictException>()
            .WithMessage("*username*");
    }

    // --- Login ---

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow, IsEmailConfirmed = true
        };
        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var result = await sut.LoginAsync(new LoginRequest { Email = "test@example.com", Password = "correct_password" });
        result.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_UnconfirmedEmail_ThrowsForbiddenException()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow, IsEmailConfirmed = false
        };
        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await sut.Invoking(s => s.LoginAsync(new LoginRequest { Email = "test@example.com", Password = "correct_password" }))
            .Should().ThrowAsync<ForbiddenException>()
            .WithMessage("*confirm*email*");
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedException()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct_password"),
            CreatedAt = DateTime.UtcNow, IsEmailConfirmed = true
        };
        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await sut.Invoking(s => s.LoginAsync(new LoginRequest { Email = "test@example.com", Password = "wrong_password" }))
            .Should().ThrowAsync<UnauthorizedException>();
    }

    [Fact]
    public async Task LoginAsync_EmailNotFound_ThrowsUnauthorizedException()
    {
        var sut = CreateSut();
        _users.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await sut.Invoking(s => s.LoginAsync(new LoginRequest { Email = "ghost@example.com", Password = "password123" }))
            .Should().ThrowAsync<UnauthorizedException>();
    }

    // --- Confirm Email ---

    [Fact]
    public async Task ConfirmEmailAsync_ValidToken_SetsConfirmedAndClearsToken()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = "hash", CreatedAt = DateTime.UtcNow,
            IsEmailConfirmed = false, EmailConfirmationToken = "valid-token",
            EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddMinutes(30)
        };
        _users.Setup(r => r.GetByConfirmationTokenAsync("valid-token", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await sut.ConfirmEmailAsync("valid-token");

        user.IsEmailConfirmed.Should().BeTrue();
        user.EmailConfirmationToken.Should().BeNull();
        user.EmailConfirmationTokenExpiresAt.Should().BeNull();
        _users.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ConfirmEmailAsync_ExpiredToken_ThrowsGoneException()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = "hash", CreatedAt = DateTime.UtcNow,
            IsEmailConfirmed = false, EmailConfirmationToken = "expired-token",
            EmailConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(-1)
        };
        _users.Setup(r => r.GetByConfirmationTokenAsync("expired-token", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await sut.Invoking(s => s.ConfirmEmailAsync("expired-token"))
            .Should().ThrowAsync<AppGoneException>()
            .WithMessage("*expired*");
    }

    [Fact]
    public async Task ConfirmEmailAsync_InvalidToken_ThrowsNotFoundException()
    {
        var sut = CreateSut();
        _users.Setup(r => r.GetByConfirmationTokenAsync("bad-token", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await sut.Invoking(s => s.ConfirmEmailAsync("bad-token"))
            .Should().ThrowAsync<NotFoundException>();
    }

    // --- Resend Confirmation ---

    [Fact]
    public async Task ResendConfirmationAsync_ValidUnconfirmedUser_SendsEmail()
    {
        var sut = CreateSut(email: _email.Object);
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = "hash", CreatedAt = DateTime.UtcNow, IsEmailConfirmed = false
        };
        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _email.Setup(e => e.SendConfirmationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await sut.ResendConfirmationAsync("test@example.com");

        user.EmailConfirmationToken.Should().NotBeNullOrEmpty();
        user.EmailConfirmationTokenExpiresAt.Should().BeAfter(DateTime.UtcNow);
        _email.Verify(e => e.SendConfirmationEmailAsync("test@example.com", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResendConfirmationAsync_UnknownEmail_DoesNotThrow()
    {
        var sut = CreateSut(email: _email.Object);
        _users.Setup(r => r.GetByEmailAsync("ghost@example.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await sut.Invoking(s => s.ResendConfirmationAsync("ghost@example.com"))
            .Should().NotThrowAsync();
        _email.Verify(e => e.SendConfirmationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ResendConfirmationAsync_AlreadyConfirmed_DoesNotSendEmail()
    {
        var sut = CreateSut(email: _email.Object);
        var user = new User
        {
            Id = Guid.NewGuid(), Username = "alice", Email = "test@example.com",
            PasswordHash = "hash", CreatedAt = DateTime.UtcNow, IsEmailConfirmed = true
        };
        _users.Setup(r => r.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await sut.ResendConfirmationAsync("test@example.com");

        _email.Verify(e => e.SendConfirmationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // --- Password Reset ---

    [Fact]
    public async Task RequestPasswordResetAsync_UnknownEmail_DoesNothing()
    {
        var sut = CreateSut(email: _email.Object);
        _users.Setup(r => r.GetByEmailAsync("nobody@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync((User?)null);

        await sut.RequestPasswordResetAsync("nobody@example.com");

        _email.Verify(e => e.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RequestPasswordResetAsync_NoEmailService_DoesNothing()
    {
        var sutNoEmail = CreateSut(email: null);
        var user = new User { Id = Guid.NewGuid(), Email = "a@b.com", PasswordHash = "x" };
        _users.Setup(r => r.GetByEmailAsync("a@b.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);

        await sutNoEmail.RequestPasswordResetAsync("a@b.com");

        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RequestPasswordResetAsync_KnownEmail_SetsTokenAndSendsEmail()
    {
        var sut = CreateSut(email: _email.Object);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("currentPass123"),
        };
        _users.Setup(r => r.GetByEmailAsync("user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _email.Setup(e => e.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await sut.RequestPasswordResetAsync("user@example.com");

        user.PasswordResetToken.Should().NotBeNullOrEmpty();
        user.PasswordResetTokenExpiresAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(55));
        user.PasswordResetTokenExpiresAt.Should().BeBefore(DateTime.UtcNow.AddMinutes(65));

        _users.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.SendPasswordResetEmailAsync(user.Email, user.PasswordResetToken!, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ResetPasswordAsync_InvalidToken_ThrowsNotFound()
    {
        var sut = CreateSut();
        _users.Setup(r => r.GetByPasswordResetTokenAsync("bogus", It.IsAny<CancellationToken>()))
              .ReturnsAsync((User?)null);

        var act = () => sut.ResetPasswordAsync("bogus", "newPass123");

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ResetPasswordAsync_ExpiredToken_ThrowsGone()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "a@b.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("oldpass"),
            PasswordResetToken = "tok",
            PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(-1),
        };
        _users.Setup(r => r.GetByPasswordResetTokenAsync("tok", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);

        var act = () => sut.ResetPasswordAsync("tok", "newPass123");

        await act.Should().ThrowAsync<AppGoneException>();
    }

    [Fact]
    public async Task ResetPasswordAsync_SameAsCurrent_ThrowsConflict()
    {
        var sut = CreateSut();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "a@b.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("samePass123"),
            PasswordResetToken = "tok",
            PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(30),
        };
        _users.Setup(r => r.GetByPasswordResetTokenAsync("tok", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);

        var act = () => sut.ResetPasswordAsync("tok", "samePass123");

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task ResetPasswordAsync_HappyPath_UpdatesHashAndClearsToken()
    {
        var sut = CreateSut();
        var oldHash = BCrypt.Net.BCrypt.HashPassword("oldPass123");
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "a@b.com",
            PasswordHash = oldHash,
            PasswordResetToken = "tok",
            PasswordResetTokenExpiresAt = DateTime.UtcNow.AddMinutes(30),
        };
        _users.Setup(r => r.GetByPasswordResetTokenAsync("tok", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await sut.ResetPasswordAsync("tok", "brandNewPass123");

        user.PasswordHash.Should().NotBe(oldHash);
        BCrypt.Net.BCrypt.Verify("brandNewPass123", user.PasswordHash).Should().BeTrue();
        user.PasswordResetToken.Should().BeNull();
        user.PasswordResetTokenExpiresAt.Should().BeNull();
        _users.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }
}
