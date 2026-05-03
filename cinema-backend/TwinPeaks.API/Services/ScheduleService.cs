using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class ScheduleService
    {
        private readonly ApplicationDbContext _db;

        public ScheduleService(ApplicationDbContext db)
        {
            _db = db;
        }

        public List<MovieScheduleResponse> GetAll()
        {
            return _db.MovieSchedules
                .Include(s => s.Movie)
                .Include(s => s.Room)
                .Where(s => s.IsActive)
                .Select(s => ToResponse(s))
                .ToList();
        }

        public MovieScheduleResponse? GetById(Guid id)
        {
            var schedule = _db.MovieSchedules
                .Include(s => s.Movie)
                .Include(s => s.Room)
                .FirstOrDefault(s => s.Id == id);

            return schedule == null ? null : ToResponse(schedule);
        }

        public List<MovieScheduleResponse> GetByMovieId(Guid movieId)
        {
            return _db.MovieSchedules
                .Include(s => s.Movie)
                .Include(s => s.Room)
                .Where(s => s.MovieId == movieId && s.IsActive)
                .Select(s => ToResponse(s))
                .ToList();
        }

        public List<MovieScheduleResponse> GetByRoomId(Guid roomId)
        {
            return _db.MovieSchedules
                .Include(s => s.Movie)
                .Include(s => s.Room)
                .Where(s => s.RoomId == roomId && s.IsActive)
                .OrderBy(s => s.ScheduleDay)
                .ThenBy(s => s.StartTime)
                .Select(s => ToResponse(s))
                .ToList();
        }

        public List<MovieScheduleResponse> GetByDate(DateTime date)
        {
            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1);

            return _db.MovieSchedules
                .Include(s => s.Movie)
                .Include(s => s.Room)
                .Where(s => s.ScheduleDay >= startOfDay && s.ScheduleDay < endOfDay && s.IsActive)
                .OrderBy(s => s.StartTime)
                .Select(s => ToResponse(s))
                .ToList();
        }

        public MovieScheduleResponse Create(CreateMovieScheduleRequest req)
        {
            if (req == null) throw new ArgumentException("Request body is required");
            if (req.MovieId == Guid.Empty) throw new ArgumentException("MovieId is required");
            if (req.RoomId == Guid.Empty) throw new ArgumentException("RoomId is required");
            if (req.ScheduleDay == default) throw new ArgumentException("ScheduleDay is required");

            // Validate that movie exists
            var movie = _db.Movies.FirstOrDefault(m => m.Id == req.MovieId);
            if (movie == null) throw new ArgumentException("Movie not found");

            // Validate that room exists
            var room = _db.Rooms.FirstOrDefault(r => r.Id == req.RoomId);
            if (room == null) throw new ArgumentException("Room not found");

            // Check uniqueness constraint
            var existing = _db.MovieSchedules.FirstOrDefault(s =>
                s.MovieId == req.MovieId &&
                s.RoomId == req.RoomId &&
                s.ScheduleDay == req.ScheduleDay &&
                s.StartTime == req.StartTime);

            if (existing != null)
                throw new ArgumentException("Schedule already exists for this movie, room, day and time combination");

            var schedule = new MovieSchedule
            {
                Id = Guid.NewGuid(),
                MovieId = req.MovieId,
                RoomId = req.RoomId,
                ScheduleDay = req.ScheduleDay,
                StartTime = req.StartTime,
                IsActive = req.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            _db.MovieSchedules.Add(schedule);
            _db.SaveChanges();

            return GetById(schedule.Id)!;
        }

        public MovieScheduleResponse Update(Guid id, UpdateMovieScheduleRequest req)
        {
            var schedule = _db.MovieSchedules.FirstOrDefault(s => s.Id == id);
            if (schedule == null) throw new ArgumentException("Schedule not found");

            if (req.MovieId.HasValue && req.MovieId.Value != Guid.Empty)
            {
                var movie = _db.Movies.FirstOrDefault(m => m.Id == req.MovieId.Value);
                if (movie == null) throw new ArgumentException("Movie not found");
                schedule.MovieId = req.MovieId.Value;
            }

            if (req.RoomId.HasValue && req.RoomId.Value != Guid.Empty)
            {
                var room = _db.Rooms.FirstOrDefault(r => r.Id == req.RoomId.Value);
                if (room == null) throw new ArgumentException("Room not found");
                schedule.RoomId = req.RoomId.Value;
            }

            if (req.ScheduleDay.HasValue && req.ScheduleDay.Value != default)
                schedule.ScheduleDay = req.ScheduleDay.Value;

            if (req.StartTime.HasValue)
                schedule.StartTime = req.StartTime.Value;

            if (req.IsActive.HasValue)
                schedule.IsActive = req.IsActive.Value;

            // Check uniqueness constraint for updated values
            var existing = _db.MovieSchedules.FirstOrDefault(s =>
                s.Id != id &&
                s.MovieId == schedule.MovieId &&
                s.RoomId == schedule.RoomId &&
                s.ScheduleDay == schedule.ScheduleDay &&
                s.StartTime == schedule.StartTime);

            if (existing != null)
                throw new ArgumentException("Schedule already exists for this movie, room, day and time combination");

            _db.SaveChanges();

            return GetById(id)!;
        }

        public void Delete(Guid id)
        {
            var schedule = _db.MovieSchedules.FirstOrDefault(s => s.Id == id);
            if (schedule == null) throw new ArgumentException("Schedule not found");

            _db.MovieSchedules.Remove(schedule);
            _db.SaveChanges();
        }

        private static MovieScheduleResponse ToResponse(MovieSchedule schedule)
        {
            return new MovieScheduleResponse(
                Id: schedule.Id,
                MovieId: schedule.MovieId,
                MovieName: schedule.Movie.Name,
                RoomId: schedule.RoomId,
                RoomName: schedule.Room.Name,
                ScheduleDay: schedule.ScheduleDay,
                StartTime: schedule.StartTime.ToString(@"hh\:mm"),
                CreatedAt: schedule.CreatedAt.ToString("yyyy-MM-dd"),
                IsActive: schedule.IsActive
            );
        }
    }
}
