# Code Explanation Questions

Real code from this project. For each snippet: read it, explain what it does, why it's written that way, and what would break if you removed or changed key parts.

---

## Section 1 — C# Models & Entity Framework

---

### Snippet 1

```csharp
public class Ticket
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public MovieSchedule Schedule { get; set; } = null!;
    public Guid SeatId { get; set; }
    public Seat Seat { get; set; } = null!;
    public decimal Price { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Available;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public UserTicket? UserTicket { get; set; }
}

public enum TicketStatus { Available, Sold }
```

**Questions:**
1. What is `Guid` and why is it used instead of `int` for `Id`?
2. What is the difference between `ScheduleId` (a `Guid`) and `Schedule` (a `MovieSchedule`)? What is each one called?
3. What does `= null!` mean after `Schedule { get; set; }`? What would happen without it?
4. Why is `Price` a `decimal` and not a `double` or `float`?
5. What is an `enum` and what does `TicketStatus.Available` mean as a default value?
6. `UserTicket?` has a `?` — what does that mean and what kind of relationship does it represent?

<details>
<summary>Answers</summary>

1. `Guid` (Globally Unique Identifier) is a 128-bit UUID. Used instead of `int` because it can be generated client-side without a DB round-trip, doesn't expose sequential IDs (security), and is safe in distributed systems.
2. `ScheduleId` is the **foreign key** — the actual value stored in the database column. `Schedule` is the **navigation property** — EF Core uses it to load the related `MovieSchedule` object via a JOIN. They represent the same relationship from two angles.
3. `= null!` is the null-forgiving operator. It tells the compiler "I know this looks null but I guarantee EF Core will populate it before I use it." Without it, you'd get a nullable warning because the property isn't initialized in the constructor.
4. `decimal` has exact decimal representation (no floating-point rounding errors). For money, `0.1 + 0.2 == 0.3` is `true` with `decimal` but `false` with `double`. Always use `decimal` for currency.
5. An `enum` is a named set of integer constants. `TicketStatus.Available` as the default means newly created tickets start as available without explicitly setting the field.
6. `?` makes it nullable — a `Ticket` may or may not have a `UserTicket`. This is a one-to-one optional relationship: a ticket that hasn't been purchased has no `UserTicket`.

</details>

---

### Snippet 2

```csharp
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
```

**Questions:**
1. What type of relationship is being configured here? Give a real-world example from this project.
2. What does `HasKey(mg => new { mg.MovieId, mg.GenreId })` do? What is this called?
3. What does `WithMany(m => m.MovieGenres)` tell EF Core?
4. If you deleted this configuration, what would EF Core do by default?

<details>
<summary>Answers</summary>

1. Many-to-many: a Movie can belong to many Genres, and a Genre can be assigned to many Movies. `MovieGenre` is the junction/join table.
2. It sets a **composite primary key** made of both foreign key columns together. This enforces that the same movie-genre pair can't be inserted twice.
3. It tells EF Core the inverse navigation — "from Movie, I can reach its MovieGenre entries via the `MovieGenres` collection."
4. EF Core would try to infer the relationship but might get it wrong without explicit composite key configuration. Junction tables with no explicit entity often need manual configuration.

</details>

---

### Snippet 3

```csharp
modelBuilder.Entity<Ticket>(b =>
{
    b.HasOne(t => t.Schedule)
        .WithMany()
        .HasForeignKey(t => t.ScheduleId)
        .OnDelete(DeleteBehavior.Restrict);
    b.HasIndex(t => new { t.ScheduleId, t.SeatId }).IsUnique();
    b.Property(t => t.Status).HasConversion<string>().HasMaxLength(32);
});
```

**Questions:**
1. What does `OnDelete(DeleteBehavior.Restrict)` mean? What would happen if you tried to delete a `MovieSchedule` that has tickets?
2. What does `.HasIndex(t => new { t.ScheduleId, t.SeatId }).IsUnique()` enforce? Why is this important for a cinema?
3. What does `HasConversion<string>()` do to the `Status` enum? Why might this be preferred over storing integers?
4. Compare `Restrict` vs `Cascade` — where does this project use each and why?

<details>
<summary>Answers</summary>

1. `Restrict` means the DELETE is blocked if related rows exist. You can't delete a schedule that has tickets — the database will throw an error. You'd have to delete all tickets first.
2. It creates a unique composite index on `(ScheduleId, SeatId)` — meaning one ticket per seat per screening. Without this, you could double-book seat A1 for the same showing.
3. The enum value is stored as a string (`"Available"`, `"Sold"`) instead of an integer (0, 1). More readable in the database and safe if you reorder enum values later.
4. `Cascade`: used for `User → RefreshTokens` and `User → UserRoles` — deleting a user cleans up their tokens and roles automatically. `Restrict`: used for `Ticket → Schedule` — protecting data integrity when tickets exist.

</details>

---

### Snippet 4

