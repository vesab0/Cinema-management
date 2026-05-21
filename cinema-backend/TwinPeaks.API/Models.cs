using System;
using System.Collections.Generic;

namespace TwinPeaks.API
{
    public class User
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? AvatarPath { get; set; }
        public string? PhoneNumber { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public int AccessFailedCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }

        public List<RefreshToken> RefreshTokens { get; set; } = new();
        public List<UserRole> UserRoles { get; set; } = new();
        public ICollection<UserFavoriteMovie> FavoriteMovies { get; set; } = new List<UserFavoriteMovie>();
    }

    public class Role
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string NormalizedName => Name.ToUpperInvariant();
        public List<UserRole> UserRoles { get; set; } = new();
    }

    public class RefreshToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public string Token { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public DateTime Created { get; set; }
        public DateTime? Revoked { get; set; }
    }

    public class UserRole
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public Guid RoleId { get; set; }
        public Role Role { get; set; } = null!;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }

    public class Movie
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public DateTime ReleaseDate { get; set; }
        public string Director { get; set; } = string.Empty;
        public string AgeRating { get; set; } = string.Empty;
        public string PosterUrl { get; set; } = string.Empty;
        public string TrailerUrl { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? TmdbId { get; set; }

        public ICollection<MovieGenre> MovieGenres { get; set; } = new List<MovieGenre>();
        public ICollection<MovieCast> MovieCasts { get; set; } = new List<MovieCast>();
    }

    public class Genre
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<MovieGenre> MovieGenres { get; set; } = new List<MovieGenre>();
    }

    public class CastMember
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;

        public ICollection<MovieCast> MovieCasts { get; set; } = new List<MovieCast>();
    }

    public class MovieGenre
    {
        public Guid MovieId { get; set; }
        public Movie Movie { get; set; } = null!;

        public Guid GenreId { get; set; }
        public Genre Genre { get; set; } = null!;
    }

    public class MovieCast
    {
        public Guid MovieId { get; set; }
        public Movie Movie { get; set; } = null!;

        public Guid CastMemberId { get; set; }
        public CastMember CastMember { get; set; } = null!;
    }

    public class Room
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Rows { get; set; }
        public int Cols { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Seat> Seats { get; set; } = new List<Seat>();
    }

    public class Seat
    {
        public Guid Id { get; set; }
        public Guid RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public string RowLabel { get; set; } = string.Empty;
        public int ColNumber { get; set; }
        public SeatType SeatType { get; set; } = SeatType.Standard;
        public bool IsActive { get; set; } = true;
    }

    public enum SeatType
    {
        Standard,
        VIP,
        Wheelchair
    }

    public class MovieSchedule
    {
        public Guid Id { get; set; }
        public Guid MovieId { get; set; }
        public Movie Movie { get; set; } = null!;

        public Guid RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public DateTime ScheduleDay { get; set; }
        public TimeSpan StartTime { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }

    public class UserFavoriteMovie
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public int TmdbId { get; set; }
        public string MovieTitle { get; set; } = string.Empty;
        public string PosterPath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public User User { get; set; } = null!;
    }

    public enum TicketStatus { Available, Sold }

    public class Ticket
    {
        public Guid Id { get; set; }
        public Guid ScheduleId { get; set; }
        public MovieSchedule Schedule { get; set; } = null!;
        public Guid SeatId { get; set; }
        public Seat Seat { get; set; } = null!;
        public decimal Price { get; set; }
        public TicketStatus Status { get; set; } = TicketStatus.Available;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public UserTicket? UserTicket { get; set; }
    }

    public class UserTicket
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public Guid TicketId { get; set; }
        public Ticket Ticket { get; set; } = null!;
        public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
        public string ConfirmationCode { get; set; } = string.Empty;
    }
}
