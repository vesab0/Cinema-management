using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TwinPeaks.API.Data;

namespace TwinPeaks.API.Routers
{
    public static class LookupRouter
    {
        public static void MapLookupRoutes(this WebApplication app)
        {
            static void MapGenreEndpoints(RouteGroupBuilder genres)
            {
                genres.MapGet("/", (ApplicationDbContext db) =>
                {
                    var data = db.Genres
                        .OrderBy(g => g.Name)
                        .Select(g => new GenreOptionResponse(g.Id, g.Name))
                        .ToList();

                    return Results.Ok(data);
                });

                genres.MapPost("/", (CreateGenreRequest req, ApplicationDbContext db) =>
                {
                    var name = req.Name?.Trim();
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        return Results.BadRequest(new { message = "Genre name is required" });
                    }

                    var existing = db.Genres.FirstOrDefault(g => g.Name.ToLower() == name.ToLower());
                    if (existing != null)
                    {
                        return Results.Ok(new GenreOptionResponse(existing.Id, existing.Name));
                    }

                    var genre = new Genre { Id = Guid.NewGuid(), Name = name };
                    db.Genres.Add(genre);
                    db.SaveChanges();
                    return Results.Created($"/api/genres/{genre.Id}", new GenreOptionResponse(genre.Id, genre.Name));
                });
            }

            static void MapCastEndpoints(RouteGroupBuilder cast)
            {
                cast.MapGet("/", (ApplicationDbContext db) =>
                {
                    var data = db.CastMembers
                        .OrderBy(c => c.FullName)
                        .Select(c => new CastMemberOptionResponse(c.Id, c.FullName))
                        .ToList();

                    return Results.Ok(data);
                });

                cast.MapPost("/", (CreateCastMemberRequest req, ApplicationDbContext db) =>
                {
                    var fullName = req.FullName?.Trim();
                    if (string.IsNullOrWhiteSpace(fullName))
                    {
                        return Results.BadRequest(new { message = "Cast member full name is required" });
                    }

                    var existing = db.CastMembers.FirstOrDefault(c => c.FullName.ToLower() == fullName.ToLower());
                    if (existing != null)
                    {
                        return Results.Ok(new CastMemberOptionResponse(existing.Id, existing.FullName));
                    }

                    var castMember = new CastMember { Id = Guid.NewGuid(), FullName = fullName };
                    db.CastMembers.Add(castMember);
                    db.SaveChanges();
                    return Results.Created($"/api/cast-members/{castMember.Id}", new CastMemberOptionResponse(castMember.Id, castMember.FullName));
                });
            }

            MapGenreEndpoints(app.MapGroup("/api/genres"));
            MapGenreEndpoints(app.MapGroup("/genres"));

            MapCastEndpoints(app.MapGroup("/api/cast-members"));
            MapCastEndpoints(app.MapGroup("/cast-members"));
        }
    }
}
