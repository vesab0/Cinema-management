using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using TwinPeaks.API.Data;

namespace TwinPeaks.API.Routers
{
    public static class FavoritesRouter
    {
        public static void MapFavoritesRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/users/{userId:guid}/favorites");

            group.MapGet("/", async (Guid userId, ApplicationDbContext db) =>
            {
                try
                {
                    var favorites = await db.UserFavoriteMovies
                        .Where(f => f.UserId == userId)
                        .OrderByDescending(f => f.CreatedAt)
                        .Select(f => new FavoriteMovieResponse(
                            f.Id,
                            f.TmdbId,
                            f.MovieTitle,
                            f.PosterPath,
                            f.CreatedAt))
                        .ToListAsync();

                    return Results.Ok(favorites);
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to fetch favorites", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapPost("/", async (Guid userId, AddFavoriteRequest req, ApplicationDbContext db) =>
            {
                try
                {
                    var userExists = await db.Users.AnyAsync(u => u.Id == userId);
                    if (!userExists) return Results.NotFound(new { message = "User not found" });

                    var alreadyFavorited = await db.UserFavoriteMovies
                        .AnyAsync(f => f.UserId == userId && f.TmdbId == req.TmdbId);
                    if (alreadyFavorited)
                        return Results.Conflict(new { message = "Movie already in favorites" });

                    var favorite = new UserFavoriteMovie
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        TmdbId = req.TmdbId,
                        MovieTitle = req.MovieTitle?.Trim() ?? string.Empty,
                        PosterPath = req.PosterPath?.Trim() ?? string.Empty,
                        CreatedAt = DateTime.UtcNow
                    };

                    db.UserFavoriteMovies.Add(favorite);
                    await db.SaveChangesAsync();

                    return Results.Created(
                        $"/api/users/{userId}/favorites",
                        new FavoriteMovieResponse(favorite.Id, favorite.TmdbId, favorite.MovieTitle, favorite.PosterPath, favorite.CreatedAt));
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to add favorite", detail: ex.Message, statusCode: 500);
                }
            });

            group.MapDelete("/{tmdbId:int}", async (Guid userId, int tmdbId, ApplicationDbContext db) =>
            {
                try
                {
                    var favorite = await db.UserFavoriteMovies
                        .FirstOrDefaultAsync(f => f.UserId == userId && f.TmdbId == tmdbId);

                    if (favorite == null) return Results.NotFound(new { message = "Favorite not found" });

                    db.UserFavoriteMovies.Remove(favorite);
                    await db.SaveChangesAsync();

                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    return Results.Problem(title: "Failed to remove favorite", detail: ex.Message, statusCode: 500);
                }
            });
        }
    }
}