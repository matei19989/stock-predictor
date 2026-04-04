using FluentValidation;
using StockPredictor.Application.DTOs.Predictions;

namespace StockPredictor.Application.Validators;

public class PredictRequestValidator : AbstractValidator<PredictRequest>
{
    public PredictRequestValidator()
    {
        RuleFor(x => x.Ticker)
            .NotEmpty()
            .Matches("^[A-Z]{1,5}(\\.[A-Z]{1,2})?$")
            .WithMessage("Ticker must be 1–5 uppercase letters, optionally followed by a dot and 1–2 uppercase letters (e.g. AAPL, BRK.B).");

        RuleFor(x => x.Horizon)
            .NotEmpty()
            .Must(h => h is "3m" or "6m" or "1y")
            .WithMessage("Horizon must be '3m', '6m', or '1y'.");
    }
}
