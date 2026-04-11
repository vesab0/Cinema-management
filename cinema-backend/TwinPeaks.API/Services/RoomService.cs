using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class RoomService
    {
        private readonly ApplicationDbContext _db;

        public RoomService(ApplicationDbContext db)
        {
            _db = db;
        }

        public List<RoomResponse> GetAll()
        {
            return _db.Rooms
                .Where(r => r.IsActive)
                .Select(r => ToResponse(r))
                .ToList();
        }

        public RoomWithSeatsResponse? GetById(Guid id)
        {
            var room = _db.Rooms
                .Include(r => r.Seats)
                .FirstOrDefault(r => r.Id == id);

            return room == null ? null : ToDetailResponse(room);
        }

        public RoomWithSeatsResponse Create(CreateRoomRequest req)
        {
            var name = req.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required");
            if (req.Rows <= 0) throw new ArgumentException("Rows must be greater than 0");
            if (req.Cols <= 0) throw new ArgumentException("Cols must be greater than 0");

            var room = new Room
            {
                Id = Guid.NewGuid(),
                Name = name,
                Rows = req.Rows,
                Cols = req.Cols,
                CreatedAt = DateTime.UtcNow
            };

            for (int r = 0; r < req.Rows; r++)
            {
                string rowLabel = ((char)('A' + r)).ToString();
                for (int c = 1; c <= req.Cols; c++)
                {
                    room.Seats.Add(new Seat
                    {
                        Id = Guid.NewGuid(),
                        RowLabel = rowLabel,
                        ColNumber = c
                    });
                }
            }

            _db.Rooms.Add(room);
            _db.SaveChanges();

            return GetById(room.Id)!;
        }

        public (RoomResponse? room, string? error) Update(Guid id, UpdateRoomRequest req)
        {
            var room = _db.Rooms.FirstOrDefault(r => r.Id == id);
            if (room == null) return (null, "Room not found");

            if (!string.IsNullOrWhiteSpace(req.Name)) room.Name = req.Name.Trim();
            if (req.IsActive.HasValue) room.IsActive = req.IsActive.Value;

            _db.SaveChanges();
            return (ToResponse(room), null);
        }

        public (bool ok, string? error) UpdateSeat(Guid roomId, Guid seatId, UpdateSeatRequest req)
        {
            var seat = _db.Seats.FirstOrDefault(s => s.Id == seatId && s.RoomId == roomId);
            if (seat == null) return (false, "Seat not found");

            if (req.SeatType.HasValue) seat.SeatType = req.SeatType.Value;
            if (req.IsActive.HasValue) seat.IsActive = req.IsActive.Value;

            _db.SaveChanges();
            return (true, null);
        }

        public (bool ok, string? error) Delete(Guid id)
        {
            var room = _db.Rooms.FirstOrDefault(r => r.Id == id);
            if (room == null) return (false, "Room not found");

            room.IsActive = false;
            _db.SaveChanges();
            return (true, null);
        }

        private static RoomResponse ToResponse(Room r) => new(
            r.Id,
            r.Name,
            r.Rows,
            r.Cols,
            r.IsActive,
            r.CreatedAt.ToString("yyyy-MM-dd")
        );

        private static RoomWithSeatsResponse ToDetailResponse(Room r) => new(
            r.Id,
            r.Name,
            r.Rows,
            r.Cols,
            r.IsActive,
            r.CreatedAt.ToString("yyyy-MM-dd"),
            r.Seats.OrderBy(s => s.RowLabel).ThenBy(s => s.ColNumber)
                   .Select(s => new SeatResponse(s.Id, s.RowLabel, s.ColNumber, s.SeatType, s.IsActive))
                   .ToList()
        );
    }
}