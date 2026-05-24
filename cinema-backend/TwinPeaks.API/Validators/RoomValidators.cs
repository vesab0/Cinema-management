using FluentValidation;

namespace TwinPeaks.API.Validators
{
    public class CreateRoomRequestValidator : AbstractValidator<CreateRoomRequest>
    {
        public CreateRoomRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Room name is required.")
                .MaximumLength(100).WithMessage("Room name must not exceed 100 characters.");

            RuleFor(x => x.Rows)
                .GreaterThan(0).WithMessage("Rows must be greater than 0.")
                .LessThanOrEqualTo(50).WithMessage("Rows must not exceed 50.");

            RuleFor(x => x.Cols)
                .GreaterThan(0).WithMessage("Columns must be greater than 0.")
                .LessThanOrEqualTo(50).WithMessage("Columns must not exceed 50.");
        }
    }
}
