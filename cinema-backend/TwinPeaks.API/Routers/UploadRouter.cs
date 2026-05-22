using TwinPeaks.API.Services;

namespace TwinPeaks.API.Routers
{
    public static class UploadRouter
    {
        public static void MapUploadRoutes(this WebApplication app)
        {
            app.MapPost("/api/uploads/image", async (IFormFile file, IS3Service s3, string? type) =>
            {
                if (file == null || file.Length == 0)
                    return Results.BadRequest(new { message = "Image file is required" });

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
                if (!allowed.Contains(ext))
                    return Results.BadRequest(new { message = "Unsupported image type" });

                var folder = type == "avatar" ? "profile-pictures" : "posters";
                var key = $"{folder}/{Guid.NewGuid():N}{ext}";

                await using var stream = file.OpenReadStream();
                var url = await s3.UploadAsync(stream, key, file.ContentType);

                return Results.Ok(new UploadImageResponse(url));
            })
            .DisableAntiforgery()
            .RequireAuthorization("StaffOrAdmin");
        }
    }
}
