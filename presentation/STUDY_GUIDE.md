# Cinema Management — Study Guide

Mock Q&A covering React, .NET, databases, auth, payments, and everything in between.
Based on the actual code in this project.

---

## Table of Contents

1. [C# / .NET Backend](#cnet-backend)
2. [Entity Framework & Database](#entity-framework--database)
3. [Authentication & JWT](#authentication--jwt)
4. [React & Frontend Architecture](#react--frontend-architecture)
5. [State Management (Zustand)](#state-management-zustand)
6. [API Layer & Axios](#api-layer--axios)
7. [Forms & Validation](#forms--validation)
8. [Payments (Stripe)](#payments-stripe)
9. [File Uploads & S3](#file-uploads--s3)
10. [Docker & Deployment](#docker--deployment)
11. [General Full-Stack Concepts](#general-full-stack-concepts)

---

## C# / .NET Backend

**Q: This project uses Minimal APIs instead of controllers. What does that mean, and why might you choose it?**

A: Minimal APIs let you define routes directly in `Program.cs` or in extension methods without creating `[ApiController]` classes. Each route is a lambda or method reference. The project uses router extension methods (e.g., `app.MapAuthRoutes()`) to keep things grouped. The benefit is less boilerplate — no need for controller classes, attribute routing, or action filters for simple CRUD. The tradeoff is that controllers give you more structure when logic gets complex.

---

**Q: What is `IServiceCollection` and why do we call `.AddScoped<IMovieService, MovieService>()`?**

A: `IServiceCollection` is the DI container registration surface in ASP.NET Core. `.AddScoped` means one instance per HTTP request — so every request gets the same `MovieService` instance throughout that request but a fresh one for the next. We register the interface (`IMovieService`) mapped to the implementation (`MovieService`) so that when a constructor asks for `IMovieService`, the framework injects the concrete class. This enables swapping implementations (e.g., for testing) without changing consumers.

---

**Q: What does `builder.Services.AddFluentValidationAutoValidation()` do and how does validation actually happen at the route level?**

A: It hooks FluentValidation into the model binding pipeline so that when a route receives a request body, it automatically runs the matching validator (e.g., `RegisterRequestValidator` for `RegisterRequest`). If validation fails, it short-circuits and returns a 400 with validation errors before the route handler ever runs. Without this, you'd have to manually call `validator.Validate(model)` in every handler.

---

**Q: What is `AsSplitQuery()` in EF Core and why is it used in `MovieService`?**

A: When you include multiple collection navigations (e.g., `Include(m => m.MovieGenres).Include(m => m.MovieCasts)`), EF Core by default does a single SQL JOIN that cartesian-multiplies rows. For a movie with 3 genres and 5 cast members you'd get 15 rows. `AsSplitQuery()` tells EF to run separate queries for each collection and stitch them in memory, which is more efficient for large collections. The tradeoff is multiple round-trips vs. one big result set.

---

**Q: Explain the middleware pipeline order in `Program.cs`. Why does `UseAuthentication` have to come before `UseAuthorization`?**

A: The ASP.NET Core middleware pipeline is ordered. `UseAuthentication` reads the JWT from the request, validates it, and sets `HttpContext.User`. `UseAuthorization` then checks `HttpContext.User` against `[Authorize]` attributes. If you flip them, the authorization middleware runs before the identity is established and every protected route would fail with 401. Other important order considerations: `UseCors` must come before `UseRouting`, and `UseRateLimiter` before route handlers.

---

**Q: What is `AddResponseCompression` and what does `BrotliCompressionProvider` mean?**

A: Response compression middleware compresses HTTP response bodies to reduce bandwidth. Brotli is a newer compression algorithm that generally achieves better ratios than GZip (especially on text like JSON). The project registers Brotli as preferred with GZip as fallback. Clients advertise what they support via the `Accept-Encoding` header, and the server picks the best match.

---

**Q: What is a rate limiter and what does the fixed-window limiter configured on `/auth` endpoints do?**

A: A rate limiter restricts how many requests a client can make in a time window to protect against brute-force attacks. The fixed-window limiter in this project allows 10 requests per minute per IP on auth endpoints (`/auth/login`, `/auth/register`, etc.). If exceeded, it returns 429 Too Many Requests. Fixed-window means the counter resets at the end of each window regardless of when requests arrived — so 10 requests at second 59 and 10 at second 61 are both allowed.

---

**Q: What is Serilog and how is it different from the default `ILogger`?**

A: `ILogger` is the .NET logging abstraction. Serilog is a third-party implementation of that abstraction that adds structured logging — instead of plain strings, you log key-value pairs that can be queried. The project uses Serilog with a console sink. You could swap in file sinks, Seq, Elasticsearch, etc. without changing the logging calls in services.

---

**Q: What is a health check endpoint and why does this project expose `/healthz`?**

A: A health check returns a simple HTTP 200/503 indicating whether the app is ready to serve traffic. In Docker/Kubernetes deployments, the orchestrator polls this endpoint to decide whether to route traffic to the container or restart it. The project registers it via `AddHealthChecks()` and maps it to `/healthz`.

---

## Entity Framework & Database

**Q: What is EF Core and what is its role in this project?**

A: EF Core is an Object-Relational Mapper (ORM). It lets you work with database tables as C# classes (entities) and query them with LINQ instead of raw SQL. In this project, `ApplicationDbContext` holds `DbSet<Movie>`, `DbSet<User>`, etc. EF Core translates LINQ queries to SQL for MySQL (via the Pomelo provider) and handles migrations to keep the schema in sync with the model.

---

**Q: What is a migration and how do you create/apply one?**

A: A migration is a code-generated snapshot of schema changes. When you add a property to a model (e.g., add `Rating` to `Movie`), you run `dotnet ef migrations add AddRatingToMovie` which generates a C# file with `Up()` (apply change) and `Down()` (revert) methods. `dotnet ef database update` (or `context.Database.MigrateAsync()` at startup) runs pending migrations. The project calls `MigrateAsync()` on startup with retry logic for when MySQL hasn't started yet.

---

**Q: What is a junction/join table and where does this project use them?**

A: A junction table resolves many-to-many relationships. For example, a Movie can have many Genres and a Genre can belong to many Movies. This is modeled as `MovieGenre` (with `MovieId` + `GenreId` foreign keys). Similarly `MovieCast` links movies to cast members. EF Core 5+ can do implicit many-to-many without an explicit entity, but explicit junction entities let you add extra columns if needed.

---

**Q: What does `OnDelete(DeleteBehavior.Cascade)` vs `Restrict` mean in EF Core?**

A: It defines what happens to related rows when a parent row is deleted.
- `Cascade`: deleting the parent automatically deletes the children (e.g., deleting a User deletes their RefreshTokens).
- `Restrict`: the delete fails if related rows exist (e.g., you can't delete a Room if it has Schedules referencing it — you must remove schedules first).
- `SetNull`: sets the FK to null.
The choice protects data integrity.

---

**Q: What is a unique index and why does the project put one on `(ScheduleId, SeatId)` in the Ticket table?**

A: A unique index enforces that no two rows can have the same combination of values. `(ScheduleId, SeatId)` being unique means one ticket can exist per seat per screening — you can't accidentally double-book the same seat. EF Core adds this via `HasIndex(t => new { t.ScheduleId, t.SeatId }).IsUnique()` in `OnModelCreating`. The database enforces this even if application-level checks fail.

---

**Q: What is the difference between a soft delete and a hard delete, and does this project use either?**

A: A hard delete removes the row from the database permanently. A soft delete marks a row as inactive (e.g., `IsActive = false`) and filters it from queries, preserving data for auditing. The `Movie` entity has an `IsActive` flag — the `DELETE /api/movies/{id}` endpoint sets `IsActive = false` rather than removing the row, which means existing schedules referencing that movie remain valid.

---

**Q: What is the N+1 query problem?**

A: It happens when you load a list of entities (1 query) and then for each entity you trigger a separate query to load a related entity (N queries). For example, loading 20 movies and then accessing `movie.Genres` on each would fire 21 queries. EF Core's `Include()` solves this by JOINing in the same query, or `AsSplitQuery()` uses N+1 intentionally but in a controlled, efficient way.

---

**Q: What is a `DbContext` and why should it be scoped (not singleton)?**

A: `DbContext` represents a unit of work — it tracks changes to entities and manages the connection to the database. It should be scoped (one per request) because it maintains a change tracker in memory. If it were a singleton, change tracking state would bleed between requests and could corrupt data. EF Core registers `ApplicationDbContext` with `.AddDbContext<>()` which defaults to scoped lifetime.

---

## Authentication & JWT

**Q: What is a JWT and what are its three parts?**

A: A JSON Web Token is a signed, base64-encoded string with three dot-separated parts:
1. **Header** — algorithm and token type (`{ "alg": "HS256", "typ": "JWT" }`)
2. **Payload** — claims like `sub` (subject/user ID), `email`, `roles`, `exp` (expiry)
3. **Signature** — HMAC of header + payload using the secret key

The server validates the signature on every request. Anyone can decode the payload (it's just base64), but can't forge the signature without the secret. This project uses HS256 (HMAC-SHA256).

---

**Q: What is the difference between an access token and a refresh token in this project?**

A: 
- **Access token**: short-lived JWT (15 minutes) sent in the `Authorization: Bearer <token>` header. Used to authenticate API calls.
- **Refresh token**: long-lived opaque token (7 days), stored in an HTTP-only cookie. Used only to get a new access token when the current one expires.

Separating them limits damage if an access token is leaked — it expires in 15 minutes. The refresh token being HTTP-only means JavaScript can't read it, protecting against XSS.

---

**Q: What does "token rotation" mean and does this project implement it?**

A: Token rotation means issuing a new refresh token every time you use the old one, then invalidating the old one. This limits the window where a stolen refresh token can be used. The project stores `RefreshToken` records in the database with an `ExpiresAt` field and marks them as used/expired on each refresh. If someone tries to reuse an old token, it fails.

---

**Q: What is the `[Authorize]` attribute and how does it work with Minimal APIs?**

A: In Minimal APIs, instead of `[Authorize]`, you chain `.RequireAuthorization()` on the route or `.RequireAuthorization("AdminOrStaff")` for a named policy. The authorization middleware checks `HttpContext.User` (set by JWT authentication) for the required roles/claims. Example: a route that modifies movies would have `.RequireAuthorization(policy => policy.RequireRole("Admin", "Staff"))`.

---

**Q: How does Google OAuth work in this project at a high level?**

A: The frontend gets a Google ID token via the Google OAuth client. It sends this token to `POST /auth/google`. The backend uses the Google auth library to validate the token against Google's public keys (verifying it's genuine and not expired). It extracts the user's email, name, and Google ID from the token claims. If the user doesn't exist yet, it creates an account. Then it issues a JWT + refresh token the same way normal login does.

---

**Q: What is password hashing and why don't we store passwords in plain text?**

A: Hashing is a one-way transformation. We store the hash, not the password. When logging in, we hash the submitted password and compare hashes. If the database leaks, attackers get hashes, not passwords. This project uses ASP.NET Core's `IPasswordHasher` which uses PBKDF2 with a random salt per user — making rainbow table attacks impractical.

---

**Q: What is CORS and why is it configured in the backend?**

A: Cross-Origin Resource Sharing is a browser security policy that blocks a web page from making API requests to a different domain than the one it was loaded from. The React frontend on `localhost:5173` would be blocked from calling the API on `localhost:5000` without explicit CORS headers. The backend configures allowed origins from the `Cors:AllowedOrigins` environment variable and sets `AllowCredentials()` so that the refresh token cookie can be sent cross-origin.

---

**Q: What is the `forgot-password` / `reset-password` flow?**

A: 
1. User submits email to `POST /auth/forgot-password`
2. Backend generates a secure random token, hashes it, stores it in the database with expiry
3. Sends the raw token to the user's email via SendGrid as a link: `{frontendUrl}/reset-password?token=...`
4. User clicks link, submits new password + token to `POST /auth/reset-password`
5. Backend looks up the token hash, checks expiry, updates password, invalidates token

The token is hashed in the database so that if the DB leaks, the reset links can't be abused.

---

## React & Frontend Architecture

**Q: What is React Router v7 and how is routing set up in this project?**

A: React Router v7 provides client-side routing — navigating between pages without full page reloads. Routes are defined in `main.tsx` using `createBrowserRouter`. The project uses nested layouts: `PublicLayout` (navbar + footer) wraps all public pages, while the dashboard routes are wrapped in an `AdminRoute` guard component. Lazy imports (`React.lazy`) are used so each page's JS is only downloaded when first visited (code splitting).

---

**Q: What is `React.lazy` and why does the project use it?**

A: `React.lazy` enables code splitting — the component's JS bundle is only loaded when that component is actually rendered (i.e., when the user visits that route). Without it, all page components would be bundled together and the initial load would be much larger. `lazy` is paired with `<Suspense fallback={<Loading />}>` to show a placeholder while the chunk is downloading.

---

**Q: What is a controlled component in React and how does it relate to forms?**

A: A controlled component is one where React state is the single source of truth for the input value. The input's `value` is bound to state, and `onChange` updates state. This means React always knows what's in the form. In this project, React Hook Form manages this: it registers inputs and syncs their values, which is more performant than naive `useState` per field because it avoids re-rendering the whole form on each keystroke.

---

**Q: What is Zod and how is it used with React Hook Form?**

A: Zod is a TypeScript-first schema validation library. You define a schema (e.g., `z.object({ email: z.string().email(), password: z.string().min(8) })`) and Zod validates data against it. In this project, `zodResolver` from `@hookform/resolvers/zod` connects the Zod schema to React Hook Form — so form validation runs automatically on submit (and optionally on change), showing field-level errors.

---

**Q: What are React Server Components vs Client Components? Does this project use them?**

A: This is a Next.js/React 19 concept. Server Components render on the server and send HTML — they can't use hooks or browser APIs. Client Components (`"use client"`) render in the browser and can use state, effects, and event handlers. This project uses **Vite + React Router**, not Next.js, so there are no Server Components. Everything is a client component rendered in the browser.

---

**Q: What is the `useEffect` hook and what are common pitfalls with it?**

A: `useEffect` runs side effects after render — data fetching, subscriptions, timers. The dependency array controls when it re-runs: empty `[]` means once on mount, `[id]` means whenever `id` changes. Common pitfalls:
- Stale closures: capturing outdated state/props because the dependency array is incomplete
- Missing cleanup: not returning a cleanup function for subscriptions/timers, causing memory leaks
- Infinite loops: when an effect updates state that's in its own dependencies

---

**Q: What is `useCallback` and when should you use it?**

A: `useCallback` memoizes a function reference so it doesn't change between renders unless its dependencies change. Use it when passing callbacks to child components that are wrapped in `React.memo`, or when a function is in a `useEffect` dependency array. Overusing it adds complexity without benefit — only memoize when you have a measured performance problem.

---

**Q: What is the difference between `null`, `undefined`, and an empty state in React rendering?**

A: In JSX, `null` and `undefined` render nothing (useful for conditional rendering). `false` also renders nothing. `0` renders as the text "0" — a common bug when writing `{count && <Component />}` where `count` is 0. The safe pattern is `{count > 0 && <Component />}` or a ternary `{count ? <Component /> : null}`.

---

**Q: How does the `AdminRoute` component protect dashboard routes?**

A: It's a wrapper component that checks the current user's roles via the auth store. If the user isn't authenticated or doesn't have admin/staff roles, it redirects to `/` using React Router's `<Navigate>`. Child routes (the actual dashboard pages) are only rendered if the check passes. This is purely a frontend guard — the backend API also enforces roles via `.RequireAuthorization()`.

---

**Q: What is Tailwind CSS and how does it differ from writing regular CSS?**

A: Tailwind is a utility-first CSS framework — instead of writing `.movie-card { display: flex; gap: 8px; }` in a CSS file, you write `<div className="flex gap-2">` directly in JSX. This co-locates styles with markup, eliminates naming classes, and ships only the CSS you actually use (via PurgeCSS/tree-shaking). The project extends Tailwind's config with custom colors (`wine`, `gold`, `stage`) and fonts (`Bebas Neue` for headings).

---

## State Management (Zustand)

**Q: What is Zustand and how does it compare to Redux?**

A: Zustand is a lightweight state management library. You create a store with `create()` that holds state and updater functions. Components subscribe with a selector hook — they only re-render when the selected slice changes. Compared to Redux:
- No actions/reducers/dispatch boilerplate
- No `Provider` wrapper needed
- Much less code for the same result
- Suitable for simpler state; Redux Toolkit is better for complex state machines with many slices

---

**Q: What does the `authStore` in this project store and why is it global state (not local)?**

A: It stores `user` (profile info), `accessToken`, and `isBootstrapped` (whether auth has been initialized). This is global because many unrelated components need it: the Navbar shows the username, AdminRoute checks roles, API interceptors attach the token, and protected pages redirect if unauthenticated. Prop-drilling this through the component tree would be impractical — global state is the right call.

---

**Q: What is `bootstrapSession` and when does it run?**

A: On page load, the browser has an HTTP-only refresh token cookie but no access token (access tokens live in memory and are lost on refresh). `bootstrapSession` calls `POST /auth/refresh` to exchange the refresh cookie for a new access token, then stores the user + token in Zustand. It runs once in the app root (`useEffect` with `[]`). The `isBootstrapped` flag prevents rendering protected content until the check completes — otherwise the app would briefly show a logged-out state.

---

**Q: Why is the access token stored in memory (Zustand) instead of `localStorage`?**

A: `localStorage` is accessible to any JavaScript on the page, including injected scripts (XSS attacks). An attacker who achieves XSS could steal the token and use it elsewhere. Storing it in memory means it can't be read by `document.cookie`, `localStorage`, or any other persistent browser API — it disappears on page refresh, which is why `bootstrapSession` is needed.

---

## API Layer & Axios

**Q: What is an Axios interceptor and what does this project use it for?**

A: Interceptors let you run logic on every request or response before it reaches your code. This project uses a **response interceptor** that watches for 401 errors. When it sees one, it:
1. Pauses the failed request
2. Calls `POST /auth/refresh` to get a new access token
3. Retries the failed request with the new token
4. If refresh fails, redirects to home and clears auth state

A queue is used to deduplicate concurrent 401s — if 3 requests fail simultaneously, only one refresh call is made and all 3 are retried after.

---

**Q: What does `withCredentials: true` on the Axios instance mean?**

A: It tells Axios (and the browser) to include cookies in cross-origin requests. Without it, the HTTP-only refresh token cookie would not be sent to the backend. This must be paired with `AllowCredentials()` on the backend CORS config — browsers block credentialed requests to origins that haven't explicitly allowed them.

---

**Q: What is the difference between a query parameter, a route parameter, and a request body?**

A:
- **Route parameter**: part of the URL path — `/movies/{id}` where `id` is extracted from the path. Used to identify a resource.
- **Query parameter**: appended to the URL — `/schedules?date=2026-05-30`. Used for filtering, sorting, pagination.
- **Request body**: data in the HTTP body (JSON), used for POST/PUT when sending structured data. Not visible in the URL.

---

**Q: What HTTP methods does this project use and what are they semantically for?**

A:
- `GET` — read data, no side effects
- `POST` — create a new resource
- `PUT` — replace/update an existing resource (usually full replacement)
- `PATCH` — partial update (e.g., changing a single seat's type)
- `DELETE` — remove a resource

REST conventions: `GET /movies` (list), `GET /movies/{id}` (one), `POST /movies` (create), `PUT /movies/{id}` (update), `DELETE /movies/{id}` (delete).

---

## Forms & Validation

**Q: What is React Hook Form's `register` function?**

A: `register("fieldName")` returns `{ name, ref, onChange, onBlur }` props that you spread onto an input. This connects the input to RHF's internal tracking without making it a controlled component using `useState` — RHF uses uncontrolled inputs with refs, which is more performant. On submit, RHF collects all values from the DOM refs at once.

---

**Q: What is `handleSubmit` from React Hook Form?**

A: It wraps your submit handler. It first runs validation (via Zod or other resolvers), and only calls your handler function if validation passes. It also prevents the default form submission (page reload) and provides the validated form data as a typed object to your handler.

---

**Q: What is FluentValidation on the backend and how does it mirror Zod on the frontend?**

A: FluentValidation is a .NET library for defining validation rules on request DTOs in a fluent syntax:
```csharp
RuleFor(x => x.Email).NotEmpty().EmailAddress();
RuleFor(x => x.Password).MinimumLength(8);
```
Both Zod and FluentValidation provide the same guarantee — data is validated before business logic runs. Zod runs in the browser (fast feedback), FluentValidation runs on the server (authoritative). You should validate on both: frontend for UX, backend because you can never trust client input.

---

## Payments (Stripe)

**Q: What is a PaymentIntent and why does the project create one server-side?**

A: A Stripe PaymentIntent represents the intent to collect a payment. The server creates it with the amount/currency/metadata and returns a `client_secret` to the frontend. The frontend uses this secret with Stripe.js to collect card details and confirm the payment. Creating it server-side is critical: the server determines the amount, so the client can't manipulate the price.

---

**Q: What is a Stripe webhook and what does this project use it for?**

A: A webhook is a POST request Stripe sends to your server when an event happens (e.g., payment succeeded, payment failed). The project's `POST /api/stripe/webhook` receives these events. On `payment_intent.succeeded`, it marks the corresponding tickets as sold and creates `UserTicket` records with confirmation codes. The webhook must verify the signature (`Stripe-Signature` header) to ensure it came from Stripe and not a forged request.

---

**Q: Why is the multi-ticket payment intent separate from the single-ticket one?**

A: When booking multiple seats, you want one transaction that covers all of them. The `create-multi-payment-intent` endpoint calculates the total across all selected tickets. If it were separate payments, you'd have partial-booking problems — some seats paid, some not. One intent = one atomic transaction.

---

**Q: What are Stripe Elements and why use them instead of building a card form yourself?**

A: Stripe Elements are pre-built, PCI-compliant UI components that handle card input. Card numbers are entered directly into Stripe's iframes and never touch your server — your server only sees a payment intent ID. Building your own card form would require PCI DSS Level 1 compliance, which is complex and expensive. Stripe handles the sensitive data so you don't have to.

---

## File Uploads & S3

**Q: What is S3 (or Filebase in this project) and how does file upload work?**

A: S3 is Amazon's object storage service — you store files (blobs) identified by keys, accessed via URLs. Filebase is an S3-compatible service. The upload flow:
1. Frontend sends the file as `multipart/form-data` to `POST /api/uploads/avatar` or `/poster`
2. Backend receives the bytes, uploads to Filebase via the AWS SDK using the configured bucket/credentials
3. Returns the public URL
4. Frontend stores this URL as the user's `avatarPath` or movie's poster

Files are never stored on the API server's disk — the server is stateless.

---

**Q: Why is `multipart/form-data` used for file uploads instead of JSON?**

A: JSON is text-based and can't efficiently encode binary data (base64 encoding inflates file size ~33%). `multipart/form-data` can send raw binary chunks alongside text fields in the same request. The browser's `FormData` API handles encoding.

---

## Docker & Deployment

**Q: What is Docker Compose and what does it do in this project?**

A: Docker Compose defines and runs multi-container applications. This project's `docker-compose.yml` defines two services: the .NET backend and MySQL. It specifies how they connect (shared `marquee-network`), environment variables (from `.env`), health checks (the backend waits until MySQL is ready), and volume mounts. Running `docker-compose up` starts both services with proper configuration without manual setup.

---

**Q: What is a Docker health check and why does the backend service use one for MySQL?**

A: MySQL takes a few seconds to be ready after its container starts. The backend's `depends_on` with `condition: service_healthy` tells Docker to not start the backend until MySQL passes its health check (`mysqladmin ping`). Without this, the backend might crash on startup because it can't connect to MySQL yet. This is also why the startup migration code has retry logic.

---

**Q: What is the purpose of the `.env.example` file?**

A: It documents all required environment variables without exposing actual secrets. Developers copy it to `.env`, fill in real values, and the `.env` file is gitignored. This prevents secrets from being committed to the repo while still documenting what configuration is needed.

---

**Q: What is `seed.py` in this project?**

A: It's a Python script that populates the database with initial data (movies, schedules, rooms, seats, etc.) for development/demo purposes. Instead of manually inserting rows or writing a C# seeder, a simple script calls the API or inserts directly into the database to get realistic test data quickly.

---

## General Full-Stack Concepts

**Q: What is the difference between authentication and authorization?**

A: 
- **Authentication**: verifying identity — "who are you?" (login, JWT validation)
- **Authorization**: verifying permission — "are you allowed to do this?" (role checks, `.RequireAuthorization("Admin")`)

Authentication happens first. Authorization uses the authenticated identity to make access decisions.

---

**Q: What is an HTTP-only cookie and what attack does it prevent?**

A: An HTTP-only cookie cannot be read by JavaScript (`document.cookie` won't see it). It's automatically sent by the browser on matching requests. This prevents XSS attacks from stealing the cookie — even if an attacker injects malicious JS, they can't extract the token. The `Secure` flag additionally ensures it's only sent over HTTPS.

---

**Q: What is the difference between 401 Unauthorized and 403 Forbidden?**

A: 
- **401**: the request lacks valid authentication — the user is not logged in or the token is invalid/expired. Should prompt re-authentication.
- **403**: the user is authenticated but doesn't have permission for this action — a regular user trying to access admin endpoints.

---

**Q: What is a confirmation code in the context of ticket booking?**

A: After a successful payment, the webhook creates a `UserTicket` record with a unique `ConfirmationCode` (e.g., a GUID or random string). This code is shown to the user and emailed via SendGrid. At the cinema, staff can look up the booking by this code. It's unique (enforced by a database unique index) and unguessable.

---

**Q: What is TypeScript and why use it over plain JavaScript?**

A: TypeScript is a superset of JavaScript that adds static types. The compiler catches type errors before runtime — e.g., calling `.toUpperCase()` on a number, or missing a required prop. In this project, API response shapes are typed so the frontend knows exactly what fields are available. Types also make refactoring safer and IDE autocomplete more useful.

---

**Q: What is lazy loading in the context of images vs. route components?**

A: 
- **Route lazy loading** (`React.lazy`): the JS bundle for a page is only downloaded when that page is visited — reduces initial bundle size.
- **Image lazy loading** (`loading="lazy"` on `<img>`): images below the fold aren't downloaded until the user scrolls near them — reduces initial page load time and bandwidth.

Both are performance optimizations reducing what the browser downloads upfront.

---

**Q: What is a soft delete vs hard delete and what are the tradeoffs?**

A: Soft delete sets `IsActive = false` instead of removing the row. Tradeoffs:
- **Pro**: data is preserved for auditing, foreign keys remain valid (schedules referencing a soft-deleted movie don't break), easy to undo
- **Con**: queries must always filter `WHERE IsActive = 1`, the table grows indefinitely, unique indexes may conflict if you want to reuse values

Hard delete is simpler but permanent. This project uses soft delete for movies.

---

**Q: What is TMDB and how is it integrated?**

A: TMDB (The Movie Database) is a public movie API. This project uses a separate predictor service that wraps TMDB for movie search/recommendations. Users can save "favorite movies" from TMDB by their `tmdbId` — these are stored in `UserFavoriteMovie` and displayed on the user's profile. This allows the app to reference a much larger movie catalog than what's manually entered in the local database.

---

**Q: Walk through the full booking flow from clicking a seat to getting a confirmation code.**

A:
1. User navigates to `MovieDetails`, picks a schedule
2. `SeatSelection` page loads — frontend calls `GET /api/tickets/schedule/{scheduleId}` to get all seats with their status (available/sold)
3. User clicks seats — frontend tracks selected ticket IDs in local state
4. User proceeds to `PaymentPage` — frontend calls `POST /api/stripe/create-multi-payment-intent` with the ticket IDs
5. Backend validates tickets are available, calculates total, creates a Stripe PaymentIntent, returns `clientSecret`
6. User enters card details via Stripe Elements, which sends card data directly to Stripe
7. Stripe confirms payment, fires a `payment_intent.succeeded` webhook to `POST /api/stripe/webhook`
8. Backend webhook handler finds the tickets by payment intent metadata, marks them as sold, creates `UserTicket` records with unique confirmation codes
9. User is redirected to `ConfirmationPage` which polls/displays the confirmation code

---

**Q: What are environment variables and why are they used instead of hardcoding values?**

A: Environment variables are configuration values injected at runtime from outside the application code. They allow the same binary to behave differently in dev/staging/prod without code changes. Critically, secrets (JWT keys, Stripe keys, database passwords) must never be in source code — if your repo is public or ever leaked, hardcoded secrets are permanently compromised. Environment variables keep secrets out of git.

---

**Q: What is SendGrid and what is it used for in this project?**

A: SendGrid is a transactional email service. This project uses it to send:
- Password reset emails (with the reset link)
- Booking confirmation emails (with the confirmation code)

The backend calls SendGrid's API with the recipient, subject, and body. You need an API key configured in the environment. The alternative would be configuring an SMTP server, which SendGrid abstracts away.

---

**Q: What is the difference between `PUT` and `PATCH`?**

A: 
- `PUT` typically replaces the entire resource — you send the full updated object. Missing fields may be cleared.
- `PATCH` partially updates a resource — you only send the fields you want to change.

In this project, `PATCH /api/rooms/{id}/seats/{seatId}` updates just a seat's type, not the entire seat record — a good use of PATCH since you only want to change one field.

---

**Q: What is shadcn/ui and how does it differ from a component library like MUI or Ant Design?**

A: shadcn/ui is not an npm package — it's a collection of copy-paste components built on Radix UI primitives and styled with Tailwind. You run `npx shadcn-ui add button` and it copies the source code into your project. This means you own the code and can customize it freely without fighting library styles. Radix UI handles accessibility (keyboard navigation, ARIA attributes, focus management) while shadcn provides the visual layer.

---

**Q: What is Vite and how is it different from Create React App (webpack)?**

A: Vite is a build tool that uses native ES modules during development — the browser imports modules directly, so there's no bundling during dev. This makes the dev server start near-instant and HMR (hot module replacement) extremely fast regardless of project size. Create React App uses webpack which bundles everything first, getting slower as the project grows. For production, both produce optimized bundles, though Vite uses Rollup (faster than webpack).

---