```csharp
public int GenerateForSchedule(Guid scheduleId, decimal defaultPrice)
{
    var schedule = _db.MovieSchedules
        .Include(s => s.Room).ThenInclude(r => r.Seats)
        .FirstOrDefault(s => s.Id == scheduleId);

    if (schedule == null) throw new ArgumentException("Schedule not found");

    var existingSeatIds = _db.Tickets
        .Where(t => t.ScheduleId == scheduleId)
        .Select(t => t.SeatId)
        .ToHashSet();

    var newTickets = schedule.Room.Seats
        .Where(s => s.IsActive && !existingSeatIds.Contains(s.Id))
        .Select(s => new Ticket { ... })
        .ToList();

    _db.Tickets.AddRange(newTickets);
    _db.SaveChanges();
    return newTickets.Count;
}
```

**Questions:**
1. What does `.Include(s => s.Room).ThenInclude(r => r.Seats)` do? What SQL does it approximately generate?
2. Why is `ToHashSet()` used for `existingSeatIds` instead of just leaving it as `IQueryable`?
3. What does `AddRange` do and why use it instead of calling `Add` in a loop?
4. What is `SaveChanges()` and what happens if you forget to call it?
5. What is the purpose of `existingSeatIds` — what real-world scenario does it protect against?

<details>
<summary>Answers</summary>

1. Eager loading — it tells EF Core to JOIN the `Room` and then `Seats` in the same query. Without it, accessing `schedule.Room.Seats` would trigger extra lazy-loading queries (N+1 problem).
2. `ToHashSet()` executes the query immediately and puts results in memory as a hash set. `.Contains()` on a hash set is O(1). If it stayed `IQueryable`, each `.Contains()` call inside the LINQ would generate extra SQL queries.
3. `AddRange` stages all new tickets in the change tracker at once. One database round-trip vs N round-trips in a loop. More efficient, especially for large rooms.
4. `SaveChanges()` flushes all staged changes to the database in a single transaction. Without it, nothing is persisted — the `Add`/`AddRange` calls only exist in memory.
5. It prevents creating duplicate tickets if the endpoint is called twice for the same schedule. Only seats that don't already have a ticket get one.

</details>

---

## Section 2 — Authentication & JWT

---

### Snippet 5

```csharp
private static string HashPassword(string password)
{
    var salt = RandomNumberGenerator.GetBytes(16);
    var derived = Rfc2898DeriveBytes.Pbkdf2(
        Encoding.UTF8.GetBytes(password),
        salt,
        100_000,
        HashAlgorithmName.SHA256,
        32);
    return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(derived);
}

private static bool VerifyPassword(string password, string hash)
{
    var parts = hash.Split('.', 2);
    if (parts.Length != 2) return false;
    var salt = Convert.FromBase64String(parts[0]);
    var expected = Convert.FromBase64String(parts[1]);
    var derived = Rfc2898DeriveBytes.Pbkdf2(
        Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, expected.Length);
    return CryptographicOperations.FixedTimeEquals(derived, expected);
}
```

**Questions:**
1. What is a salt and why is it generated with `RandomNumberGenerator` instead of a fixed string?
2. What is PBKDF2 and why is `100_000` iterations used?
3. The hash stored in the database looks like `"base64salt.base64hash"`. Why store both parts?
4. What is `CryptographicOperations.FixedTimeEquals` and what attack does it prevent?
5. Why does `VerifyPassword` not return early when the format is wrong — instead returning `false`?

<details>
<summary>Answers</summary>

1. A salt is a random value mixed into the password before hashing. A unique salt per user means two users with the same password have completely different hashes, defeating rainbow table attacks.
2. PBKDF2 (Password-Based Key Derivation Function 2) is deliberately slow. 100,000 iterations means an attacker trying to brute-force needs to run 100k SHA256 operations per guess, making mass cracking impractical.
3. The salt is needed to reproduce the same hash during verification. Without storing it, you can never verify the password again.
4. `FixedTimeEquals` compares bytes in constant time — it doesn't return early on mismatch. A normal `==` can leak timing information: an attacker measuring response time could detect how many bytes matched, enabling timing attacks to guess hashes byte by byte.
5. Defensive programming — don't give attackers different error paths. A consistent `false` response leaks less information.

</details>

---

### Snippet 6

```csharp
public (string token, DateTime expires) CreateAccessToken(User user)
{
    var key = new SymmetricSecurityKey(_signingKeyBytes);
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var expires = DateTime.UtcNow.AddMinutes(_expiryMinutes);

    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim("given_name", user.FirstName ?? string.Empty),
        new Claim("family_name", user.LastName ?? string.Empty)
    };

    var identity = new ClaimsIdentity(claims);
    foreach (var role in user.UserRoles.Select(ur => ur.Role?.Name).Distinct())
    {
        identity.AddClaim(new Claim(ClaimTypes.Role, role));
    }

    var token = new JwtSecurityToken(
        issuer: _issuer,
        audience: _audience,
        claims: identity.Claims,
        expires: expires,
        signingCredentials: creds
    );

    return (new JwtSecurityTokenHandler().WriteToken(token), expires);
}
```

