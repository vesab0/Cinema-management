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
        public string? PhoneNumber { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public int AccessFailedCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }

        public List<RefreshToken> RefreshTokens { get; set; } = new();
        public List<UserRole> UserRoles { get; set; } = new();
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
}
