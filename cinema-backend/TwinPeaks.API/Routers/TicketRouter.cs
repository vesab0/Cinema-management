using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class TicketRouter
    {
        public static void MapTicketRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/tickets");

            group.MapGet("/", (TicketService ticketService) =>
            {
                try
                {
                    return Results.Ok(ticketService.GetAll());
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch tickets", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/schedule/{scheduleId:guid}", (Guid scheduleId, TicketService ticketService) =>
            {
                try
                {
                    return Results.Ok(ticketService.GetBySchedule(scheduleId));
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch tickets", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/{id:guid}", (Guid id, TicketService ticketService) =>
            {
                try
                {
                    var ticket = ticketService.GetById(id);
                    if (ticket == null) return Results.NotFound(new { message = "Ticket not found" });
                    return Results.Ok(ticket);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch ticket", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/", (CreateTicketRequest req, TicketService ticketService) =>
            {
                try
                {
                    var ticket = ticketService.Create(req);
                    return Results.Created($"/api/tickets/{ticket.Id}", ticket);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create ticket", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/generate/{scheduleId:guid}", (Guid scheduleId, decimal price, TicketService ticketService) =>
            {
                try
                {
                    var created = ticketService.GenerateForSchedule(scheduleId, price);
                    return Results.Ok(new { created });
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to generate tickets", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPut("/{id:guid}", (Guid id, UpdateTicketRequest req, TicketService ticketService) =>
            {
                try
                {
                    var ticket = ticketService.Update(id, req);
                    return Results.Ok(ticket);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update ticket", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapDelete("/{id:guid}", (Guid id, TicketService ticketService) =>
            {
                try
                {
                    ticketService.Delete(id);
                    return Results.NoContent();
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to delete ticket", detail: ex.Message, statusCode: 500);
                }
            });
        }
    }
}
