using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class ScheduleRouter
    {
        public static void MapScheduleRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/schedules");

            group.MapGet("/", (ScheduleService scheduleService) =>
            {
                try
                {
                    var result = scheduleService.GetAll();
                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch schedules", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/{id:guid}", (Guid id, ScheduleService scheduleService) =>
            {
                try
                {
                    var schedule = scheduleService.GetById(id);
                    if (schedule == null) return Results.NotFound(new { message = "Schedule not found" });
                    return Results.Ok(schedule);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch schedule", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/movie/{movieId:guid}", (Guid movieId, ScheduleService scheduleService) =>
            {
                try
                {
                    var schedules = scheduleService.GetByMovieId(movieId);
                    return Results.Ok(schedules);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch schedules", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/room/{roomId:guid}", (Guid roomId, ScheduleService scheduleService) =>
            {
                try
                {
                    var schedules = scheduleService.GetByRoomId(roomId);
                    return Results.Ok(schedules);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch schedules", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/date/{date}", (string date, ScheduleService scheduleService) =>
            {
                try
                {
                    if (!DateTime.TryParse(date, out var parsedDate))
                        return Results.BadRequest(new { message = "Invalid date format" });

                    var schedules = scheduleService.GetByDate(parsedDate);
                    return Results.Ok(schedules);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch schedules", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/", (CreateMovieScheduleRequest req, ScheduleService scheduleService) =>
            {
                try
                {
                    var schedule = scheduleService.Create(req);
                    return Results.Created($"/api/schedules/{schedule.Id}", schedule);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create schedule", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPut("/{id:guid}", (Guid id, UpdateMovieScheduleRequest req, ScheduleService scheduleService) =>
            {
                try
                {
                    var schedule = scheduleService.Update(id, req);
                    return Results.Ok(schedule);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update schedule", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapDelete("/{id:guid}", (Guid id, ScheduleService scheduleService) =>
            {
                try
                {
                    scheduleService.Delete(id);
                    return Results.NoContent();
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to delete schedule", detail: ex.Message, statusCode: 500);
                }
            });
        }
    }
}
