using System;

namespace TwinPeaks.API
{
    public record RegisterRequest(string FirstName, string LastName, string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record RefreshRequest(string RefreshToken);
    public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds);

    public record UserResponse(
        Guid   Id,
        string FirstName,
        string LastName,
        string Email,
        string Phone,
        string Role,
        string CreatedAt,
        bool   IsActive
    );

    public record UpdateUserRequest(
        string? FirstName,
        string? LastName,
        string? Phone,
        string? Role
    );

    public record MovieResponse(
        Guid Id, string Name, string Description,
        int DurationMinutes, DateTime ReleaseDate,
        string Director, string AgeRating,
        string PosterUrl, string TrailerUrl,
        bool IsActive, string CreatedAt,
        List<string> Genres,
        List<CastResponse> Cast
    );

    public record CastResponse(string FullName);

    public record CreateMovieRequest(
        string Name, string Description,
        int DurationMinutes, DateTime ReleaseDate,
        string Director, string AgeRating,
        string? PosterUrl, string? TrailerUrl,
        bool? IsActive,
        DateTime? CreatedAt,
        List<Guid> GenreIds,
        List<CastEntryRequest> Cast
    );

    public record UpdateMovieRequest(
        string? Name, string? Description,
        int? DurationMinutes, DateTime? ReleaseDate,
        string? Director, string? AgeRating,
        string? PosterUrl, string? TrailerUrl,
        bool? IsActive,
        DateTime? CreatedAt,
        List<Guid>? GenreIds,
        List<CastEntryRequest>? Cast
    );

    public record CastEntryRequest(string FullName);

    public record GenreOptionResponse(Guid Id, string Name);
    public record CreateGenreRequest(string Name);

    public record CastMemberOptionResponse(Guid Id, string FullName);
    public record CreateCastMemberRequest(string FullName);

    public record UploadImageResponse(string Url);
    public record CreateRoomRequest(string Name, int Rows, int Cols);
    public record UpdateRoomRequest(string? Name, bool? IsActive);
    public record RoomResponse(Guid Id, string Name, int Rows, int Cols, bool IsActive, string CreatedAt);
    public record RoomWithSeatsResponse(Guid Id, string Name, int Rows, int Cols, bool IsActive, string CreatedAt, List<SeatResponse> Seats);

    public record UpdateSeatRequest(SeatType? SeatType, bool? IsActive);
    public record SeatResponse(Guid Id, string RowLabel, int ColNumber, SeatType SeatType, bool IsActive);

    public record MovieScheduleResponse(
        Guid Id,
        Guid MovieId,
        string MovieName,
        Guid RoomId,
        string RoomName,
        DateTime ScheduleDay,
        string StartTime,
        string CreatedAt,
        bool IsActive
    );

    public record CreateMovieScheduleRequest(
        Guid MovieId,
        Guid RoomId,
        DateTime ScheduleDay,
        TimeSpan StartTime,
        bool? IsActive
    );

    public record UpdateMovieScheduleRequest(
        Guid? MovieId,
        Guid? RoomId,
        DateTime? ScheduleDay,
        TimeSpan? StartTime,
        bool? IsActive
    );
}
