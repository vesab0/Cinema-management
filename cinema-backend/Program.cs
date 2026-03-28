using Microsoft.EntityFrameworkCore;
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

var app = builder.Build();

app.UseCors(FrontendCorsPolicy);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Map auth routes
app.MapAuthRoutes();
app.MapUserRoutes();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Run();
