using FluentValidation;

namespace StockPredictor.Application.Validators;

public static class ValidatorExtensions
{
    public static IRuleBuilderOptions<T, string> ValidTicker<T>(this IRuleBuilder<T, string> ruleBuilder)
        => ruleBuilder
            .Matches(@"^[A-Z]{1,5}(\.[A-Z]{1,2})?$")
            .WithMessage("Ticker must be 1\u20135 uppercase letters, optionally followed by a dot and 1\u20132 uppercase letters (e.g. AAPL, BRK.B).");
}
