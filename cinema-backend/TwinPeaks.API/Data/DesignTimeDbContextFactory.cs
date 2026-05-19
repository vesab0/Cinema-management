using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

namespace TwinPeaks.API.Data
{
    // Ensures dotnet-ef can create the DbContext at design time for migrations.
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true)
                .AddEnvironmentVariables();

            var config = builder.Build();
            var connectionString = config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = config["ConnectionStrings:DefaultConnection"];
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = "Server=mysql;Database=marquee;User=root;Password=root1234;";
            }

            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)));
            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}
