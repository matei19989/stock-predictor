using FluentValidation;
using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Validators;

public class ResendConfirmationRequestValidator : AbstractValidator<ResendConfirmationRequest>
{
    public ResendConfirmationRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.TurnstileToken).NotEmpty().WithMessage("Bot verification is required.");
    }
}
