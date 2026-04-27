using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;
using System.Text.Json.Serialization;
using TwinPeaks.API.Routers;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(
        theme: AnsiConsoleTheme.Code,
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}",
        applyThemeToRedirectedOutput: true)
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
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

builder.Services.AddSingleton<TwinPeaks.API.Services.TokenService>();
builder.Services.AddScoped<TwinPeaks.API.Services.AuthService>();
builder.Services.AddScoped<TwinPeaks.API.Services.UsersService>();
builder.Services.AddScoped<TwinPeaks.API.Services.MovieService>();
builder.Services.AddScoped<TwinPeaks.API.Services.RoomService>();

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

app.UseCors(FrontendCorsPolicy);

app.UseSerilogRequestLogging(opts =>
{
    opts.GetLevel = (ctx, _, ex) =>
        ex is not null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error :
        ctx.Response.StatusCode >= 400 ? LogEventLevel.Warning :
        LogEventLevel.Information;
});

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "public", "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapAuthRoutes();
app.MapUserRoutes();
app.MapMovieRoutes();
app.MapLookupRoutes();
app.MapUploadRoutes();
app.MapRoomRoutes();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Run();
