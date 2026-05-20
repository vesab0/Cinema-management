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
