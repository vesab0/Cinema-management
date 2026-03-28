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
                        {
                            return Results.Conflict(new { message = err });
                        }

                        return Results.BadRequest(new { message = err ?? "Invalid registration request" });
                    }

                    return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email, user.FirstName, user.LastName });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Registration failed", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
                }
            });

            group.MapPost("/login", (LoginRequest req, AuthService auth) =>
            {
                try
                {
                    var (res, err) = auth.Login(req);
                    if (res == null)
                    {
                        if (err == "Email and password are required")
                        {
                            return Results.BadRequest(new { message = err });
                        }

                        return Results.Json(new { message = err ?? "Login failed" }, statusCode: StatusCodes.Status401Unauthorized);
                    }

                    return Results.Ok(res);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Login failed", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
                }
            });

            group.MapPost("/refresh", (RefreshRequest req, AuthService auth) =>
            {
                try
                {
                    var (res, err) = auth.Refresh(req.RefreshToken);
                    if (res == null)
                    {
                        return Results.Json(new { message = err ?? "Token refresh failed" }, statusCode: StatusCodes.Status401Unauthorized);
                    }

                    return Results.Ok(res);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Token refresh failed", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
                }
            });
        }
    }
}