**Questions:**
1. What is a Claim in a JWT? Give three examples from this code.
2. Why is `HmacSha256` used and what does it mean for who can verify this token?
3. What is the purpose of `issuer` and `audience` in the token?
4. The method returns a tuple `(string token, DateTime expires)`. How would you use this return value?
5. Why are role claims added separately in a loop instead of as part of the initial `claims` array?

<details>
<summary>Answers</summary>

1. A claim is a key-value statement about the user embedded in the token. Examples: `sub` = user's ID, `email` = user's email, `ClaimTypes.Role` = user's role ("admin").
2. HMAC-SHA256 is a symmetric algorithm — the same secret key is used to both sign and verify. Only this server (holding the secret) can create valid tokens, and only this server can verify them. Asymmetric (RS256) would let others verify without the private key.
3. `issuer` identifies who created the token (this API). `audience` identifies who the token is intended for. The validation side checks both match, preventing tokens from one service being used against another.
4. `var (tokenStr, expiresAt) = _tokenService.CreateAccessToken(user);` — C# tuple destructuring.
5. Roles come from a navigation property collection (`UserRoles`) which can have any number of entries. You can't spread a dynamic list into an array initializer cleanly, so a loop is the natural way.

</details>

---

### Snippet 7

```csharp
group.MapPost("/login", async (LoginRequest req, AuthService auth, HttpContext ctx, ...) =>
{
    // ... validation ...
    var (res, err) = auth.Login(req);
    if (res == null)
        return Results.Json(new { message = err }, statusCode: 401);

    ctx.Response.Cookies.Append("refresh_token", res.RefreshToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        MaxAge = TimeSpan.FromDays(7),
        Path = "/"
    });

    return Results.Ok(new { accessToken = res.AccessToken, expiresIn = res.ExpiresInSeconds });
});
```

**Questions:**
1. Why is the `refreshToken` set in a cookie while the `accessToken` is returned in the JSON body?
2. What does `HttpOnly = true` protect against?
3. What does `Secure = true` mean and when would it cause issues in local development?
4. What is `SameSite = Lax` and why not `Strict`?
5. Why is the `accessToken` NOT stored in a cookie too?

<details>
<summary>Answers</summary>

1. The refresh token in an HTTP-only cookie can't be read by JavaScript (XSS protection). The access token in the response body is stored in memory (Zustand) and attached to API calls manually.
2. `HttpOnly` makes the cookie inaccessible to `document.cookie` in JavaScript. Even if an attacker injects malicious JS via XSS, they can't steal the refresh token.
3. `Secure` means the cookie only travels over HTTPS. In local development (`http://localhost`), the browser won't send the cookie — developers often set this to `false` locally or use `SameSite=None`.
4. `Lax` allows the cookie to be sent on top-level navigations (clicking a link) but not on cross-site sub-resource requests. `Strict` would block it on cross-site navigation entirely, breaking the Google OAuth redirect flow.
5. The access token changes every 15 minutes and needs to be attached as a `Bearer` header, not a cookie. Storing it in memory keeps it away from any persistent storage that could be inspected.

</details>

---

### Snippet 8 — `auth.ts` (Frontend)

```typescript
export async function bootstrapSession() {
    if (_bootstrapPromise) return _bootstrapPromise;

    _bootstrapPromise = (async () => {
        const currentToken = getAccessToken();
        if (currentToken) {
            const user = await fetchCurrentUser();
            if (user) return user;
        }

        try {
            const { data } = await api.post('/auth/refresh');
            setAccessToken(data.accessToken);
            api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
            return await fetchCurrentUser();
        } catch {
            useAuthStore.getState().clearAuth();
            return null;
        } finally {
            _bootstrapPromise = null;
            useAuthStore.getState().setBootstrapped(true);
        }
    })();

    return _bootstrapPromise;
}
```

**Questions:**
1. Why does `bootstrapSession` check `if (_bootstrapPromise) return _bootstrapPromise` at the top?
2. Why is `bootstrapSession` needed at all — what problem does it solve on page refresh?
3. What does `finally` guarantee, and why is `setBootstrapped(true)` called there instead of in `try`?
4. If `/auth/refresh` throws (cookie expired), what happens to the user's state?
5. What is the `IIFE` pattern used here (`(async () => { ... })()`)?

<details>
<summary>Answers</summary>

1. Deduplication — if multiple components call `bootstrapSession` simultaneously on mount, only one HTTP request is made. All callers get the same promise.
2. On page refresh, the access token (stored in memory/Zustand) is lost. The refresh token cookie persists. `bootstrapSession` calls `/auth/refresh` to get a new access token silently, restoring the session.
3. `finally` runs whether the try succeeded or threw. `setBootstrapped(true)` must always run — even on failure — so the app knows auth initialization is complete and can render the login state correctly.
4. `clearAuth()` is called — the user/token are removed from Zustand. The app treats the user as logged out.
5. An Immediately Invoked Function Expression — creates an async function and calls it immediately, returning a Promise. Used here to create an async scope so `await` can be used inside the assignment.

