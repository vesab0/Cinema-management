using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace TwinPeaks.API.Services
{
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

    record PredictorResult(
        [property: JsonPropertyName("movie_id")]  int MovieId,
        [property: JsonPropertyName("title")]     string Title,
        [property: JsonPropertyName("final_score")] double FinalScore,
        [property: JsonPropertyName("tmdb_id")]   int? TmdbId
    );

    public class MovieNotificationService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<MovieNotificationService> _logger;
        private readonly string _predictorUrl;

        public MovieNotificationService(
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpFactory,
            ILogger<MovieNotificationService> logger,
            IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _httpFactory = httpFactory;
            _logger = logger;
            _predictorUrl = config["PredictorUrl"] ?? "http://localhost:8000";
        }

        public void NotifyOnNewMovie(MovieResponse movie)
        {
            _ = NotifyUsersAsync(movie);
        }

        private async Task NotifyUsersAsync(MovieResponse movie)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var emailSvc = scope.ServiceProvider.GetRequiredService<IEmailService>();

                var mlId = await InjectMovieAsync(movie);
                var similarTmdbIds = await GetSimilarTmdbIdsAsync(movie, mlId);

                if (similarTmdbIds.Count == 0)
                {
                    _logger.LogInformation("No similar movies found for '{Name}', skipping notifications", movie.Name);
                    return;
                }

                await SendNotificationsAsync(db, emailSvc, movie, similarTmdbIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in movie notification background task");
            }
        }

        private async Task<int?> InjectMovieAsync(MovieResponse movie)
        {
            try
            {
                var http = _httpFactory.CreateClient();
                http.Timeout = TimeSpan.FromSeconds(30);

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

                var resp = await http.PostAsJsonAsync($"{_predictorUrl}/inject-movie", payload);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("ML inject returned {Status} for '{Name}'", (int)resp.StatusCode, movie.Name);
                    return null;
                }

                var injected = await resp.Content.ReadFromJsonAsync<InjectMovieResponse>();
                _logger.LogInformation("Injected '{Name}' into ML model as ml_id={MlId}", movie.Name, injected?.MlId);
                return injected?.MlId;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("ML inject unavailable for '{Name}': {Message}", movie.Name, ex.Message);
                return null;
            }
        }

        private async Task<List<int>> GetSimilarTmdbIdsAsync(MovieResponse movie, int? mlId)
        {
            try
            {
                var http = _httpFactory.CreateClient();
                http.Timeout = TimeSpan.FromSeconds(10);

                string endpoint;
                object requestBody;

                if (movie.TmdbId.HasValue)
                {
                    endpoint = "similar/by-tmdb";
                    requestBody = new { tmdb_id = movie.TmdbId.Value, top_k = 20 };
                }
                else if (mlId.HasValue)
                {
                    endpoint = "similar/by-ml-id";
                    requestBody = new { ml_id = mlId.Value, top_k = 20 };
                }
                else
                {
                    return new();
                }

                var resp = await http.PostAsJsonAsync($"{_predictorUrl}/{endpoint}", requestBody);
                if (!resp.IsSuccessStatusCode) return new();

                var recs = await resp.Content.ReadFromJsonAsync<List<PredictorResult>>();
                var ids = recs?.Where(r => r.TmdbId.HasValue).Select(r => r.TmdbId!.Value).ToList() ?? new();
                _logger.LogInformation("Predictor returned {Count} similar movies for '{Name}'", ids.Count, movie.Name);
                return ids;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Predictor similar-movies call failed for '{Name}': {Message}", movie.Name, ex.Message);
                return new();
            }
        }

        private async Task SendNotificationsAsync(
            ApplicationDbContext db,
            IEmailService emailSvc,
            MovieResponse movie,
            List<int> similarTmdbIds)
        {
            var usersToNotify = await db.UserFavoriteMovies
                .Where(f => similarTmdbIds.Contains(f.TmdbId))
                .Include(f => f.User)
                .Select(f => f.User)
                .Distinct()
                .ToListAsync();

            _logger.LogInformation("Notifying {Count} users about new movie '{Name}'",
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
    }
}
