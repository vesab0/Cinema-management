using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class MovieService
    {
        private readonly ApplicationDbContext _db;

        public MovieService(ApplicationDbContext db)
        {
            _db = db;
        }

        public List<MovieResponse> GetAll()
        {
            return _db.Movies
                .AsSplitQuery()
                .Include(m => m.MovieGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MovieCasts).ThenInclude(mc => mc.CastMember)
                .Where(m => m.IsActive)
                .Select(m => ToResponse(m))
                .ToList();
        }

        public MovieResponse? GetById(Guid id)
        {
            var movie = _db.Movies
                .AsSplitQuery()
                .Include(m => m.MovieGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MovieCasts).ThenInclude(mc => mc.CastMember)
                .FirstOrDefault(m => m.Id == id);

            return movie == null ? null : ToResponse(movie);
        }

        public MovieResponse Create(CreateMovieRequest req)
        {
            if (req == null) throw new ArgumentException("Request body is required");

            var name = req.Name?.Trim();
            var description = req.Description?.Trim();
            var director = req.Director?.Trim();
            var ageRating = req.AgeRating?.Trim();

            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required");
            if (string.IsNullOrWhiteSpace(description)) throw new ArgumentException("Description is required");
            if (string.IsNullOrWhiteSpace(director)) throw new ArgumentException("Director is required");
            if (string.IsNullOrWhiteSpace(ageRating)) throw new ArgumentException("Age rating is required");

            var movie = new Movie
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = description,
                DurationMinutes = req.DurationMinutes,
                ReleaseDate = req.ReleaseDate,
                Director = director,
                AgeRating = ageRating,
                PosterUrl = req.PosterUrl?.Trim() ?? string.Empty,
                TrailerUrl = req.TrailerUrl?.Trim() ?? string.Empty,
                IsActive = req.IsActive ?? true,
                CreatedAt = req.CreatedAt ?? DateTime.UtcNow
            };

            foreach (var genreId in req.GenreIds ?? [])
            {
                movie.MovieGenres.Add(new MovieGenre { MovieId = movie.Id, GenreId = genreId });
            }

            foreach (var cast in req.Cast ?? [])
            {
                var fullName = cast.FullName?.Trim();
                if (string.IsNullOrWhiteSpace(fullName))
                {
                    continue;
                }

                var castMember = _db.CastMembers.FirstOrDefault(c => c.FullName == fullName)
                    ?? new CastMember { Id = Guid.NewGuid(), FullName = fullName };

                movie.MovieCasts.Add(new MovieCast
                {
                    MovieId = movie.Id,
                    CastMember = castMember
                });
            }

            _db.Movies.Add(movie);
            _db.SaveChanges();

            return GetById(movie.Id)!;
        }

        public (MovieResponse? movie, string? error) Update(Guid id, UpdateMovieRequest req)
        {
            var movie = _db.Movies
                .Include(m => m.MovieGenres)
                .Include(m => m.MovieCasts)
                .FirstOrDefault(m => m.Id == id);

            if (movie == null) return (null, "Movie not found");

            if (!string.IsNullOrWhiteSpace(req.Name))        movie.Name = req.Name.Trim();
            if (!string.IsNullOrWhiteSpace(req.Description)) movie.Description = req.Description.Trim();
            if (!string.IsNullOrWhiteSpace(req.Director))    movie.Director = req.Director.Trim();
            if (!string.IsNullOrWhiteSpace(req.AgeRating))   movie.AgeRating = req.AgeRating.Trim();
            if (req.PosterUrl != null) movie.PosterUrl = req.PosterUrl.Trim();
            if (req.TrailerUrl != null) movie.TrailerUrl = req.TrailerUrl.Trim();
            if (req.DurationMinutes.HasValue) movie.DurationMinutes = req.DurationMinutes.Value;
            if (req.ReleaseDate.HasValue)     movie.ReleaseDate = req.ReleaseDate.Value;
            if (req.IsActive.HasValue)        movie.IsActive = req.IsActive.Value;
            if (req.CreatedAt.HasValue)       movie.CreatedAt = req.CreatedAt.Value;

            if (req.GenreIds != null)
            {
                _db.MovieGenres.RemoveRange(movie.MovieGenres);
                foreach (var genreId in req.GenreIds)
                {
                    movie.MovieGenres.Add(new MovieGenre { MovieId = movie.Id, GenreId = genreId });
                }
            }

            if (req.Cast != null)
            {
                _db.MovieCasts.RemoveRange(movie.MovieCasts);
                foreach (var cast in req.Cast)
                {
                    var fullName = cast.FullName?.Trim();
                    if (string.IsNullOrWhiteSpace(fullName))
                    {
                        continue;
                    }

                    var castMember = _db.CastMembers.FirstOrDefault(c => c.FullName == fullName)
                        ?? new CastMember { Id = Guid.NewGuid(), FullName = fullName };

                    movie.MovieCasts.Add(new MovieCast
                    {
                        MovieId = movie.Id,
                        CastMember = castMember
                    });
                }
            }

            _db.SaveChanges();
            return (GetById(movie.Id), null);
        }

        public (bool ok, string? error) Delete(Guid id)
        {
            var movie = _db.Movies.FirstOrDefault(m => m.Id == id);
            if (movie == null) return (false, "Movie not found");

            movie.IsActive = false;
            _db.SaveChanges();
            return (true, null);
        }

        private static MovieResponse ToResponse(Movie m) => new(
            m.Id,
            m.Name,
            m.Description,
            m.DurationMinutes,
            m.ReleaseDate,
            m.Director,
            m.AgeRating,
            m.PosterUrl ?? "",
            m.TrailerUrl ?? "",
            m.IsActive,
            m.CreatedAt.ToString("yyyy-MM-dd"),
            m.MovieGenres.Select(mg => mg.Genre.Name).ToList(),
            m.MovieCasts.Select(mc => new CastResponse(mc.CastMember.FullName)).ToList()
        );
    }
}