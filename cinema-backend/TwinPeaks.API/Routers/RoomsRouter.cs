using TwinPeaks.API.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class RoomsRouter
    {
        public static void MapRoomRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/rooms");

            group.MapGet("/", (RoomService rooms) =>
            {
                try
                {
                    return Results.Ok(rooms.GetAll());
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch rooms", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/{id:guid}", (Guid id, RoomService rooms) =>
            {
                try
                {
                    var room = rooms.GetById(id);
                    if (room == null) return Results.NotFound(new { message = "Room not found" });
                    return Results.Ok(room);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch room", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/", (CreateRoomRequest req, RoomService rooms) =>
            {
                try
                {
                    var room = rooms.Create(req);
                    return Results.Created($"/api/rooms/{room.Id}", room);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create room", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPut("/{id:guid}", (Guid id, UpdateRoomRequest req, RoomService rooms) =>
            {
                try
                {
                    var (room, err) = rooms.Update(id, req);
                    if (room == null) return Results.NotFound(new { message = err ?? "Room not found" });
                    return Results.Ok(room);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update room", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPatch("/{roomId:guid}/seats/{seatId:guid}", (Guid roomId, Guid seatId, UpdateSeatRequest req, RoomService rooms) =>
            {
                try
                {
                    var (ok, err) = rooms.UpdateSeat(roomId, seatId, req);
                    if (!ok) return Results.NotFound(new { message = err ?? "Seat not found" });
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update seat", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapDelete("/{id:guid}", (Guid id, RoomService rooms) =>
            {
                try
                {
                    var (ok, err) = rooms.Delete(id);
                    if (!ok) return Results.NotFound(new { message = err ?? "Room not found" });
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to delete room", detail: ex.Message, statusCode: 500);
                }
            });
        }
    }
}