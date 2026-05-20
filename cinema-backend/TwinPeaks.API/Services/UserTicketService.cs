using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;
using Stripe;

namespace TwinPeaks.API.Services
{
    public class UserTicketService
    {
        private readonly ApplicationDbContext _db;
        private readonly StripeService _stripeService;

        public UserTicketService(ApplicationDbContext db, StripeService stripeService)
        {
            _db = db;
            _stripeService = stripeService;
        }

        public List<UserTicketResponse> GetAll()
        {
            return _db.UserTickets
                .Include(ut => ut.User)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Schedule)
                        .ThenInclude(s => s.Movie)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Schedule)
                        .ThenInclude(s => s.Room)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Seat)
                .OrderByDescending(ut => ut.PurchasedAt)
                .AsSplitQuery()
                .Select(ut => ToResponse(ut))
                .ToList();
        }

        public UserTicketResponse? GetById(Guid id)
        {
            var ut = LoadWithIncludes().FirstOrDefault(ut => ut.Id == id);
            return ut == null ? null : ToResponse(ut);
        }

        public UserTicketResponse? GetByConfirmationCode(string code)
        {
            var ut = LoadWithIncludes().FirstOrDefault(ut => ut.ConfirmationCode == code);
            return ut == null ? null : ToResponse(ut);
        }

        public async Task<UserTicketResponse> PurchaseAsync(PurchaseTicketRequest req)
        {
            if (req.UserId == Guid.Empty) throw new ArgumentException("UserId is required");
            if (req.TicketId == Guid.Empty) throw new ArgumentException("TicketId is required");
            if (string.IsNullOrWhiteSpace(req.PaymentIntentId)) throw new ArgumentException("PaymentIntentId is required");

            var user = _db.Users.FirstOrDefault(u => u.Id == req.UserId);
            if (user == null) throw new ArgumentException("User not found");

            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == req.TicketId);
            if (ticket == null) throw new ArgumentException("Ticket not found");
            if (ticket.Status != TicketStatus.Available)
                throw new ArgumentException("Ticket is no longer available");

            // Verify payment was successful with Stripe
            PaymentIntent intent;
            try
            {
                intent = await _stripeService.GetPaymentIntentAsync(req.PaymentIntentId);
            }
            catch (StripeException ex)
            {
                throw new ArgumentException($"Failed to verify payment: {ex.Message}");
            }

            if (intent.Status != "succeeded")
                throw new ArgumentException($"Payment has not been completed. Status: {intent.Status}");

            // Ensure this payment intent is for the correct ticket
            if (!intent.Metadata.TryGetValue("ticketId", out var intentTicketId)
                || intentTicketId != req.TicketId.ToString())
                throw new ArgumentException("Payment intent does not match the requested ticket");

            return CreateUserTicket(req.UserId, req.TicketId, ticket);
        }

        public async Task<List<UserTicketResponse>> PurchaseMultiAsync(PurchaseMultiTicketRequest req)
        {
            if (req.UserId == Guid.Empty) throw new ArgumentException("UserId is required");
            if (req.TicketIds == null || req.TicketIds.Count == 0) throw new ArgumentException("At least one TicketId is required");
            if (string.IsNullOrWhiteSpace(req.PaymentIntentId)) throw new ArgumentException("PaymentIntentId is required");

            var user = _db.Users.FirstOrDefault(u => u.Id == req.UserId);
            if (user == null) throw new ArgumentException("User not found");

            // Verify payment
            PaymentIntent intent;
            try { intent = await _stripeService.GetPaymentIntentAsync(req.PaymentIntentId); }
            catch (StripeException ex) { throw new ArgumentException($"Failed to verify payment: {ex.Message}"); }

            if (intent.Status != "succeeded")
                throw new ArgumentException($"Payment has not been completed. Status: {intent.Status}");

            // Validate metadata ticketIds match
            if (!intent.Metadata.TryGetValue("ticketIds", out var metaIds))
                throw new ArgumentException("Payment intent does not contain ticketIds metadata");

            var metaSet = new HashSet<string>(metaIds.Split(','));
            if (!req.TicketIds.All(id => metaSet.Contains(id.ToString())))
                throw new ArgumentException("Payment intent does not match the requested tickets");

            var tickets = _db.Tickets.Where(t => req.TicketIds.Contains(t.Id)).ToList();
            if (tickets.Count != req.TicketIds.Count) throw new ArgumentException("One or more tickets not found");
            if (tickets.Any(t => t.Status != TicketStatus.Available)) throw new ArgumentException("One or more tickets are no longer available");

            var results = tickets.Select(t => CreateUserTicket(req.UserId, t.Id, t)).ToList();
            return results;
        }

        // Called from Stripe webhook after payment_intent.succeeded
        public void FinalizeFromWebhook(Guid userId, Guid ticketId, string paymentIntentId)
        {
            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == ticketId);
            if (ticket == null || ticket.Status != TicketStatus.Available) return;

            // Idempotency: skip if already purchased
            if (_db.UserTickets.Any(ut => ut.TicketId == ticketId)) return;

            CreateUserTicket(userId, ticketId, ticket);
        }

        private UserTicketResponse CreateUserTicket(Guid userId, Guid ticketId, Ticket ticket)
        {
            ticket.Status = TicketStatus.Sold;

            var userTicket = new UserTicket
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TicketId = ticketId,
                PurchasedAt = DateTime.UtcNow,
                IsUsed = false,
                ConfirmationCode = Guid.NewGuid().ToString("N").ToUpperInvariant()[..12]
            };

            _db.UserTickets.Add(userTicket);
            _db.SaveChanges();

            return GetById(userTicket.Id)!;
        }

        public void MarkUsed(Guid id)
        {
            var ut = _db.UserTickets.FirstOrDefault(ut => ut.Id == id);
            if (ut == null) throw new ArgumentException("UserTicket not found");
            if (ut.IsUsed) throw new ArgumentException("Ticket has already been used");

            ut.IsUsed = true;
            _db.SaveChanges();
        }

        public void Cancel(Guid id)
        {
            var ut = _db.UserTickets
                .Include(ut => ut.Ticket)
                .FirstOrDefault(ut => ut.Id == id);
            if (ut == null) throw new ArgumentException("UserTicket not found");

            ut.Ticket.Status = TicketStatus.Available;
            _db.UserTickets.Remove(ut);
            _db.SaveChanges();
        }

        private IQueryable<UserTicket> LoadWithIncludes()
        {
            return _db.UserTickets
                .Include(ut => ut.User)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Schedule)
                        .ThenInclude(s => s.Movie)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Schedule)
                        .ThenInclude(s => s.Room)
                .Include(ut => ut.Ticket)
                    .ThenInclude(t => t.Seat)
                .AsSplitQuery();
        }

        private static UserTicketResponse ToResponse(UserTicket ut)
        {
            return new UserTicketResponse(
                Id: ut.Id,
                UserId: ut.UserId,
                UserFullName: $"{ut.User.FirstName} {ut.User.LastName}".Trim(),
                UserEmail: ut.User.Email,
                TicketId: ut.TicketId,
                MovieName: ut.Ticket.Schedule.Movie.Name,
                DurationMinutes: ut.Ticket.Schedule.Movie.DurationMinutes,
                ScheduleDay: ut.Ticket.Schedule.ScheduleDay,
                StartTime: ut.Ticket.Schedule.StartTime.ToString(@"hh\:mm"),
                RoomName: ut.Ticket.Schedule.Room.Name,
                RowLabel: ut.Ticket.Seat.RowLabel,
                ColNumber: ut.Ticket.Seat.ColNumber,
                SeatType: ut.Ticket.Seat.SeatType.ToString(),
                Price: ut.Ticket.Price,
                ConfirmationCode: ut.ConfirmationCode,
                IsUsed: ut.IsUsed,
                PurchasedAt: ut.PurchasedAt.ToString("yyyy-MM-dd HH:mm")
            );
        }
    }
}