</details>

---

## Section 3 — Axios Interceptor

---

### Snippet 9

```typescript
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newAccessToken = data.accessToken;
        setAccessToken(newAccessToken);
        onRefreshed(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

**Questions:**
1. What does a response interceptor do and when does the error handler fire?
2. Why does the code check `!originalRequest._retry`? What would happen without it?
3. Explain the `isRefreshing` / `refreshSubscribers` pattern. What problem does it solve?
4. Why is a raw `axios.post` used for the refresh call instead of `api.post`?
5. Why does `window.location.href = '/'` redirect on refresh failure instead of just `clearAuth()`?

<details>
<summary>Answers</summary>

1. A response interceptor runs on every HTTP response. The error handler fires when the response has an error status (4xx, 5xx, or network error). It receives the error and can either recover or re-reject.
2. Without `_retry`, a failed retry (e.g., the refreshed token is also rejected) would loop forever — 401 → refresh → retry → 401 → refresh → ∞. `_retry = true` marks the request as already retried once.
3. If 3 requests fail simultaneously with 401, all 3 would try to call `/auth/refresh`. With `isRefreshing`, only the first one fires the refresh; the other 2 are queued as subscribers. When the refresh completes, `onRefreshed` calls all subscribers with the new token and they all retry.
4. Using `api.post` would trigger the interceptor again on failure, causing infinite recursion. Raw `axios` bypasses the interceptor.
5. `clearAuth()` removes the token from memory but the user is still on a protected page. A hard redirect ensures they land on a public page and the React component tree reinitializes cleanly.

</details>

---

## Section 4 — React & Zustand

---

### Snippet 10

```typescript
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isBootstrapped: false,
    setAuth: (user, accessToken) => set({ user, accessToken }),
    clearAuth: () => set({ user: null, accessToken: null }),
    setBootstrapped: (isBootstrapped) => set({ isBootstrapped }),
}))
```

**Questions:**
1. What is Zustand's `create` function doing here?
2. What does `set` do? What happens to components subscribed to this store when `set` is called?
3. Why does `clearAuth` not clear `isBootstrapped`? What would happen if it did?
4. How would a React component read `user` from this store?
5. Why is this global state better than passing `user` as a prop from `App` down to every component?

<details>
<summary>Answers</summary>

1. `create` creates a store — it returns a React hook (`useAuthStore`) that any component can use to subscribe to state slices.
2. `set` merges the new object into the store state. Every component that subscribed to the changed slice re-renders automatically.
3. `isBootstrapped` tracks whether auth initialization has run, not whether the user is logged in. Clearing it on logout would cause the app to show a loading state again. It should stay `true` once set.
4. `const { user } = useAuthStore()` or with a selector: `const user = useAuthStore(state => state.user)` — the selector version only re-renders when `user` changes.
5. Prop drilling would require passing `user` through every intermediate component even if it doesn't need it. Global state lets any component subscribe directly, keeping components decoupled.

</details>

---

### Snippet 11

```typescript
export default function AdminRoute() {
  const location = useLocation();
  const { user, isBootstrapped } = useAuthStore();

  if (!isBootstrapped) return null;

  const isAdminOrStaff = user?.roles
    .map(r => r.toLowerCase())
    .some(r => r === 'admin' || r === 'staff') ?? false;

  if (!isAdminOrStaff) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
```

**Questions:**
1. Why does `if (!isBootstrapped) return null` need to come first?
2. What does `<Outlet />` render?
3. What does `replace` do in `<Navigate to="/" replace />`? What's the difference without it?
4. `user?.roles` uses optional chaining. What does `?.` do and why is it needed here?
5. The `??` at the end defaults to `false`. When would the expression before `??` be `undefined`?
6. This is a frontend guard only. Where is the real authorization enforced?

<details>
<summary>Answers</summary>

1. If `bootstrapSession` hasn't completed, `user` is still `null` even for a logged-in user. Without this check, every logged-in user would be redirected on page refresh before the token refreshes.
2. `<Outlet />` renders whatever child route matched. `AdminRoute` wraps the dashboard routes — if the user is authorized, `<Outlet />` renders the actual dashboard page.
3. `replace` replaces the current history entry instead of pushing a new one. Without it, the user could hit the browser Back button and get sent back to the protected route they were just denied from.
4. `?.` safely accesses a property that might be null/undefined. If `user` is `null`, `user?.roles` returns `undefined` instead of throwing `TypeError: Cannot read property 'roles' of null`.
5. When `user` is `null` — `null?.roles` → `undefined` → `.map(...)` can't run → the `??` provides `false` as fallback.
6. The backend — every protected route uses `.RequireAuthorization()` with role checks. The frontend guard is UX only; a user could call the API directly without going through the React app.

</details>

---

## Section 5 — Validators

---

### Snippet 12

```csharp
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100).WithMessage("First name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .MaximumLength(128).WithMessage("Password must not exceed 128 characters.");
    }
}
```

**Questions:**
1. What library is this and how does it connect to the HTTP pipeline?
2. What does `RuleFor(x => x.Email)` return, and why can you chain `.NotEmpty().EmailAddress()`?
3. If a request has both an invalid email AND a password that's too short, how many errors are returned?
4. What HTTP status code is returned when validation fails, and what does the response body look like?
5. Why validate on the backend when the frontend already validates with Zod?

<details>
<summary>Answers</summary>

1. FluentValidation. It connects via `AddFluentValidationAutoValidation()` in `Program.cs` — this hooks validators into ASP.NET Core's model binding so they run automatically before the route handler.
2. `RuleFor` returns a `IRuleBuilderInitial` — a fluent builder. Each chained method (`.NotEmpty()`, `.EmailAddress()`) adds a rule and returns the same builder, allowing method chaining.
3. All applicable errors are returned — FluentValidation by default runs all rules and collects all failures.
4. HTTP 400 Bad Request. The body is a `ValidationProblemDetails` JSON with an `errors` object mapping field names to arrays of error messages.
5. The frontend can be bypassed — anyone with Postman or curl can call the API directly. Backend validation is the authoritative gate. Frontend validation is only for UX (fast feedback without a round-trip).

</details>

---

## Section 6 — Database Relationships (DbContext)

---

### Snippet 13

```csharp
modelBuilder.Entity<User>(b =>
{
    b.HasMany(u => u.RefreshTokens)
        .WithOne(r => r.User)
        .HasForeignKey(r => r.UserId)
        .OnDelete(DeleteBehavior.Cascade);
    b.Property(u => u.Email).IsRequired().HasMaxLength(256);
});

