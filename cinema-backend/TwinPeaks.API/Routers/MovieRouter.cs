using TwinPeaks.API.Services;
using TwinPeaks.API.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace TwinPeaks.API.Routers
{
    // Matches the JSON shape returned by the Python predictor API (snake_case → PascalCase)
    record PredictorResult(
        [property: JsonPropertyName("movie_id")]  int MovieId,
        [property: JsonPropertyName("title")]     string Title,
        [property: JsonPropertyName("final_score")] double FinalScore,
        [property: JsonPropertyName("tmdb_id")]   int? TmdbId
    );

    record InjectMoviePayload(
        string Title,
        string? Overview,
        string? Director,
        List<string> Genres,
        List<string> Cast,
        int? Runtime,
        string? ReleaseDate,
        int? TmdbId
    );

    record InjectMovieResponse(
        [property: JsonPropertyName("ml_id")] int MlId,
        [property: JsonPropertyName("cluster_id")] int ClusterId
    );

    public static class MoviesRouter
    {
        public static void MapMovieRoutes(this WebApplication app)
        {
            var group = app.MapGroup("/api/movies");

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

            group.MapPost("/", (CreateMovieRequest req, MovieService movies,
                IServiceScopeFactory scopeFactory, IHttpClientFactory httpFactory,
                ILoggerFactory loggerFactory, IConfiguration config) =>
            {
                try
                {
                    var movie = movies.Create(req);
                    var logger = loggerFactory.CreateLogger("MovieNotifications");
                    var predictorUrl = config["PredictorUrl"] ?? "http://localhost:8001";

                    // Fire-and-forget: notify users with similar favorites
                    _ = NotifyUsersAsync(movie, scopeFactory, httpFactory, logger, predictorUrl);

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
            });

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
            });

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
            });
        }

        private static async Task NotifyUsersAsync(
            MovieResponse movie,
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpFactory,
            ILogger logger,
            string predictorUrl)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var emailSvc = scope.ServiceProvider.GetRequiredService<IEmailService>();

                // Step 1: inject movie into the ML service so it's part of the live model
                int? mlId = null;
                try
                {
                    var injectHttp = httpFactory.CreateClient();
                    injectHttp.Timeout = TimeSpan.FromSeconds(30); // longer — may trigger model load

                    var payload = new InjectMoviePayload(
                        Title: movie.Name,
                        Overview: movie.Description,
                        Director: movie.Director,
                        Genres: movie.Genres,
                        Cast: movie.Cast.Select(c => c.FullName).ToList(),
                        Runtime: movie.DurationMinutes,
                        ReleaseDate: movie.ReleaseDate.ToString("yyyy-MM-dd"),
                        TmdbId: movie.TmdbId
                    );

                    var injectResp = await injectHttp.PostAsJsonAsync($"{predictorUrl}/inject-movie", payload);
                    if (injectResp.IsSuccessStatusCode)
                    {
                        var injected = await injectResp.Content.ReadFromJsonAsync<InjectMovieResponse>();
                        mlId = injected?.MlId;
                        logger.LogInformation("Injected '{Name}' into ML model as ml_id={MlId}", movie.Name, mlId);
                    }
                    else
                    {
                        logger.LogWarning("ML inject returned {Status} for '{Name}'", (int)injectResp.StatusCode, movie.Name);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning("ML inject unavailable for '{Name}': {Message}", movie.Name, ex.Message);
                }

                // Step 2: get similar movies — prefer TMDB endpoint (richer signal), fall back to ml_id
                List<int> similarTmdbIds = new();
                try
                {
                    var simHttp = httpFactory.CreateClient();
                    simHttp.Timeout = TimeSpan.FromSeconds(10);

                    if (movie.TmdbId.HasValue)
                    {
                        var resp = await simHttp.PostAsJsonAsync(
                            $"{predictorUrl}/similar/by-tmdb",
                            new { tmdb_id = movie.TmdbId.Value, top_k = 20 });
                        if (resp.IsSuccessStatusCode)
                        {
                            var recs = await resp.Content.ReadFromJsonAsync<List<PredictorResult>>();
                            similarTmdbIds = recs?
                                .Where(r => r.TmdbId.HasValue)
                                .Select(r => r.TmdbId!.Value)
                                .ToList() ?? new();
                            logger.LogInformation("Predictor returned {Count} similar movies for TmdbId {TmdbId}",
                                similarTmdbIds.Count, movie.TmdbId.Value);
                        }
                    }
                    else if (mlId.HasValue)
                    {
                        var resp = await simHttp.PostAsJsonAsync(
                            $"{predictorUrl}/similar/by-ml-id",
                            new { ml_id = mlId.Value, top_k = 20 });
                        if (resp.IsSuccessStatusCode)
                        {
                            var recs = await resp.Content.ReadFromJsonAsync<List<PredictorResult>>();
                            similarTmdbIds = recs?
                                .Where(r => r.TmdbId.HasValue)
                                .Select(r => r.TmdbId!.Value)
                                .ToList() ?? new();
                            logger.LogInformation("Predictor returned {Count} similar movies for ml_id={MlId}",
                                similarTmdbIds.Count, mlId.Value);
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning("Predictor similar-movies call failed for '{Name}': {Message}", movie.Name, ex.Message);
                }

                if (similarTmdbIds.Count == 0)
                {
                    logger.LogInformation("No similar movies found for '{Name}', skipping notifications", movie.Name);
                    return;
                }

                // Step 3: find users who favorited any of the similar movies and notify them
                var usersToNotify = await db.UserFavoriteMovies
                    .Where(f => similarTmdbIds.Contains(f.TmdbId))
                    .Include(f => f.User)
                    .Select(f => f.User)
                    .Distinct()
                    .ToListAsync();

                logger.LogInformation("Notifying {Count} users about new movie '{Name}'",
                    usersToNotify.Count, movie.Name);

                foreach (var user in usersToNotify)
                {
                    await emailSvc.SendAsync(
                        user.Email,
                        $"New movie you might love: {movie.Name}",
                        $"<p>Hi {user.FirstName},</p>" +
                        $"<p>We just added <strong>{movie.Name}</strong> — based on your favorites, we think you'll love it!</p>" +
                        $"<p>The Twin Peaks Cinema team</p>"
                    );
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in movie notification background task");
            }
        }
    }
}
