using FluentAssertions;
using FluentValidation.TestHelper;
using StockPredictor.Application.DTOs.Auth;
using StockPredictor.Application.DTOs.Predictions;
using StockPredictor.Application.DTOs.Watchlist;
using StockPredictor.Application.Validators;

namespace StockPredictor.Tests.Unit.Validators;

public class RegisterRequestValidatorTests
{
    private readonly RegisterRequestValidator _validator = new();

    [Theory]
    [InlineData("alice", true)]
    [InlineData("user_123", true)]
    [InlineData("AB", false)]          // too short (min 3)
    [InlineData("", false)]            // empty
    [InlineData("user name", false)]   // space not allowed
    [InlineData("user@name", false)]   // @ not allowed
    public void Username_Validation(string username, bool shouldPass)
    {
        var model = new RegisterRequest { Username = username, Email = "a@b.com", Password = "password123" };
        var result = _validator.TestValidate(model);

        if (shouldPass)
            result.ShouldNotHaveValidationErrorFor(x => x.Username);
        else
            result.ShouldHaveValidationErrorFor(x => x.Username);
    }

    [Theory]
    [InlineData("user@example.com", true)]
    [InlineData("notanemail", false)]
    [InlineData("", false)]
    public void Email_Validation(string email, bool shouldPass)
    {
        var model = new RegisterRequest { Username = "alice", Email = email, Password = "password123" };
        var result = _validator.TestValidate(model);

        if (shouldPass)
            result.ShouldNotHaveValidationErrorFor(x => x.Email);
        else
            result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("password123", true)]   // 11 chars, OK
    [InlineData("12345678", true)]      // exactly 8, OK
    [InlineData("short", false)]        // too short
    [InlineData("", false)]             // empty
    public void Password_Validation(string password, bool shouldPass)
    {
        var model = new RegisterRequest { Username = "alice", Email = "a@b.com", Password = password };
        var result = _validator.TestValidate(model);

        if (shouldPass)
            result.ShouldNotHaveValidationErrorFor(x => x.Password);
        else
            result.ShouldHaveValidationErrorFor(x => x.Password);
    }
}

public class PredictRequestValidatorTests
{
    private readonly PredictRequestValidator _validator = new();

    [Theory]
    [InlineData("AAPL", true)]
    [InlineData("BRK.B", true)]
    [InlineData("A", true)]
    [InlineData("ABCDE", true)]
    [InlineData("ABCDEF", false)]     // 6 letters, too long
    [InlineData("aapl", false)]       // lowercase
    [InlineData("AA1", false)]        // digit
    [InlineData("", false)]           // empty
    public void Ticker_Validation(string ticker, bool shouldPass)
    {
        var model = new PredictRequest { Ticker = ticker, Horizon = "3m" };
        var result = _validator.TestValidate(model);

        if (shouldPass)
            result.ShouldNotHaveValidationErrorFor(x => x.Ticker);
        else
            result.ShouldHaveValidationErrorFor(x => x.Ticker);
    }

    [Theory]
    [InlineData("3m", true)]
    [InlineData("6m", true)]
    [InlineData("1y", true)]
    [InlineData("2y", false)]
    [InlineData("", false)]
    [InlineData("3M", false)]         // case sensitive
    public void Horizon_Validation(string horizon, bool shouldPass)
    {
        var model = new PredictRequest { Ticker = "AAPL", Horizon = horizon };
        var result = _validator.TestValidate(model);

        if (shouldPass)
            result.ShouldNotHaveValidationErrorFor(x => x.Horizon);
        else
            result.ShouldHaveValidationErrorFor(x => x.Horizon);
    }
}

public class ChangePasswordRequestValidatorTests
{
    private readonly ChangePasswordRequestValidator _validator = new();

    [Fact]
    public void EmptyCurrentPassword_Fails()
    {
        var model = new ChangePasswordRequest { CurrentPassword = "", NewPassword = "newpass123" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.CurrentPassword)
            .WithErrorMessage("Current password is required.");
    }

    [Fact]
    public void NewPasswordTooShort_Fails()
    {
        var model = new ChangePasswordRequest { CurrentPassword = "oldpass", NewPassword = "short12" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword)
            .WithErrorMessage("New password must be at least 8 characters.");
    }

    [Fact]
    public void NewPasswordSameAsCurrent_Fails()
    {
        var model = new ChangePasswordRequest { CurrentPassword = "samepass123", NewPassword = "samepass123" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword)
            .WithErrorMessage("New password must be different from current password.");
    }

    [Fact]
    public void ValidRequest_Passes()
    {
        var model = new ChangePasswordRequest { CurrentPassword = "oldpass123", NewPassword = "newpass123" };
        var result = _validator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

public class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Fact]
    public void EmptyEmail_Fails()
    {
        var model = new LoginRequest { Email = "", Password = "password123" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void InvalidEmailFormat_Fails()
    {
        var model = new LoginRequest { Email = "notanemail", Password = "password123" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void EmptyPassword_Fails()
    {
        var model = new LoginRequest { Email = "user@example.com", Password = "" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void ValidEmailAndPassword_Passes()
    {
        var model = new LoginRequest { Email = "user@example.com", Password = "password123", TurnstileToken = "test-token" };
        var result = _validator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

public class AddToWatchlistRequestValidatorTests
{
    private readonly AddToWatchlistRequestValidator _validator = new();

    [Fact]
    public void EmptyTicker_Fails()
    {
        var model = new AddToWatchlistRequest { Ticker = "" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Ticker);
    }

    [Fact]
    public void LowercaseTicker_Fails()
    {
        var model = new AddToWatchlistRequest { Ticker = "aapl" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Ticker);
    }

    [Fact]
    public void TickerTooLong_Fails()
    {
        var model = new AddToWatchlistRequest { Ticker = "ABCDEF" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Ticker);
    }

    [Fact]
    public void ValidTicker_Passes()
    {
        var model = new AddToWatchlistRequest { Ticker = "AAPL" };
        var result = _validator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void DotTicker_Passes()
    {
        var model = new AddToWatchlistRequest { Ticker = "BRK.B" };
        var result = _validator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}
