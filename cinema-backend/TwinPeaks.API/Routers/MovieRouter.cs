using TwinPeaks.API.Services;
using FluentValidation;

namespace TwinPeaks.API.Routers
{
    public static class MoviesRouter
    {
        public static void MapMovieRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/movies");

            // Public reads
            group.MapGet("/", (MovieService movies) =>
            {
                try
                {
                    var result = movies.GetAll();
                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch movies", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapGet("/{id:guid}", (Guid id, MovieService movies) =>
            {
                try
                {
                    var movie = movies.GetById(id);
                    if (movie == null) return Results.NotFound(new { message = "Movie not found" });
                    return Results.Ok(movie);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch movie", detail: ex.Message, statusCode: 500);
                }
            });

            // Staff/Admin mutations
            group.MapPost("/", async (CreateMovieRequest req, MovieService movies, MovieNotificationService notifications, IValidator<CreateMovieRequest> validator) =>
            {
                var validation = await validator.ValidateAsync(req);
                if (!validation.IsValid)
                    return Results.ValidationProblem(validation.ToDictionary());

                try
                {
                    var movie = movies.Create(req);
                    notifications.NotifyOnNewMovie(movie);
                    return Results.Created($"/api/movies/{movie.Id}", movie);
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to create movie", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization("StaffOrAdmin");

            group.MapPut("/{id:guid}", (Guid id, UpdateMovieRequest req, MovieService movies) =>
            {
                try
                {
                    var (movie, err) = movies.Update(id, req);
                    if (movie == null) return Results.NotFound(new { message = err ?? "Movie not found" });
                    return Results.Ok(movie);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to update movie", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization("StaffOrAdmin");

            group.MapDelete("/{id:guid}", (Guid id, MovieService movies) =>
            {
                try
                {
                    var (ok, err) = movies.Delete(id);
                    if (!ok) return Results.NotFound(new { message = err ?? "Movie not found" });
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to delete movie", detail: ex.Message, statusCode: 500);
                }
            })
            .RequireAuthorization("StaffOrAdmin");
        }
    }
}
