using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TwinPeaks.API;

namespace TwinPeaks.API.Services
{
    public class AuthService
    {
        private static readonly string[] DefaultRoles = ["user", "admin", "staff"];
        private readonly TwinPeaks.API.Data.ApplicationDbContext _db;
        private readonly TokenService _tokenService;

        public AuthService(TwinPeaks.API.Data.ApplicationDbContext db, TokenService tokenService)
        {
            _db = db;
            _tokenService = tokenService;
            const string bootstrapAdminEmail = "admin@local";

            EnsureDefaultRoles();

            if (!_db.Users.Any())
            {
                var admin = new User
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Admin",
                    LastName = "User",
                    Email = bootstrapAdminEmail,
                    PasswordHash = HashPassword("admin"),
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _db.Users.Add(admin);
                _db.SaveChanges();
            }

            var bootstrapAdmin = _db.Users.FirstOrDefault(u => u.Email == bootstrapAdminEmail);
            if (bootstrapAdmin != null)
            {
                // Keep bootstrap account elevated even if old data assigned another role.
                AssignRole(bootstrapAdmin.Id, "admin");
            }

            var usersWithoutRole = _db.Users
                .Where(u => !_db.UserRoles.Any(ur => ur.UserId == u.Id))
                .Select(u => u.Id)
                .ToList();

            foreach (var userId in usersWithoutRole)
            {
                AssignRole(userId, "user");
            }
        }

        public (User? user, string? error) Register(RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
            {
                return (null, "First name and last name are required");
            }

            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return (null, "Email and password are required");
            }

            var email = req.Email.Trim().ToLowerInvariant();
            if (_db.Users.Any(u => u.Email == email)) return (null, "Email already in use");

            var user = new User
            {
                Id = Guid.NewGuid(),
                FirstName = req.FirstName,
                LastName = req.LastName,
                Email = email,
                PasswordHash = HashPassword(req.Password),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.Users.Add(user);
            _db.SaveChanges();
            AssignRole(user.Id, "user");
            return (user, null);
        }

        public (AuthResponse? response, string? error) Login(LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return (null, "Email and password are required");
            }

            var email = req.Email.Trim().ToLowerInvariant();
            var user = _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefault(u => u.Email == email);
            if (user == null) return (null, "Invalid credentials");
            if (!user.IsActive) return (null, "Account is inactive");

            if (!VerifyPassword(req.Password, user.PasswordHash)) return (null, "Invalid credentials");

            var (token, expires) = _tokenService.CreateAccessToken(user);
            var refresh = _tokenService.CreateRefreshToken(user.Id);
            _db.RefreshTokens.Add(refresh);
            _db.SaveChanges();

            var auth = new AuthResponse(token, refresh.Token, (int)(expires - DateTime.UtcNow).TotalSeconds);
            return (auth, null);
        }

        public (AuthResponse? response, string? error) Refresh(string refreshToken)
        {
            var existing = _db.RefreshTokens.FirstOrDefault(rt => rt.Token == refreshToken);
            if (existing == null) return (null, "Invalid refresh token");
            if (existing.Revoked != null || existing.Expires < DateTime.UtcNow) return (null, "Refresh token expired");

            //rotacioni tokenit
            existing.Revoked = DateTime.UtcNow;
            var user = _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefault(u => u.Id == existing.UserId);
            if (user == null) return (null, "User not found");

            var newRt = _tokenService.CreateRefreshToken(user.Id);
            _db.RefreshTokens.Add(newRt);
            _db.SaveChanges();

            var (token, expires) = _tokenService.CreateAccessToken(user);
            var auth = new AuthResponse(token, newRt.Token, (int)(expires - DateTime.UtcNow).TotalSeconds);
            return (auth, null);
        }

        public User? GetByEmail(string email) => _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefault(u => u.Email == email.Trim().ToLowerInvariant());

        private void EnsureDefaultRoles()
        {
            var existing = _db.Roles.Select(r => r.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var toCreate = DefaultRoles
                .Where(name => !existing.Contains(name))
                .Select(name => new Role { Id = Guid.NewGuid(), Name = name })
                .ToList();

            if (toCreate.Count == 0) return;

            _db.Roles.AddRange(toCreate);
            _db.SaveChanges();
        }

        private void AssignRole(Guid userId, string roleName)
        {
            var normalizedRole = roleName.Trim().ToLowerInvariant();
            if (!DefaultRoles.Contains(normalizedRole))
            {
                normalizedRole = "user";
            }

            var role = _db.Roles.FirstOrDefault(r => r.Name == normalizedRole);
            if (role == null)
            {
                role = new Role { Id = Guid.NewGuid(), Name = normalizedRole };
                _db.Roles.Add(role);
                _db.SaveChanges();
            }

            var existing = _db.UserRoles.FirstOrDefault(ur => ur.UserId == userId);
            if (existing != null)
            {
                existing.RoleId = role.Id;
                _db.SaveChanges();
                return;
            }

            _db.UserRoles.Add(new UserRole
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            });
            _db.SaveChanges();
        }

        private static string HashPassword(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(16);
            var derived = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);
            return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(derived);
        }

        private static bool VerifyPassword(string password, string hash)
        {
            try
            {
                var parts = hash.Split('.', 2);
                if (parts.Length != 2) return false;
                var salt = Convert.FromBase64String(parts[0]);
                var expected = Convert.FromBase64String(parts[1]);
                var derived = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, expected.Length);
                return CryptographicOperations.FixedTimeEquals(derived, expected);
            }
            catch
            {
                return false;
            }
        }
    }
}
