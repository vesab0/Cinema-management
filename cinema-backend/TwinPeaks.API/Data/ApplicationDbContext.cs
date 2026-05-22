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
        public DbSet<Movie> Movies { get; set; } = null!;
        public DbSet<Genre> Genres { get; set; } = null!;
        public DbSet<CastMember> CastMembers { get; set; } = null!;
        public DbSet<MovieGenre> MovieGenres { get; set; } = null!;
        public DbSet<MovieCast> MovieCasts { get; set; } = null!;
        public DbSet<Room> Rooms { get; set; } = null!;
        public DbSet<Seat> Seats { get; set; } = null!;
        public DbSet<MovieSchedule> MovieSchedules { get; set; } = null!;
        public DbSet<UserFavoriteMovie> UserFavoriteMovies { get; set; } = null!;
        public DbSet<Ticket> Tickets { get; set; } = null!;
        public DbSet<UserTicket> UserTickets { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(b =>
            {
                b.HasKey(u => u.Id);
                b.HasMany(u => u.RefreshTokens)
                    .WithOne(r => r.User)
                    .HasForeignKey(r => r.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.Property(u => u.Email).IsRequired().HasMaxLength(256);
                b.Property(u => u.PasswordHash).IsRequired();
                b.Property(u => u.AvatarPath).HasMaxLength(512);
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

            modelBuilder.Entity<MovieGenre>(b =>
            {
                b.HasKey(mg => new { mg.MovieId, mg.GenreId });
                b.HasOne(mg => mg.Movie)
                    .WithMany(m => m.MovieGenres)
                    .HasForeignKey(mg => mg.MovieId);
                b.HasOne(mg => mg.Genre)
                    .WithMany(g => g.MovieGenres)
                    .HasForeignKey(mg => mg.GenreId);
            });

            modelBuilder.Entity<MovieCast>(b =>
            {
                b.HasKey(mc => new { mc.MovieId, mc.CastMemberId });
                b.HasOne(mc => mc.Movie)
                    .WithMany(m => m.MovieCasts)
                    .HasForeignKey(mc => mc.MovieId);
                b.HasOne(mc => mc.CastMember)
                    .WithMany(c => c.MovieCasts)
                    .HasForeignKey(mc => mc.CastMemberId);
            });

            modelBuilder.Entity<Room>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.Name).IsRequired().HasMaxLength(128);
                b.HasMany(r => r.Seats)
                    .WithOne(s => s.Room)
                    .HasForeignKey(s => s.RoomId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Seat>(b =>
            {
                b.HasKey(s => s.Id);
                b.Property(s => s.RowLabel).IsRequired().HasMaxLength(8);
                b.HasIndex(s => new { s.RoomId, s.RowLabel, s.ColNumber }).IsUnique();
            });

            modelBuilder.Entity<MovieSchedule>(b =>
            {
                b.HasKey(ms => ms.Id);
                b.HasOne(ms => ms.Movie)
                    .WithMany()
                    .HasForeignKey(ms => ms.MovieId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.HasOne(ms => ms.Room)
                    .WithMany()
                    .HasForeignKey(ms => ms.RoomId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.HasIndex(ms => new { ms.MovieId, ms.RoomId, ms.ScheduleDay, ms.StartTime }).IsUnique();
            });

            modelBuilder.Entity<UserFavoriteMovie>(b =>
            {
                b.HasKey(uf => uf.Id);
                b.HasIndex(uf => new { uf.UserId, uf.TmdbId }).IsUnique();
                b.HasOne(uf => uf.User)
                    .WithMany(u => u.FavoriteMovies)
                    .HasForeignKey(uf => uf.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.Property(uf => uf.MovieTitle).IsRequired().HasMaxLength(512);
                b.Property(uf => uf.PosterPath).HasMaxLength(512);
            });

            modelBuilder.Entity<Ticket>(b =>
            {
                b.HasKey(t => t.Id);
                b.HasOne(t => t.Schedule)
                    .WithMany()
                    .HasForeignKey(t => t.ScheduleId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(t => t.Seat)
                    .WithMany()
                    .HasForeignKey(t => t.SeatId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasIndex(t => new { t.ScheduleId, t.SeatId }).IsUnique();
                b.Property(t => t.Price).HasPrecision(10, 2);
                b.Property(t => t.Status).HasConversion<string>().HasMaxLength(32);
            });

            modelBuilder.Entity<UserTicket>(b =>
            {
                b.HasKey(ut => ut.Id);
                b.HasOne(ut => ut.Ticket)
                    .WithOne(t => t.UserTicket)
                    .HasForeignKey<UserTicket>(ut => ut.TicketId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasOne(ut => ut.User)
                    .WithMany()
                    .HasForeignKey(ut => ut.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                b.HasIndex(ut => ut.TicketId).IsUnique();
                b.HasIndex(ut => ut.ConfirmationCode).IsUnique();
                b.Property(ut => ut.ConfirmationCode).IsRequired().HasMaxLength(64);
            });
        }
    }
}