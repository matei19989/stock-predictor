using FluentValidation;
using StockPredictor.Application.DTOs.Watchlist;

namespace StockPredictor.Application.Validators;

public class AddToWatchlistRequestValidator : AbstractValidator<AddToWatchlistRequest>
{
    public AddToWatchlistRequestValidator()
    {
        RuleFor(x => x.Ticker)
            .NotEmpty()
            .Matches("^[A-Z]{1,5}(\\.[A-Z]{1,2})?$")
            .WithMessage("Ticker must be 1–5 uppercase letters, optionally followed by a dot and 1–2 uppercase letters (e.g. AAPL, BRK.B).");
    }
}
