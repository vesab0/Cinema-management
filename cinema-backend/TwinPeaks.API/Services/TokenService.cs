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
        private readonly string _secret;
        private readonly byte[] _signingKeyBytes;
        private readonly int _expiryMinutes;
        private readonly int _refreshDays;

        public TokenService(IConfiguration config)
        {
            _secret = config["Jwt:Key"] ?? "please_change_this_development_secret";
            _signingKeyBytes = BuildSigningKey(_secret);
            _expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 15;
            _refreshDays = int.TryParse(config["Jwt:RefreshDays"], out var d) ? d : 7;
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
            foreach (var role in user.Roles ?? Enumerable.Empty<string>())
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            var token = new JwtSecurityToken(
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
            var rt = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                Created = DateTime.UtcNow,
                Expires = DateTime.UtcNow.AddDays(_refreshDays)
            };
            return rt;
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(_signingKeyBytes),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                }, out var validatedToken);

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
            if (raw.Length >= 32)
            {
                return raw;
            }

            return SHA256.HashData(raw);
        }
    }
}
