using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;
using Stripe;

namespace TwinPeaks.API.Services
{
    public class UserTicketService
    {
        private readonly ApplicationDbContext _db;
        private readonly StripeService _stripeService;
        private readonly IEmailService _emailService;

        public UserTicketService(ApplicationDbContext db, StripeService stripeService, IEmailService emailService)
        {
            _db = db;
            _stripeService = stripeService;
            _emailService = emailService;
        }

        public List<UserTicketResponse> GetAll()
        {
            return _db.UserTickets
                .Include(ut => ut.User)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Schedule).ThenInclude(s => s.Movie)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Schedule).ThenInclude(s => s.Room)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Seat)
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

            PaymentIntent intent;
            try { intent = await _stripeService.GetPaymentIntentAsync(req.PaymentIntentId); }
            catch (StripeException ex) { throw new ArgumentException($"Failed to verify payment: {ex.Message}"); }

            if (intent.Status != "succeeded")
                throw new ArgumentException($"Payment has not been completed. Status: {intent.Status}");

            if (!intent.Metadata.TryGetValue("ticketId", out var intentTicketId)
                || intentTicketId != req.TicketId.ToString())
                throw new ArgumentException("Payment intent does not match the requested ticket");

            var result = CreateUserTicket(req.UserId, req.TicketId, ticket);
            _ = SendConfirmationEmailAsync(result.UserEmail, result.UserFullName, new[] { result });
            return result;
        }

        public async Task<List<UserTicketResponse>> PurchaseMultiAsync(PurchaseMultiTicketRequest req)
        {
            if (req.UserId == Guid.Empty) throw new ArgumentException("UserId is required");
            if (req.TicketIds == null || req.TicketIds.Count == 0) throw new ArgumentException("At least one TicketId is required");
            if (string.IsNullOrWhiteSpace(req.PaymentIntentId)) throw new ArgumentException("PaymentIntentId is required");

            var user = _db.Users.FirstOrDefault(u => u.Id == req.UserId);
            if (user == null) throw new ArgumentException("User not found");

            PaymentIntent intent;
            try { intent = await _stripeService.GetPaymentIntentAsync(req.PaymentIntentId); }
            catch (StripeException ex) { throw new ArgumentException($"Failed to verify payment: {ex.Message}"); }

            if (intent.Status != "succeeded")
                throw new ArgumentException($"Payment has not been completed. Status: {intent.Status}");

            if (!intent.Metadata.TryGetValue("ticketIds", out var metaIds))
                throw new ArgumentException("Payment intent does not contain ticketIds metadata");

            var metaSet = new HashSet<string>(metaIds.Split(','));
            if (!req.TicketIds.All(id => metaSet.Contains(id.ToString())))
                throw new ArgumentException("Payment intent does not match the requested tickets");

            var tickets = _db.Tickets.Where(t => req.TicketIds.Contains(t.Id)).ToList();
            if (tickets.Count != req.TicketIds.Count) throw new ArgumentException("One or more tickets not found");
            if (tickets.Any(t => t.Status != TicketStatus.Available)) throw new ArgumentException("One or more tickets are no longer available");

            var results = tickets.Select(t => CreateUserTicket(req.UserId, t.Id, t)).ToList();
            _ = SendConfirmationEmailAsync(results[0].UserEmail, results[0].UserFullName, results);
            return results;
        }

        public void FinalizeFromWebhook(Guid userId, Guid ticketId, string paymentIntentId)
        {
            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == ticketId);
            if (ticket == null || ticket.Status != TicketStatus.Available) return;
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
                ConfirmationCode = Guid.NewGuid().ToString("N").ToUpperInvariant()[..12]
            };
            _db.UserTickets.Add(userTicket);
            _db.SaveChanges();
            return GetById(userTicket.Id)!;
        }

        private async Task SendConfirmationEmailAsync(string email, string name, IEnumerable<UserTicketResponse> tickets)
        {
            try
            {
                var list = tickets.ToList();
                var first = list[0];
                var date = first.ScheduleDay.ToString().Split('T')[0];
                var total = list.Sum(t => t.Price);
                await _emailService.SendAsync(
                    email,
                    $"Your ticket for {first.MovieName} — Twin Peaks Cinema",
                    BuildTicketEmail(name, first, list, date, total)
                );
            }
            catch { }
        }

        private static string BuildTicketEmail(string name, UserTicketResponse first, List<UserTicketResponse> tickets, string date, decimal total)
        {
            var ticketStubs = string.Join("", tickets.Select(t => $"""
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                  <tr>
                    <!-- ADMIT ONE stub -->
                    <td width="48" style="background:#1a0d00;border:2px dashed #b8960c;border-right:none;padding:8px 4px;text-align:center;vertical-align:middle;">
                      <p style="margin:0;font-size:9px;letter-spacing:0.25em;color:#b8960c;text-transform:uppercase;writing-mode:vertical-rl;transform:rotate(180deg);font-family:Georgia,serif;">ADMIT ONE</p>
                    </td>
                    <!-- Main ticket body -->
                    <td style="background:#fdf6e3;border-top:2px dashed #b8960c;border-bottom:2px dashed #b8960c;padding:16px 20px;vertical-align:middle;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.3em;color:#8b6914;text-transform:uppercase;font-family:Arial,sans-serif;">Twin Peaks Cinema · Prishtina</p>
                            <p style="margin:0;font-size:20px;font-weight:bold;color:#1a0d00;font-family:Georgia,serif;letter-spacing:0.04em;">{first.MovieName}</p>
                          </td>
                          <td width="80" style="text-align:right;">
                            <p style="margin:0;font-size:22px;font-weight:bold;color:#b8960c;font-family:Georgia,serif;">€{t.Price:F2}</p>
                            <p style="margin:0;font-size:9px;color:#8b6914;letter-spacing:0.15em;text-transform:uppercase;">{t.SeatType}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top:10px;border-top:1px dotted #c9a87c;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="25%">
                                  <p style="margin:0 0 2px;font-size:8px;letter-spacing:0.2em;color:#8b6914;text-transform:uppercase;font-family:Arial,sans-serif;">Date</p>
                                  <p style="margin:0;font-size:12px;color:#1a0d00;font-family:Georgia,serif;font-weight:bold;">{date}</p>
                                </td>
                                <td width="20%">
                                  <p style="margin:0 0 2px;font-size:8px;letter-spacing:0.2em;color:#8b6914;text-transform:uppercase;font-family:Arial,sans-serif;">Time</p>
                                  <p style="margin:0;font-size:12px;color:#1a0d00;font-family:Georgia,serif;font-weight:bold;">{first.StartTime}</p>
                                </td>
                                <td width="25%">
                                  <p style="margin:0 0 2px;font-size:8px;letter-spacing:0.2em;color:#8b6914;text-transform:uppercase;font-family:Arial,sans-serif;">Hall</p>
                                  <p style="margin:0;font-size:12px;color:#1a0d00;font-family:Georgia,serif;font-weight:bold;">{first.RoomName}</p>
                                </td>
                                <td width="30%">
                                  <p style="margin:0 0 2px;font-size:8px;letter-spacing:0.2em;color:#8b6914;text-transform:uppercase;font-family:Arial,sans-serif;">Seat</p>
                                  <p style="margin:0;font-size:12px;color:#1a0d00;font-family:Georgia,serif;font-weight:bold;">Row {t.RowLabel}, No. {t.ColNumber}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <!-- Tear-off stub -->
                    <td width="90" style="background:#1a0d00;border:2px dashed #b8960c;border-left:none;padding:8px 12px;text-align:center;vertical-align:middle;">
                      <p style="margin:0 0 6px;font-size:8px;letter-spacing:0.2em;color:#b8960c;text-transform:uppercase;font-family:Arial,sans-serif;">Code</p>
                      <p style="margin:0;font-size:11px;font-weight:bold;color:#e2c97e;font-family:Georgia,serif;letter-spacing:0.1em;word-break:break-all;">{t.ConfirmationCode}</p>
                    </td>
                  </tr>
                </table>
            """));

            return $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"/></head>
            <body style="margin:0;padding:0;background:#0d0804;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0804;padding:40px 0;">
                <tr><td align="center">
                  <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

                    <!-- Header -->
                    <tr>
                      <td style="padding:0 0 28px;text-align:center;">
                        <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.45em;color:#b8960c;text-transform:uppercase;font-family:Arial,sans-serif;">Est. 1998 — Prishtina</p>
                        <h1 style="margin:0;font-size:32px;color:#e2c97e;font-family:Georgia,serif;font-weight:normal;letter-spacing:0.06em;">TWIN PEAKS</h1>
                        <p style="margin:4px 0 0;font-size:9px;letter-spacing:0.4em;color:#7a6040;text-transform:uppercase;font-family:Arial,sans-serif;">Cinema & Experience</p>
                      </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                      <td style="padding:0 0 20px;text-align:center;">
                        <p style="margin:0;font-size:14px;color:#c9a87c;font-family:Georgia,serif;">
                          Your booking is confirmed, {name}. See you at the show.
                        </p>
                      </td>
                    </tr>

                    <!-- Ticket stubs -->
                    <tr>
                      <td style="padding:0 0 20px;">
                        {ticketStubs}
                      </td>
                    </tr>

                    <!-- Total -->
                    <tr>
                      <td style="padding:16px 20px;background:#1e1409;border:1px solid #2e2008;text-align:right;">
                        <p style="margin:0;font-size:11px;letter-spacing:0.25em;color:#7a6040;text-transform:uppercase;font-family:Arial,sans-serif;">
                          Total paid &nbsp;
                          <span style="font-size:18px;color:#e2c97e;font-family:Georgia,serif;font-weight:bold;">€{total:F2}</span>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:24px 0 0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:11px;color:#4a3820;font-family:Arial,sans-serif;">Show your confirmation code at the door.</p>
                        <p style="margin:0;font-size:9px;letter-spacing:0.25em;color:#3a2810;text-transform:uppercase;font-family:Arial,sans-serif;">Twin Peaks Cinema · Est. 1998 · Prishtina</p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        }

        public void Cancel(Guid id)
        {
            var ut = _db.UserTickets.Include(ut => ut.Ticket).FirstOrDefault(ut => ut.Id == id);
            if (ut == null) throw new ArgumentException("UserTicket not found");
            ut.Ticket.Status = TicketStatus.Available;
            _db.UserTickets.Remove(ut);
            _db.SaveChanges();
        }

        private IQueryable<UserTicket> LoadWithIncludes()
        {
            return _db.UserTickets
                .Include(ut => ut.User)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Schedule).ThenInclude(s => s.Movie)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Schedule).ThenInclude(s => s.Room)
                .Include(ut => ut.Ticket).ThenInclude(t => t.Seat)
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
                PurchasedAt: ut.PurchasedAt.ToString("yyyy-MM-dd HH:mm")
            );
        }
    }
}