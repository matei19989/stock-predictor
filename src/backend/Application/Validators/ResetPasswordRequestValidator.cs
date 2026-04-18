using FluentValidation;
using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Validators;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).MinimumLength(8)
            .WithMessage("Password must be at least 8 characters.");
    }
}
