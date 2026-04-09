using FluentValidation;
using StockPredictor.Application.DTOs.Predictions;

namespace StockPredictor.Application.Validators;

public class PredictRequestValidator : AbstractValidator<PredictRequest>
{
    public PredictRequestValidator()
    {
        RuleFor(x => x.Ticker)
            .NotEmpty()
            .ValidTicker();

        RuleFor(x => x.Horizon)
            .NotEmpty()
            .Must(h => h is "3m" or "6m" or "1y")
            .WithMessage("Horizon must be '3m', '6m', or '1y'.");
    }
}
