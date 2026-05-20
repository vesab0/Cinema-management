using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class TicketService
    {
        private readonly ApplicationDbContext _db;

        public TicketService(ApplicationDbContext db)
        {
            _db = db;
        }

        public List<TicketResponse> GetAll()
        {
            return _db.Tickets
                .Include(t => t.Schedule).ThenInclude(s => s.Movie)
                .Include(t => t.Seat)
                .OrderBy(t => t.Schedule.ScheduleDay)
                .ThenBy(t => t.Seat.RowLabel)
                .ThenBy(t => t.Seat.ColNumber)
                .Select(t => ToResponse(t))
                .ToList();
        }

        public List<TicketResponse> GetBySchedule(Guid scheduleId)
        {
            return _db.Tickets
                .Include(t => t.Schedule).ThenInclude(s => s.Movie)
                .Include(t => t.Seat)
                .Where(t => t.ScheduleId == scheduleId)
                .OrderBy(t => t.Seat.RowLabel)
                .ThenBy(t => t.Seat.ColNumber)
                .Select(t => ToResponse(t))
                .ToList();
        }

        public TicketResponse? GetById(Guid id)
        {
            var ticket = _db.Tickets
                .Include(t => t.Schedule).ThenInclude(s => s.Movie)
                .Include(t => t.Seat)
                .FirstOrDefault(t => t.Id == id);

            return ticket == null ? null : ToResponse(ticket);
        }

        public int GenerateForSchedule(Guid scheduleId, decimal defaultPrice)
        {
            var schedule = _db.MovieSchedules
                .Include(s => s.Room).ThenInclude(r => r.Seats)
                .FirstOrDefault(s => s.Id == scheduleId);

            if (schedule == null) throw new ArgumentException("Schedule not found");

            var existingSeatIds = _db.Tickets
                .Where(t => t.ScheduleId == scheduleId)
                .Select(t => t.SeatId)
                .ToHashSet();

            var newTickets = schedule.Room.Seats
                .Where(s => s.IsActive && !existingSeatIds.Contains(s.Id))
                .Select(s => new Ticket
                {
                    Id = Guid.NewGuid(),
                    ScheduleId = scheduleId,
                    SeatId = s.Id,
                    Price = defaultPrice,
                    Status = TicketStatus.Available,
                    CreatedAt = DateTime.UtcNow
                })
                .ToList();

            _db.Tickets.AddRange(newTickets);
            _db.SaveChanges();

            return newTickets.Count;
        }

        public TicketResponse Create(CreateTicketRequest req)
        {
            if (req.ScheduleId == Guid.Empty) throw new ArgumentException("ScheduleId is required");
            if (req.SeatId == Guid.Empty) throw new ArgumentException("SeatId is required");
            if (req.Price < 0) throw new ArgumentException("Price must be non-negative");

            var schedule = _db.MovieSchedules.FirstOrDefault(s => s.Id == req.ScheduleId);
            if (schedule == null) throw new ArgumentException("Schedule not found");

            var seat = _db.Seats.FirstOrDefault(s => s.Id == req.SeatId);
            if (seat == null) throw new ArgumentException("Seat not found");

            var existing = _db.Tickets.FirstOrDefault(t => t.ScheduleId == req.ScheduleId && t.SeatId == req.SeatId);
            if (existing != null) throw new ArgumentException("A ticket for this seat and schedule already exists");

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                ScheduleId = req.ScheduleId,
                SeatId = req.SeatId,
                Price = req.Price,
                Status = TicketStatus.Available,
                CreatedAt = DateTime.UtcNow
            };

            _db.Tickets.Add(ticket);
            _db.SaveChanges();

            return GetById(ticket.Id)!;
        }

        public TicketResponse Update(Guid id, UpdateTicketRequest req)
        {
            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == id);
            if (ticket == null) throw new ArgumentException("Ticket not found");

            if (req.Price.HasValue)
            {
                if (req.Price.Value < 0) throw new ArgumentException("Price must be non-negative");
                ticket.Price = req.Price.Value;
            }

            if (req.Status.HasValue)
                ticket.Status = req.Status.Value;

            _db.SaveChanges();

            return GetById(id)!;
        }

        public void Delete(Guid id)
        {
            var ticket = _db.Tickets.FirstOrDefault(t => t.Id == id);
            if (ticket == null) throw new ArgumentException("Ticket not found");
            if (ticket.Status != TicketStatus.Available)
                throw new ArgumentException("Only available tickets can be deleted");

            _db.Tickets.Remove(ticket);
            _db.SaveChanges();
        }

        private static TicketResponse ToResponse(Ticket t)
        {
            return new TicketResponse(
                Id: t.Id,
                ScheduleId: t.ScheduleId,
                MovieName: t.Schedule.Movie.Name,
                ScheduleDay: t.Schedule.ScheduleDay,
                StartTime: t.Schedule.StartTime.ToString(@"hh\:mm"),
                SeatId: t.SeatId,
                RowLabel: t.Seat.RowLabel,
                ColNumber: t.Seat.ColNumber,
                SeatType: t.Seat.SeatType.ToString(),
                Price: t.Price,
                Status: t.Status.ToString(),
                CreatedAt: t.CreatedAt.ToString("yyyy-MM-dd")
            );
        }
    }
}
