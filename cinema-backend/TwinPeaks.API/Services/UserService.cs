using TwinPeaks.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TwinPeaks.API.Services
{
    public class UsersService
    {
        private static readonly string[] AllowedRoles = ["user", "admin", "staff"];
        private readonly ApplicationDbContext _db;

        public UsersService(ApplicationDbContext db)
        {
            _db = db;
        }

        public List<UserResponse> GetAll()
        {
            return _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .Select(u => ToResponse(u))
                .ToList();
        }

        public UserResponse? GetById(Guid id)
        {
            var user = _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefault(u => u.Id == id);
            return user == null ? null : ToResponse(user);
        }

        public (UserResponse? user, string? error) Update(Guid id, UpdateUserRequest req)
        {
            var user = _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefault(u => u.Id == id);
            if (user == null) return (null, "User not found");

            if (!string.IsNullOrWhiteSpace(req.FirstName)) user.FirstName = req.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(req.LastName))  user.LastName  = req.LastName.Trim();
            if (!string.IsNullOrWhiteSpace(req.Phone))     user.PhoneNumber = req.Phone.Trim();

            if (!string.IsNullOrWhiteSpace(req.Role))
            {
                var roleName = req.Role.Trim().ToLowerInvariant();
                if (!AllowedRoles.Contains(roleName))
                {
                    return (null, "Invalid role");
                }

                var role = _db.Roles.FirstOrDefault(r => r.Name == roleName);
                if (role == null)
                {
                    role = new Role { Id = Guid.NewGuid(), Name = roleName };
                    _db.Roles.Add(role);
                    _db.SaveChanges();
                }

                _db.UserRoles.RemoveRange(user.UserRoles);
                _db.UserRoles.Add(new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow
                });
            }

            _db.SaveChanges();
            return (ToResponse(user), null);
        }

        public (bool ok, string? error) Delete(Guid id)
        {
            var user = _db.Users.FirstOrDefault(u => u.Id == id);
            if (user == null) return (false, "User not found");

            _db.Users.Remove(user);
            _db.SaveChanges();
            return (true, null);
        }

        private static UserResponse ToResponse(User u) => new(
            u.Id,
            u.FirstName,
            u.LastName,
            u.Email,
            u.PhoneNumber ?? "",
            u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault() ?? "user",
            u.CreatedAt.ToString("yyyy-MM-dd"),
            u.IsActive
        );
    }
}