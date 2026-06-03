# Twin Peaks

A cinema booking platform built with React, .NET, and MySQL. Browse movies, select seats, and pay online. Admins can manage movies, rooms, schedules, and users through a built-in dashboard.

The backend and database run in Docker Compose. The frontend runs separately with Vite.

## Stack

**Frontend** -- React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router v7, Stripe.js

**Backend** -- ASP.NET Core 9, Entity Framework Core, MySQL 8, JWT auth, Stripe, SendGrid, AWS S3-compatible storage

**Infrastructure** -- Docker Compose (MySQL + .NET backend)

## Getting started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- .NET 10 SDK (only needed if running the backend outside Docker)

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in the values:

| Variable | Description |
|---|---|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `MYSQL_DATABASE` | Database name |
| `CONNECTIONSTRINGS__DEFAULTCONNECTION` | MySQL connection string |
| `JWT__KEY` | JWT signing key, minimum 32 characters |
| `Google__ClientId` | Google OAuth client ID |
| `Stripe__PublishableKey` | Stripe publishable key |
| `Stripe__SecretKey` | Stripe secret key |
| `Stripe__WebhookSecret` | Stripe webhook signing secret |

### 2. Start the backend

```bash
docker compose up --build
```

The API will be available at `http://localhost:5000`. Database migrations run automatically on startup.

### 3. Start the frontend

```bash
cd cinema-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Features

**Users**
- Browse now playing and upcoming movies
- View trailers and movie details
- Interactive seat selection with room layout
- Stripe-powered checkout
- Purchase history and favorites
- Email/password and Google OAuth login
- Password reset via email

**Admins and staff**
- Movie management (create, edit, delete, attach trailers)
- Room and seat configuration
- Schedule management
- User and role management
- Ticket oversight

## Project structure

```
Cinema-management/
├── cinema-frontend/        # React + Vite SPA
│   └── src/
│       ├── pages/          # Route components and dashboard views
│       ├── components/     # Shared UI components
│       ├── store/          # Zustand auth store
│       ├── schemas/        # Zod validation schemas
│       ├── api.ts          # Axios client with JWT refresh interceptors
│       └── types.ts        # TypeScript interfaces
├── cinema-backend/
│   └── TwinPeaks.API/
│       ├── Routers/        # Minimal API endpoint handlers
│       ├── Services/       # Business logic
│       ├── Validators/     # FluentValidation rules
│       └── Data/           # EF Core DbContext and migrations
├── docker-compose.yml
└── .env.example
```

## Development notes

- The backend uses minimal APIs (no controllers), grouped with `MapGroup`.
- JWT access tokens are short-lived. Refresh tokens are stored in httpOnly cookies.
- Auth endpoints are rate-limited to 10 requests per minute.
- Stripe webhooks handle post-payment ticket confirmation -- the frontend never sends card data to the backend.
- File uploads (movie posters, etc.) go to an S3-compatible bucket via Filebase.
