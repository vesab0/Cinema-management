using Microsoft.EntityFrameworkCore;
using TwinPeaks.API;

namespace TwinPeaks.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Role> Roles { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(b =>
            {
                b.HasKey(u => u.Id);
                b.HasMany<RefreshToken>().WithOne().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
                b.Property(u => u.Email).IsRequired().HasMaxLength(256);
                b.Property(u => u.PasswordHash).IsRequired();
            });

            modelBuilder.Entity<Role>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.Name).IsRequired().HasMaxLength(128);
            });

            modelBuilder.Entity<RefreshToken>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.Token).IsRequired();
            });

            modelBuilder.Entity<UserRole>(b =>
            {
                b.HasKey(ur => ur.Id);
                b.HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique();

                b.HasOne(ur => ur.User)
                    .WithMany(u => u.UserRoles)
                    .HasForeignKey(ur => ur.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(ur => ur.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(ur => ur.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
