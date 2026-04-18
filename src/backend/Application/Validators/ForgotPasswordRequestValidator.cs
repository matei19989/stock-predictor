using FluentValidation;
using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Validators;

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.TurnstileToken).NotEmpty().WithMessage("Bot verification is required.");
    }
}
