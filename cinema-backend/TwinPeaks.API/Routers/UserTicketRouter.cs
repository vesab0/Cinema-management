using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class UserTicketRouter
    {
        public static void MapUserTicketRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/user-tickets");

            // Admin-only: view all purchased tickets (dashboard)
            group.MapGet("/", (UserTicketService userTicketService) =>
            {
                try
                {
                    return Results.Ok(userTicketService.GetAll());
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch user tickets", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization("AdminOnly");

            // Public: ticket verification by confirmation code
            group.MapGet("/confirm/{code}", (string code, UserTicketService userTicketService) =>
            {
                try
                {
                    var ut = userTicketService.GetByConfirmationCode(code);
                    if (ut == null) return Results.NotFound(new { message = "UserTicket not found" });
                    return Results.Ok(ut);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch user ticket", detail: ex.Message, statusCode: 500);
                }
            });

            // Authenticated user endpoints
            group.MapGet("/{id:guid}", (Guid id, UserTicketService userTicketService) =>
            {
                try
                {
                    var ut = userTicketService.GetById(id);
                    if (ut == null) return Results.NotFound(new { message = "UserTicket not found" });
                    return Results.Ok(ut);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch user ticket", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization();

            group.MapPost("/purchase", async (PurchaseTicketRequest req, UserTicketService userTicketService) =>
            {
                try
                {
                    var ut = await userTicketService.PurchaseAsync(req);
                    return Results.Created($"/api/user-tickets/{ut.Id}", ut);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to purchase ticket", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization();

            group.MapPost("/purchase-multi", async (PurchaseMultiTicketRequest req, UserTicketService userTicketService) =>
            {
                try
                {
                    var results = await userTicketService.PurchaseMultiAsync(req);
                    return Results.Ok(results);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to purchase tickets", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization();

            group.MapDelete("/{id:guid}", (Guid id, UserTicketService userTicketService) =>
            {
                try
                {
                    userTicketService.Cancel(id);
                    return Results.NoContent();
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to cancel user ticket", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization();
        }
    }
}
