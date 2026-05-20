using Stripe;
using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class StripeService
    {
        private readonly ApplicationDbContext _db;

        public StripeService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<CreatePaymentIntentResult> CreatePaymentIntentAsync(Guid ticketId)
        {
            var ticket = await _db.Tickets
                .Include(t => t.Schedule)
                    .ThenInclude(s => s.Movie)
                .Include(t => t.Seat)
                .FirstOrDefaultAsync(t => t.Id == ticketId)
                ?? throw new ArgumentException("Ticket not found");

            if (ticket.Status != TicketStatus.Available)
                throw new ArgumentException("Ticket is no longer available");

            var amountInCents = (long)(ticket.Price * 100);

            var options = new PaymentIntentCreateOptions
            {
                Amount = amountInCents,
                Currency = "usd",
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true,
                },
                Metadata = new Dictionary<string, string>
                {
                    ["ticketId"] = ticketId.ToString(),
                    ["movie"] = ticket.Schedule.Movie.Name,
                    ["seat"] = $"{ticket.Seat.RowLabel}{ticket.Seat.ColNumber}",
                }
            };

            var service = new PaymentIntentService();
            var intent = await service.CreateAsync(options);

            return new CreatePaymentIntentResult(intent.ClientSecret, intent.Id, amountInCents);
        }

        public async Task<CreatePaymentIntentResult> CreateMultiPaymentIntentAsync(List<Guid> ticketIds, Guid userId)
        {
            if (ticketIds == null || ticketIds.Count == 0)
                throw new ArgumentException("At least one ticket is required");

            var tickets = await _db.Tickets
                .Include(t => t.Schedule)
                    .ThenInclude(s => s.Movie)
                .Include(t => t.Seat)
                .Where(t => ticketIds.Contains(t.Id))
                .ToListAsync();

            if (tickets.Count != ticketIds.Count)
                throw new ArgumentException("One or more tickets not found");

            if (tickets.Any(t => t.Status != TicketStatus.Available))
                throw new ArgumentException("One or more tickets are no longer available");

            var totalCents = (long)(tickets.Sum(t => t.Price) * 100);
            var movie = tickets[0].Schedule.Movie.Name;
            var seats = string.Join(", ", tickets.Select(t => $"{t.Seat.RowLabel}{t.Seat.ColNumber}"));

            var options = new PaymentIntentCreateOptions
            {
                Amount = totalCents,
                Currency = "usd",
                PaymentMethodTypes = new List<string> { "card" },
                Metadata = new Dictionary<string, string>
                {
                    ["ticketIds"] = string.Join(",", ticketIds),
                    ["userId"] = userId.ToString(),
                    ["movie"] = movie,
                    ["seats"] = seats,
                }
            };

            var service = new PaymentIntentService();
            var intent = await service.CreateAsync(options);

            return new CreatePaymentIntentResult(intent.ClientSecret, intent.Id, totalCents);
        }

        public async Task<PaymentIntent> GetPaymentIntentAsync(string paymentIntentId)
        {
            var service = new PaymentIntentService();
            return await service.GetAsync(paymentIntentId);
        }

        public async Task<PaymentIntent> RefundPaymentIntentAsync(string paymentIntentId)
        {
            var refundService = new RefundService();
            await refundService.CreateAsync(new RefundCreateOptions
            {
                PaymentIntent = paymentIntentId,
            });

            var intentService = new PaymentIntentService();
            return await intentService.GetAsync(paymentIntentId);
        }
    }

    public record CreatePaymentIntentResult(string ClientSecret, string PaymentIntentId, long AmountInCents);
}