modelBuilder.Entity<UserRole>(b =>
{
    b.HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique();
    b.HasOne(ur => ur.User)
        .WithMany(u => u.UserRoles)
        .HasForeignKey(ur => ur.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

**Questions:**
1. What is `HasMany(...).WithOne(...)` — what relationship type is this?
2. What does the `Cascade` on `User → RefreshTokens` mean practically?
3. `b.HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique()` — what does this prevent?
4. `b.Property(u => u.Email).IsRequired().HasMaxLength(256)` — what SQL constraint does this generate?
5. Could you have configured these relationships using Data Annotations on the model classes instead? What's the tradeoff?

<details>
<summary>Answers</summary>

1. One-to-Many: one User has many RefreshTokens. Each RefreshToken belongs to exactly one User.
2. Deleting a User automatically deletes all their RefreshTokens from the database. No orphan tokens left behind.
3. A user can only be assigned a given role once — you can't add duplicates of the same `(UserId, RoleId)` pair.
4. `NOT NULL` on the email column and a `VARCHAR(256)` column type. If you try to insert a user without an email, the database rejects it.
5. Yes — `[Required]`, `[MaxLength(256)]`, `[ForeignKey]` attributes on model classes. Tradeoff: annotations mix infrastructure concerns into domain models; Fluent API keeps model classes clean and is more powerful for complex configurations.

</details>

---

## Section 7 — Minimal API Router

---

### Snippet 14

```csharp
public static class AuthRouter
{
    public static void MapAuthRoutes(this WebApplication app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/register", async (RegisterRequest req, AuthService auth, IValidator<RegisterRequest> validator) =>
        {
            var validation = await validator.ValidateAsync(req);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToDictionary());

            var (user, err) = auth.Register(req);
            if (user == null)
            {
                if (err == "Email already in use")
                    return Results.Conflict(new { message = err });
                return Results.BadRequest(new { message = err });
            }
            return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email });
        })
        .RequireRateLimiting("auth-limit");
    }
}
```

**Questions:**
1. What is `this WebApplication app` — what does the `this` keyword make this?
2. `MapGroup("/auth")` creates a route group. What is the full URL for the register endpoint?
3. The handler receives `RegisterRequest req, AuthService auth, IValidator<RegisterRequest> validator` as parameters with no attributes. How does ASP.NET Core know where to get them from?
4. `Results.Created(...)` returns HTTP 201. What is the difference between 200 OK and 201 Created?
5. `Results.Conflict(...)` returns HTTP 409. When is this returned and why not just return 400?
6. What does `.RequireRateLimiting("auth-limit")` do?

<details>
<summary>Answers</summary>

1. An **extension method** — it extends `WebApplication` so you can call `app.MapAuthRoutes()` anywhere you have an `app` variable, keeping routing code organized.
2. `/auth/register` — the group prefix `/auth` + the route `/register`.
3. ASP.NET Core's Minimal API parameter binding: complex objects from the request body (model binding), services like `AuthService` and `IValidator` from DI (dependency injection). It differentiates based on whether the type is registered in the DI container.
4. 200 means the request was processed successfully. 201 means a new resource was created — it should include a `Location` header pointing to the new resource. Semantically more accurate for POST/create.
5. 409 Conflict specifically means "the request can't be completed because of a conflict with current state" — the email already exists. 400 would be wrong because the request itself is valid; the conflict is with existing data.
6. Applies the "auth-limit" rate limiting policy to this endpoint — in this project, 10 requests/minute per client. Protects against brute-force login/register attempts.

</details>

---

## Section 8 — Schemas / DTOs

---

### Snippet 15

```csharp
public record RegisterRequest(string FirstName, string LastName, string Email, string Password);

public record MovieResponse(
    Guid Id, string Name, string Description,
    int DurationMinutes, DateTime ReleaseDate,
    string Director, string AgeRating,
    string PosterUrl, string TrailerUrl,
    bool IsActive, string CreatedAt,
    List<string> Genres,
    List<CastResponse> Cast,
    int? TmdbId = null
);

public record UpdateMovieRequest(
    string? Name, string? Description,
    int? DurationMinutes, DateTime? ReleaseDate,
    ...
);
```

**Questions:**
1. What is a C# `record` and how is it different from a `class`?
2. Why are all fields in `UpdateMovieRequest` nullable (`string?`, `int?`) but not in `RegisterRequest`?
3. What is the difference between `MovieResponse` and the `Movie` entity in `Models.cs`? Why have both?
4. `int? TmdbId = null` — what does the `= null` part do in a record's primary constructor?
5. `PasswordHash` exists on the `User` entity but not on `UserResponse`. Why is this critical?

<details>
<summary>Answers</summary>

1. A `record` is immutable by default, has value-based equality (two records with the same values are equal), and auto-generates a constructor, `ToString`, and deconstruction. A `class` has reference equality and mutable properties by default.
2. In an update request, you only send the fields you want to change. Nullable fields mean "if null, don't update this field." A register request requires all fields — you can't create a user without an email.
3. `MovieResponse` is a DTO (Data Transfer Object) — it's what the API sends to clients, shaped for consumption. The `Movie` entity is the database model with navigation properties EF Core uses. Keeping them separate means: API shape can change without changing the DB schema, and sensitive/internal fields can be excluded.
4. A default parameter value — if `TmdbId` is not provided in the JSON, it defaults to `null`. It's optional in the request.
5. Security — if `PasswordHash` were included in `UserResponse`, every GET user endpoint would return the hashed password to clients. Even hashed, it's sensitive and could aid offline cracking. DTOs let you control exactly what data leaves the server.

</details>

---

## Section 9 — TypeScript / Frontend Types

---

### Snippet 16

```typescript
function parseJwtPayload(token: string): JwtPayload | null {
    const parts = token.split('.')
    if (parts.length < 2) return null
    try {
        return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
    } catch {
        return null
    }
}

function decodeBase64Url(input: string): string {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return atob(padded)
}
```

**Questions:**
1. A JWT has 3 parts separated by `.`. This code reads `parts[1]` — which part is that?
2. Why does `decodeBase64Url` replace `-` with `+` and `_` with `/`?
3. What does `padEnd(... * 4, '=')` do and why is it needed?
4. Why is `try/catch` needed around `JSON.parse`?
5. The token is decoded client-side without verifying the signature. Why is this safe here? When would it NOT be safe?

<details>
<summary>Answers</summary>

1. The **payload** — index 0 is the header, index 1 is the payload (claims), index 2 is the signature.
2. Base64URL is a URL-safe variant of Base64 that replaces `+` with `-` and `/` with `_` to avoid issues in URLs. `atob()` only understands standard Base64, so you must convert back.
3. Standard Base64 requires strings to be padded to a multiple of 4 chars with `=`. Base64URL omits the padding. `padEnd` restores it before `atob` can decode.
4. `JSON.parse` throws on invalid JSON. If the token is malformed, the catch returns `null` gracefully instead of crashing.
5. Safe for **reading** claims client-side for UI decisions (show username, check role for hiding admin buttons). NOT safe for authorization — the server must always re-validate the signature. A client could forge a token with `"role": "admin"` and the frontend would show admin UI, but the backend would reject all API calls.

</details>

---

## Section 10 — SQL / Database Concepts

---

### Snippet 17 — Migration excerpt

```csharp
migrationBuilder.CreateTable(
    name: "Tickets",
    columns: table => new
    {
        Id = table.Column<Guid>(nullable: false),
        ScheduleId = table.Column<Guid>(nullable: false),
        SeatId = table.Column<Guid>(nullable: false),
        Price = table.Column<decimal>(precision: 10, scale: 2, nullable: false),
        Status = table.Column<string>(maxLength: 32, nullable: false, defaultValue: "Available"),
        CreatedAt = table.Column<DateTime>(nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_Tickets", x => x.Id);
        table.ForeignKey("FK_Tickets_Seats_SeatId", x => x.SeatId,
            principalTable: "Seats", principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
        table.ForeignKey("FK_Tickets_MovieSchedules_ScheduleId", x => x.ScheduleId,
            principalTable: "MovieSchedules", principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    });

migrationBuilder.CreateIndex(
    name: "IX_Tickets_ScheduleId_SeatId",
    table: "Tickets",
    columns: new[] { "ScheduleId", "SeatId" },
    unique: true);
```

**Questions:**
1. What is a migration and how was this file generated?
2. What is `ReferentialAction.Restrict` and what does it mean if you try to delete a `Seat` that has a `Ticket`?
3. `precision: 10, scale: 2` for `Price` — what does this mean? What's the largest price storable?
4. What is the `IX_Tickets_ScheduleId_SeatId` index and why is it marked `unique: true`?
5. How do you apply this migration? What command runs it?

<details>
<summary>Answers</summary>

1. A migration is a C# file auto-generated by `dotnet ef migrations add <Name>` that represents schema changes. EF Core diffs the current model against the last snapshot and generates the `Up()` (apply) and `Down()` (rollback) methods.
2. `Restrict` blocks the delete. If you try `DELETE FROM Seats WHERE Id = X` and there's a Ticket referencing that seat, MySQL returns a foreign key constraint error. The delete is rejected.
3. `precision: 10` = total digits, `scale: 2` = digits after decimal. Max value: `99,999,999.99`. This is the correct way to store currency — exact, no floating-point errors.
4. A unique composite index enforcing that `(ScheduleId, SeatId)` can't repeat — one ticket per seat per screening. The database enforces this independently of application code.
5. `dotnet ef database update` (CLI) or `context.Database.MigrateAsync()` called in `Program.cs` at startup (which this project does with retry logic for Docker).

</details>

---

## Section 11 — Program.cs / DI Setup

---

### Snippet 18

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TokenService>();

// ...

app.UseAuthentication();
app.UseAuthorization();
```

**Questions:**
1. What does `ValidateLifetime = true` do? What happens to an expired token?
2. What is `ClockSkew = TimeSpan.FromSeconds(30)` and why is it needed?
3. `AddScoped<AuthService>()` — what does scoped lifetime mean? When is the service created and destroyed?
4. Why must `UseAuthentication()` come before `UseAuthorization()` in the pipeline?
5. What is the `IssuerSigningKey` used for during token validation?

<details>
<summary>Answers</summary>

1. It checks the `exp` claim in the JWT. If the current time is past the expiry, the token is rejected with 401. Without this, tokens would be valid forever.
2. A small tolerance for clock differences between servers. If the token expires at 12:00:00 and the server clock reads 12:00:15, without `ClockSkew` the token would be rejected even though it's barely expired. 30 seconds is a reasonable tolerance.
3. Scoped means one instance per HTTP request. `AuthService` is created when the request arrives, injected into all handlers that need it during that request, and disposed when the request completes. This is correct for services that hold `DbContext`.
4. `UseAuthentication` reads and validates the JWT, setting `HttpContext.User`. `UseAuthorization` then inspects `HttpContext.User` to decide access. If reversed, `UseAuthorization` runs before the identity is established and all protected routes fail.
5. It verifies the JWT's HMAC-SHA256 signature. The signing key used at token creation must match the key used at validation. If they don't match, the signature check fails and the token is rejected — this prevents forged tokens.

</details>

---

## Section 12 — General Concepts

---

### Snippet 19

```typescript
// api.ts
export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
```

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
app.UseCors(FrontendCorsPolicy);
```

**Questions:**
1. What is CORS and why does the browser block the request without it?
2. `withCredentials: true` on the frontend must match `.AllowCredentials()` on the backend. What breaks if only one side has it?
3. Why can't you use `.AllowAnyOrigin()` together with `.AllowCredentials()`?
4. What does `AllowAnyHeader()` and `AllowAnyMethod()` allow?
5. Where in the middleware pipeline must `app.UseCors()` be placed relative to `UseAuthentication`?

<details>
<summary>Answers</summary>

1. CORS is a browser security policy blocking web pages from making requests to a different origin (protocol + domain + port). `localhost:5173` (React) calling `localhost:5000` (.NET) is cross-origin. The browser sends a preflight OPTIONS request; the server's CORS headers tell the browser whether to allow it.
2. If only the frontend sets `withCredentials: true`, the browser will refuse to send the cookie because the server hasn't opted in. If only the backend sets `AllowCredentials()`, the browser still won't send credentials. Both must agree.
3. The CORS spec prohibits it as a security measure — allowing credentials to any origin would let any website make authenticated requests as the user. You must specify exact origins when credentials are involved.
4. `AllowAnyHeader()` allows any request header (e.g., `Authorization`, custom headers). `AllowAnyMethod()` allows GET, POST, PUT, DELETE, PATCH, etc.
5. `UseCors()` must come before `UseAuthentication()` and `UseAuthorization()`. CORS preflight OPTIONS requests must be handled and the headers returned before auth runs.

</details>

---

### Snippet 20

```typescript
// From AuthService.cs
public async Task<bool> ForgotPasswordAsync(string email)
{
    var normalizedEmail = email.Trim().ToLowerInvariant();
    var user = _db.Users.FirstOrDefault(u => u.Email == normalizedEmail);
    if (user == null) return true; // don't leak whether the email exists

    var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
    _db.PasswordResetTokens.Add(new PasswordResetToken
    {
        Token = token,
        Expires = DateTime.UtcNow.AddHours(1),
        Used = false
    });
    _db.SaveChanges();

    var resetLink = $"{frontendUrl}/reset-password?token={token}&email={Uri.EscapeDataString(user.Email)}";
    await _emailService.SendAsync(user.Email, "Reset your password", $"<a href='{resetLink}'>Reset</a>");
    return true;
}
```

**Questions:**
1. Why does `if (user == null) return true` instead of returning an error? What attack does this prevent?
2. `RandomNumberGenerator.GetBytes(32)` — why use a cryptographic RNG instead of `Random`?
3. Why does the reset token have an `Expires` time (1 hour)?
4. `Uri.EscapeDataString(user.Email)` — what does this do and why is it needed?
5. In `ResetPassword`, the token is compared with `t.Token == token` directly (not hashed). What security tradeoff is this? How would you make it more secure?

<details>
<summary>Answers</summary>

1. **User enumeration prevention** — if the API returned an error for non-existent emails, an attacker could probe emails to find which are registered. Returning the same response regardless leaks nothing.
2. `System.Random` is not cryptographically secure — its output is predictable if you know the seed. `RandomNumberGenerator` produces cryptographically random bytes that can't be predicted, making tokens impossible to guess.
3. Limits the attack window. If the reset email is intercepted or the link leaks, it becomes useless after 1 hour. Without expiry, a compromised link would work forever.
4. URL-encoding the email so special characters (`+`, `@`, spaces) don't break the URL. For example, `user+1@test.com` → `user%2B1%40test.com`.
5. The token is stored in plain text, so a DB leak exposes valid reset tokens. More secure: store only a hash of the token (like password hashing), send the raw token in the email. Verification: hash the submitted token and compare to the stored hash.

</details>

---

### Snippet 21 — Putting it all together

Look at this sequence from the frontend `api.ts`:

```typescript
login: async (payload: LoginPayload) => {
    const { data } = await api.post('/auth/login', payload)
    setAccessToken(data.accessToken)
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    await fetchCurrentUser()
    return data
},
```

And from the backend `AuthRouter.cs` login handler:
```csharp
ctx.Response.Cookies.Append("refresh_token", res.RefreshToken, new CookieOptions
{
    HttpOnly = true, Secure = true, SameSite = SameSiteMode.Lax, MaxAge = TimeSpan.FromDays(7)
});
return Results.Ok(new { accessToken = res.AccessToken, expiresIn = res.ExpiresInSeconds });
```

**Questions:**
1. Trace the full login flow: what data flows where, and what ends up in which storage?
2. Why is `api.defaults.headers.common.Authorization` set after login? What happens to future API calls?
3. After the login request, `fetchCurrentUser()` is called — why? What does it fetch that login didn't return?
4. The refresh token is never visible to JavaScript. How does the browser use it for the `/auth/refresh` call?
5. If the user closes the browser and reopens it, what is their state? What happens next?

<details>
<summary>Answers</summary>

1. User submits email/password → POST `/auth/login` → backend verifies, creates JWT + refresh token → refresh token set in HTTP-only cookie (browser stores it) → access token returned in JSON body → frontend stores in Zustand memory + sets `Authorization` header on axios instance.
2. Setting `api.defaults.headers.common.Authorization` adds the `Bearer <token>` header to every future Axios request made with `api`. Without this, all subsequent API calls would get 401.
3. `login` only returns the access token and expiry. `fetchCurrentUser()` calls `GET /auth/me` which returns the full user profile (id, name, email, roles, avatar) — this populates the Zustand `user` object that components use for display.
4. `withCredentials: true` on the axios instance tells the browser to automatically include cookies in the request, including the HTTP-only `refresh_token` cookie. JavaScript never reads the cookie value — the browser handles it.
5. The access token is gone (was in memory). The refresh token cookie persists (7 days). On next load, `bootstrapSession()` runs → calls `POST /auth/refresh` → browser automatically sends the cookie → backend validates it → returns a new access token → user is silently restored.

</details>

---

> **Tip:** For every snippet, try to also think about: what HTTP status code does this return? What would break if I removed this line? What security issue could appear if this check wasn't there?
