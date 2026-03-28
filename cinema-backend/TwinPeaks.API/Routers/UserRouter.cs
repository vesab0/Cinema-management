using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class UsersRouter
    {
        public static void MapUserRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/users");

            // GET /api/users
            group.MapGet("/", (UsersService users) =>
            {
                try
                {
                    var result = users.GetAll();
                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch users", detail: ex.Message, statusCode: 500);
                }
            });

            // GET /api/users/{id}
            group.MapGet("/{id:guid}", (Guid id, UsersService users) =>
            {
                try
                {
                    var user = users.GetById(id);
                    if (user == null) return Results.NotFound(new { message = "User not found" });
                    return Results.Ok(user);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch user", detail: ex.Message, statusCode: 500);
                }
            });

            // PUT /api/users/{id}
            group.MapPut("/{id:guid}", (Guid id, UpdateUserRequest req, UsersService users) =>
            {
                try
                {
                    var (user, err) = users.Update(id, req);
                    if (user == null) return Results.NotFound(new { message = err ?? "User not found" });
                    return Results.Ok(user);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update user", detail: ex.Message, statusCode: 500);
                }
            });

            // DELETE /api/users/{id}
            group.MapDelete("/{id:guid}", (Guid id, UsersService users) =>
            {
                try
                {
                    var (ok, err) = users.Delete(id);
                    if (!ok) return Results.NotFound(new { message = err ?? "User not found" });
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to delete user", detail: ex.Message, statusCode: 500);
                }
            });
        }
    }
}