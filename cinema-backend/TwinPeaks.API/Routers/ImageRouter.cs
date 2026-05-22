using TwinPeaks.API.Services;

namespace TwinPeaks.API.Routers
{
    public static class ImageRouter
    {
        public static void MapImageRoutes(this WebApplication app)
        {
            app.MapGet("/api/images/{**key}", async (string key, IS3Service s3) =>
            {
                try
                {
                    var (stream, contentType) = await s3.GetObjectStreamAsync(key);
                    return Results.Stream(stream, contentType);
                }
                catch (Amazon.S3.AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return Results.NotFound();
                }
            });
        }
    }
}
