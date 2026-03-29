using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using TwinPeaks.API.Routers;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
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

// Database and auth services
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]; // fallback to env style
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' is missing. Set ConnectionStrings__DefaultConnection in environment.");
}

builder.Services.AddDbContext<TwinPeaks.API.Data.ApplicationDbContext>(options =>
{
    // Requires Pomelo.EntityFrameworkCore.MySql package
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
});

builder.Services.AddSingleton<TwinPeaks.API.Services.TokenService>();
builder.Services.AddScoped<TwinPeaks.API.Services.AuthService>();
builder.Services.AddScoped<TwinPeaks.API.Services.UsersService>();
builder.Services.AddScoped<TwinPeaks.API.Services.MovieService>();

var app = builder.Build();

app.UseCors(FrontendCorsPolicy);

app.Use(async (context, next) =>
{
    await next();

    if (context.Request.Path.StartsWithSegments("/api"))
    {
        Console.WriteLine($"[API] {context.Request.Method} {context.Request.Path} -> {context.Response.StatusCode}");
    }
});

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "public", "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Map auth routes
app.MapAuthRoutes();
app.MapUserRoutes();
app.MapMovieRoutes();
app.MapLookupRoutes();
app.MapUploadRoutes();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Run();
