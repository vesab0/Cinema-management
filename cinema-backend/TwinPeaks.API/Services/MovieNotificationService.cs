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
        private readonly string _frontendUrl;

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
            _frontendUrl = (config["FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
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
                http.Timeout = TimeSpan.FromSeconds(120);

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

                // The movie's own anchor TMDB ID is an explicit similarity claim:
                // "this film is like <tmdbId>". Include it so fans of that film are notified.
                if (movie.TmdbId.HasValue && !ids.Contains(movie.TmdbId.Value))
                    ids.Add(movie.TmdbId.Value);

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
                var genreList = movie.Genres.Count > 0
                    ? string.Join(" &nbsp;·&nbsp; ", movie.Genres)
                    : string.Empty;

                var html = $"""
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                      <title>New movie you might love</title>
                    </head>
                    <body style="margin:0;padding:0;background-color:#0a0806;font-family:'Inter',Arial,sans-serif;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0806;padding:40px 16px;">
                        <tr>
                          <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                              <!-- Header -->
                              <tr>
                                <td align="center" style="padding-bottom:32px;">
                                  <p style="margin:0;font-size:13px;letter-spacing:0.25em;text-transform:uppercase;color:#E7C050;font-weight:600;">Twin Peaks Cinema</p>
                                  <div style="width:48px;height:2px;background-color:#410101;margin:10px auto 0;"></div>
                                </td>
                              </tr>

                              <!-- Card -->
                              <tr>
                                <td style="background-color:#141210;border-radius:12px;overflow:hidden;border:1px solid #2e2116;">

                                  <!-- Gold top bar -->
                                  <div style="height:4px;background:linear-gradient(90deg,#410101,#E7C050,#410101);"></div>

                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="padding:40px 40px 32px;">

                                        <!-- Eyebrow -->
                                        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#E7C050;font-weight:700;">Picked for you</p>

                                        <!-- Headline -->
                                        <h1 style="margin:0 0 24px;font-size:30px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">{movie.Name}</h1>

                                        <!-- Divider -->
                                        <div style="height:1px;background-color:#2e2116;margin-bottom:24px;"></div>

                                        <!-- Greeting -->
                                        <p style="margin:0 0 16px;font-size:16px;color:#c9c0b8;line-height:1.6;">Hi <strong style="color:#ffffff;">{user.FirstName}</strong>,</p>

                                        <p style="margin:0 0 24px;font-size:15px;color:#c9c0b8;line-height:1.7;">
                                          Based on the movies you love, we think <strong style="color:#ffffff;">{movie.Name}</strong> is right up your alley.
                                          We just added it to our lineup, grab your seat before it fills up.
                                        </p>

                                        <!-- Meta row -->
                                        {(genreList.Length > 0 ? $"""
                                        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                          <tr>
                                            <td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#E7C050;padding-right:12px;white-space:nowrap;">Genre</td>
                                            <td style="font-size:13px;color:#c9c0b8;">{genreList}</td>
                                          </tr>
                                          {(movie.DurationMinutes > 0 ? $"""
                                          <tr>
                                            <td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#E7C050;padding-right:12px;padding-top:8px;white-space:nowrap;">Runtime</td>
                                            <td style="font-size:13px;color:#c9c0b8;padding-top:8px;">{movie.DurationMinutes} min</td>
                                          </tr>
                                          """ : "")}
                                        </table>
                                        """ : "")}

                                        <!-- CTA -->
                                        <table cellpadding="0" cellspacing="0">
                                          <tr>
                                            <td align="center" style="background-color:#410101;border-radius:6px;">
                                              <a href="{_frontendUrl}/movies/{movie.Id}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E7C050;text-decoration:none;">
                                                Book Your Seat
                                              </a>
                                            </td>
                                          </tr>
                                        </table>

                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>

                              <!-- Footer -->
                              <tr>
                                <td align="center" style="padding:28px 0 8px;">
                                  <p style="margin:0 0 6px;font-size:12px;color:#5a4e44;">The Twin Peaks Cinema Team</p>
                                  <p style="margin:0;font-size:11px;color:#3a3028;">You're receiving this because you have favourites saved on your account.</p>
                                </td>
                              </tr>

                            </table>
                          </td>
                        </tr>
                      </table>
                    </body>
                    </html>
                    """;

                await emailSvc.SendAsync(
                    user.Email,
                    $"We think you'll love: {movie.Name}",
                    html
                );
            }
        }
    }
}
