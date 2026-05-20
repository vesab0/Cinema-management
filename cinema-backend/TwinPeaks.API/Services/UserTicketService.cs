using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class UserTicketService
    {
        private readonly ApplicationDbContext _db;

        public UserTicketService(ApplicationDbContext db)
        {
            _db = db;
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

        public UserTicketResponse Purchase(PurchaseTicketRequest req)
        {
            if (req.UserId == Guid.Empty) throw new ArgumentException("UserId is required");
            if (req.TicketId == Guid.Empty) throw new ArgumentException("TicketId is required");

            var user = _db.Users.FirstOrDefault(u => u.Id == req.UserId);
            if (user == null) throw new ArgumentException("User not found");

            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == req.TicketId);
            if (ticket == null) throw new ArgumentException("Ticket not found");
            if (ticket.Status != TicketStatus.Available)
                throw new ArgumentException("Ticket is no longer available");

            ticket.Status = TicketStatus.Sold;

            var userTicket = new UserTicket
            {
                Id = Guid.NewGuid(),
                UserId = req.UserId,
                TicketId = req.TicketId,
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
