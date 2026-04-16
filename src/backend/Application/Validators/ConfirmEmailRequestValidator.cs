using FluentValidation;
using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Validators;

public class ConfirmEmailRequestValidator : AbstractValidator<ConfirmEmailRequest>
{
    public ConfirmEmailRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Confirmation token is required.");
    }
}
