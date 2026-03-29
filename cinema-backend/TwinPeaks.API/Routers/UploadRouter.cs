using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace TwinPeaks.API.Routers
{
    public static class UploadRouter
    {
        public static void MapUploadRoutes(this WebApplication app)
        {
            app.MapPost("/api/uploads/image", async (IFormFile file, IWebHostEnvironment env) =>
            {
                if (file == null || file.Length == 0)
                {
                    return Results.BadRequest(new { message = "Image file is required" });
                }

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
                if (!allowed.Contains(ext))
                {
                    return Results.BadRequest(new { message = "Unsupported image type" });
                }

                var uploadsDir = Path.Combine(env.ContentRootPath, "public", "uploads");
                Directory.CreateDirectory(uploadsDir);

                var fileName = $"{Guid.NewGuid():N}{ext}";
                var fullPath = Path.Combine(uploadsDir, fileName);

                await using (var stream = File.Create(fullPath))
                {
                    await file.CopyToAsync(stream);
                }

                return Results.Ok(new UploadImageResponse($"/uploads/{fileName}"));
            })
            .DisableAntiforgery();
        }
    }
}
