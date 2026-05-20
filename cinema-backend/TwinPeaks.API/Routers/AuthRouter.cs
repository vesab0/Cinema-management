using CinemaApp = TwinPeaks.API;
using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class AuthRouter
    {
        public static void MapAuthRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/auth");

            group.MapPost("/register", (RegisterRequest req, AuthService auth) =>
            {
                try
                {
                    var (user, err) = auth.Register(req);
                    if (user == null)
                    {
                        if (err == "Email already in use")
                            return Results.Conflict(new { message = err });
                        return Results.BadRequest(new { message = err ?? "Invalid registration request" });
                    }

                    return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email, user.FirstName, user.LastName });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Registration failed", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/login", (LoginRequest req, AuthService auth, HttpContext ctx) =>
            {
                try
                {
                    var (res, err) = auth.Login(req);
                    if (res == null)
                    {
                        if (err == "Email and password are required")
                            return Results.BadRequest(new { message = err });
                        return Results.Json(new { message = err ?? "Login failed" }, statusCode: 401);
                    }

                    ctx.Response.Cookies.Append("refresh_token", res.RefreshToken, new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = false,
                        SameSite = SameSiteMode.Lax,
                        MaxAge = TimeSpan.FromDays(7),
                        Path = "/"
                    });

                    return Results.Ok(new { accessToken = res.AccessToken, expiresIn = res.ExpiresInSeconds });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Login failed", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/refresh", (AuthService auth, HttpContext ctx) =>
            {
                try
                {
                    var refreshToken = ctx.Request.Cookies["refresh_token"];
                    if (string.IsNullOrEmpty(refreshToken))
                        return Results.Json(new { message = "No refresh token" }, statusCode: 401);

                    var (res, err) = auth.Refresh(refreshToken);
                    if (res == null)
                    {
                        ctx.Response.Cookies.Delete("refresh_token");
                        return Results.Json(new { message = err ?? "Token refresh failed" }, statusCode: 401);
                    }

                    ctx.Response.Cookies.Append("refresh_token", res.RefreshToken, new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = false,
                        SameSite = SameSiteMode.Lax,
                        MaxAge = TimeSpan.FromDays(7),
                        Path = "/"
                    });

                    return Results.Ok(new { accessToken = res.AccessToken, expiresIn = res.ExpiresInSeconds });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Token refresh failed", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/me", (HttpContext ctx, TokenService tokens, AuthService auth) =>
            {
                var authHeader = ctx.Request.Headers.Authorization.ToString();
                if (!authHeader.StartsWith("Bearer "))
                    return Results.Json(new { message = "No token" }, statusCode: 401);

                var accessToken = authHeader.Substring("Bearer ".Length);
                var principal = tokens.ValidateToken(accessToken);
                if (principal == null)
                    return Results.Json(new { message = "Invalid token" }, statusCode: 401);

                var userIdClaim = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                    ?? principal.FindFirst("sub");
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                    return Results.Json(new { message = "Invalid token" }, statusCode: 401);

                var user = auth.GetById(userId);
                if (user == null)
                    return Results.Json(new { message = "User not found" }, statusCode: 404);

                var roles = user.UserRoles
                    .Select(ur => ur.Role?.Name)
                    .Where(r => !string.IsNullOrEmpty(r))
                    .ToList();

                return Results.Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    avatarPath = user.AvatarPath,
                    roles,
                    isActive = user.IsActive
                });
            });

            group.MapPost("/logout", (AuthService auth, HttpContext ctx) =>
            {
                var refreshToken = ctx.Request.Cookies["refresh_token"];
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    auth.RevokeRefreshToken(refreshToken);
                }

                ctx.Response.Cookies.Delete("refresh_token");
                return Results.Ok(new { message = "Logged out" });
            });
        }
    }
}