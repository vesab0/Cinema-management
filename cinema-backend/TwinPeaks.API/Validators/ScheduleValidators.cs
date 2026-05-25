using FluentValidation;

namespace TwinPeaks.API.Validators
{
    public class CreateMovieScheduleRequestValidator : AbstractValidator<CreateMovieScheduleRequest>
    {
        public CreateMovieScheduleRequestValidator()
        {
            RuleFor(x => x.MovieId)
                .NotEmpty().WithMessage("Movie is required.");

            RuleFor(x => x.RoomId)
                .NotEmpty().WithMessage("Room is required.");

            RuleFor(x => x.ScheduleDay)
                .NotEmpty().WithMessage("Schedule date is required.");

            RuleFor(x => x.TicketPrice)
                .GreaterThan(0).WithMessage("Ticket price must be greater than 0.")
                .LessThanOrEqualTo(10000).WithMessage("Ticket price must not exceed 10,000.");

            RuleFor(x => x.VipTicketPrice)
                .GreaterThan(0).WithMessage("VIP ticket price must be greater than 0.")
                .LessThanOrEqualTo(10000).WithMessage("VIP ticket price must not exceed 10,000.")
                .When(x => x.VipTicketPrice.HasValue);
        }
    }
}
