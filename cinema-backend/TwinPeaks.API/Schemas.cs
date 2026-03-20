using System;

namespace TwinPeaks.API
{
    public record RegisterRequest(string FirstName, string LastName, string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record RefreshRequest(string RefreshToken);
    public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds);
}
