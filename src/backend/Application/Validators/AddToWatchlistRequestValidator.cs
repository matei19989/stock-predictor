using FluentValidation;
using StockPredictor.Application.DTOs.Watchlist;

namespace StockPredictor.Application.Validators;

public class AddToWatchlistRequestValidator : AbstractValidator<AddToWatchlistRequest>
{
    public AddToWatchlistRequestValidator()
    {
        RuleFor(x => x.Ticker)
            .NotEmpty()
            .ValidTicker();
    }
}
