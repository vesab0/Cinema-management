using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class UsersRouter
    {
        public static void MapUserRoutes(this WebApplication app)
        {
            // Admin-only routes: list, get by id, delete
            var adminGroup = app.MapGroup("/api/users")
                .RequireAuthorization("AdminOnly");

            adminGroup.MapGet("/", (UsersService users) =>
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

            adminGroup.MapGet("/{id:guid}", (Guid id, UsersService users) =>
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

            adminGroup.MapDelete("/{id:guid}", (Guid id, UsersService users) =>
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

            // Profile update — any authenticated user may update their own record;
            // only admins may update other users or change roles.
            app.MapPut("/api/users/{id:guid}", (Guid id, UpdateUserRequest req, UsersService users, HttpContext ctx) =>
            {
                try
                {
                    var callerId = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? ctx.User.FindFirst("sub")?.Value;
                    var isAdmin = ctx.User.IsInRole("admin");

                    if (!isAdmin && callerId != id.ToString())
                        return Results.Forbid();

                    // Non-admins cannot change roles
                    var effectiveReq = isAdmin ? req : req with { Role = null };

                    var (user, err) = users.Update(id, effectiveReq);
                    if (user == null) return Results.NotFound(new { message = err ?? "User not found" });
                    return Results.Ok(user);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update user", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization();
        }
    }
}
