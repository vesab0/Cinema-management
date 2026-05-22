using FluentValidation;

namespace TwinPeaks.API.Validators
{
    public class CreateMovieRequestValidator : AbstractValidator<CreateMovieRequest>
    {
        public CreateMovieRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Movie name is required.")
                .MaximumLength(200).WithMessage("Movie name must not exceed 200 characters.");

            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Description is required.")
                .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.");

            RuleFor(x => x.DurationMinutes)
                .GreaterThan(0).WithMessage("Duration must be greater than 0.")
                .LessThanOrEqualTo(600).WithMessage("Duration must not exceed 600 minutes.");

            RuleFor(x => x.Director)
                .NotEmpty().WithMessage("Director is required.")
                .MaximumLength(200).WithMessage("Director name must not exceed 200 characters.");

            RuleFor(x => x.AgeRating)
                .NotEmpty().WithMessage("Age rating is required.")
                .MaximumLength(10).WithMessage("Age rating must not exceed 10 characters.");

            RuleFor(x => x.ReleaseDate)
                .NotEmpty().WithMessage("Release date is required.");
        }
    }
}
