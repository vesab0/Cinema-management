using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TwinPeaks.API;

namespace TwinPeaks.API.Services
{
    public class TokenService
    {
        private readonly byte[] _signingKeyBytes;
        private readonly int _expiryMinutes;
        private readonly int _refreshDays;
        private readonly string _issuer;
        private readonly string _audience;

        public TokenService(IConfiguration config)
        {
            var secret = config["Jwt:Key"] ?? "please_change_this_development_secret";
            _signingKeyBytes = BuildSigningKey(secret);
            _expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 15;
            _refreshDays = int.TryParse(config["Jwt:RefreshDays"], out var d) ? d : 7;
            _issuer = config["Jwt:Issuer"] ?? "marquee";
            _audience = config["Jwt:Audience"] ?? "marquee";
        }

        public (string token, DateTime expires) CreateAccessToken(User user)
        {
            var key = new SymmetricSecurityKey(_signingKeyBytes);
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var now = DateTime.UtcNow;
            var expires = now.AddMinutes(_expiryMinutes);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("given_name", user.FirstName ?? string.Empty),
                new Claim("family_name", user.LastName ?? string.Empty)
            };

            var identity = new ClaimsIdentity(claims);
            foreach (var role in user.UserRoles
                .Select(ur => ur.Role?.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name!)
                .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: identity.Claims,
                notBefore: now,
                expires: expires,
                signingCredentials: creds
            );

            var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);
            return (tokenStr, expires);
        }

        public RefreshToken CreateRefreshToken(Guid userId)
        {
            return new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                Created = DateTime.UtcNow,
                Expires = DateTime.UtcNow.AddDays(_refreshDays)
            };
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(_signingKeyBytes),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                }, out _);

                return principal;
            }
            catch
            {
                return null;
            }
        }

        private static byte[] BuildSigningKey(string secret)
        {
            var raw = Encoding.UTF8.GetBytes(secret);
            return raw.Length >= 32 ? raw : SHA256.HashData(raw);
        }
    }
}
