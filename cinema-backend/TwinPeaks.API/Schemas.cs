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
}
