using Amazon.S3;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using TwinPeaks.API.Routers;
using TwinPeaks.API.Services;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(
        theme: AnsiConsoleTheme.Code,
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}",
        applyThemeToRedirectedOutput: true)
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(opts =>
{
    opts.Limits.MaxRequestBodySize = 10_485_760; // 10 MB
});

builder.Host.UseSerilog((ctx, services, config) => config
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .WriteTo.Console(
        theme: AnsiConsoleTheme.Code,
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}",
        applyThemeToRedirectedOutput: true));

const string FrontendCorsPolicy = "FrontendCors";

builder.Services.AddOpenApi();
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// CORS — env-configurable; set Cors__AllowedOrigins in env for staging/prod
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5173")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// JWT signing key — same derivation logic as TokenService
var jwtKey = builder.Configuration["Jwt:Key"] ?? "please_change_this_development_secret";
var jwtKeyRaw = Encoding.UTF8.GetBytes(jwtKey);
var jwtKeyBytes = jwtKeyRaw.Length >= 32 ? jwtKeyRaw : SHA256.HashData(jwtKeyRaw);
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "marquee";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "marquee";

// Authentication: JWT Bearer (primary) + Cookie (refresh tokens only)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    })
    .AddCookie("RefreshTokenCookie", options =>
    {
        options.Cookie.Name = "refresh_token";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
    });

// Role-based authorization policies
builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
    opts.AddPolicy("StaffOrAdmin", p => p.RequireRole("admin", "staff"));
});

// Rate limiting — fixed window on auth endpoints (brute-force protection)
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("auth-limit", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 10;
        o.QueueLimit = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Health checks
builder.Services.AddHealthChecks();

// Response compression (Brotli preferred, GZip fallback)
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"];
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' is missing. Set ConnectionStrings__DefaultConnection in environment.");
}

builder.Services.AddDbContext<TwinPeaks.API.Data.ApplicationDbContext>(options =>
{
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
});

var stripeSecretKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe:SecretKey is not configured.");
Stripe.StripeConfiguration.ApiKey = stripeSecretKey;

// Filebase (S3-compatible)
builder.Services.AddSingleton<IAmazonS3>(_ =>
{
    var accessKey = builder.Configuration["Filebase:AccessKeyId"]
        ?? throw new InvalidOperationException("Filebase:AccessKeyId is not configured.");
    var secretKey = builder.Configuration["Filebase:SecretAccessKey"]
        ?? throw new InvalidOperationException("Filebase:SecretAccessKey is not configured.");

    var config = new AmazonS3Config
    {
        ServiceURL = "https://s3.filebase.io",
        AuthenticationRegion = "us-east-1",
    };
    return new AmazonS3Client(accessKey, secretKey, config);
});
builder.Services.AddScoped<IS3Service, S3Service>();

builder.Services.AddSingleton<TwinPeaks.API.Services.TokenService>();
builder.Services.AddScoped<TwinPeaks.API.Services.AuthService>();
builder.Services.AddScoped<TwinPeaks.API.Services.UsersService>();
builder.Services.AddScoped<TwinPeaks.API.Services.MovieService>();
builder.Services.AddScoped<TwinPeaks.API.Services.RoomService>();
builder.Services.AddScoped<TwinPeaks.API.Services.ScheduleService>();
builder.Services.AddScoped<TwinPeaks.API.Services.TicketService>();
builder.Services.AddScoped<TwinPeaks.API.Services.StripeService>();
builder.Services.AddScoped<TwinPeaks.API.Services.UserTicketService>();
builder.Services.AddSingleton<TwinPeaks.API.Services.IEmailService, TwinPeaks.API.Services.SendGridEmailService>();
builder.Services.AddSingleton<TwinPeaks.API.Services.MovieNotificationService>();
builder.Services.AddHttpClient();

// FluentValidation — registers all IValidator<T> in this assembly
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TwinPeaks.API.Data.ApplicationDbContext>();
    var migrated = false;

    for (var attempt = 1; attempt <= 10; attempt++)
    {
        try
        {
            db.Database.Migrate();
            app.Logger.LogInformation("Database migrations applied successfully.");
            migrated = true;
            break;
        }
        catch (Exception ex)
        {
            if (attempt == 10)
            {
                app.Logger.LogError(ex, "Failed to apply database migrations after {Attempts} attempts.", attempt);
                throw;
            }

            app.Logger.LogWarning(ex, "Database migration attempt {Attempt} failed. Retrying in 3 seconds...", attempt);
            Thread.Sleep(TimeSpan.FromSeconds(3));
        }
    }

    if (!migrated)
    {
        throw new InvalidOperationException("Database migration did not complete successfully.");
    }
}

app.UseResponseCompression();
app.UseCors(FrontendCorsPolicy);
app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseSerilogRequestLogging(opts =>
{
    opts.GetLevel = (ctx, _, ex) =>
        ex is not null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error :
        ctx.Response.StatusCode >= 400 ? LogEventLevel.Warning :
        LogEventLevel.Information;
});


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/healthz");

app.MapAuthRoutes();
app.MapUserRoutes();
app.MapMovieRoutes();
app.MapFavoritesRoutes();
app.MapLookupRoutes();
app.MapUploadRoutes();
app.MapImageRoutes();
app.MapRoomRoutes();
app.MapScheduleRoutes();
app.MapTicketRoutes();
app.MapUserTicketRoutes();
app.MapStripeRoutes();

app.Run();
