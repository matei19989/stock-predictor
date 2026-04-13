using FluentValidation;
using StockPredictor.Application.DTOs.Users;

namespace StockPredictor.Application.Validators;

public class UserPreferencesValidator : AbstractValidator<UserPreferencesDto>
{
    public UserPreferencesValidator()
    {
        RuleFor(x => x.DefaultChartRange)
            .NotEmpty()
            .Must(r => r is "1M" or "3M" or "6M" or "1Y" or "5Y")
            .WithMessage("DefaultChartRange must be '1M', '3M', '6M', '1Y', or '5Y'.");
    }
}
