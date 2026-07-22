# Auth Lab — React + Fastify + Prisma + Docker

Full-stack auth demo with:

- **Frontend:** React 19, Vite 6, TypeScript, TanStack Query, React Router 7
- **Backend:** Node.js 22, Fastify 5, Prisma, Zod
- **Database:** PostgreSQL 16
- **Auth modes:** Basic Auth, JWT Bearer (access + refresh), Google OIDC
- **Tooling:** ESLint 9 + Prettier on both apps

## Quick start (Docker)

```bash
cp .env.example .env
# Fill GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (see below)
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/v1/health |
| Swagger | http://localhost:3000/api/docs |

### Demo credentials

- Admin: `admin@local.dev` / `admin123` → Dashboard, Users, Weather
- User: `demo@local.dev` / `password123` → Weather only
- Google: use “Continue with Google” after configuring OAuth client

## Google OIDC setup

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth client ID** → Application type **Web application**
3. Authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/oauth/google/callback`
4. Copy Client ID / Client Secret into `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/oauth/google/callback
OIDC_FRONTEND_CALLBACK=http://localhost:5173/oauth/callback
```

5. Restart API: `docker compose up -d api`

Flow: FE → `GET /auth/oauth/google/authorize` → Google consent → API callback → app JWT → FE `/oauth/callback`.

## Auth flows

1. **JWT** — Register / Sign in → Bearer access + refresh in memory + `localStorage`
2. **Basic** — “Test Basic Auth” → `Authorization: Basic …` on `/auth/me`
3. **Google OIDC** — Authorization Code + PKCE → API issues app JWTs

## Local development

```bash
docker compose up db -d
```

API (`DATABASE_URL=postgresql://auth:auth@localhost:5432/auth_db?schema=public`):

```bash
cd apps/api
npm install
npx prisma migrate deploy   # apply migrations
npm run db:seed
npm run dev
```

Schema is split across `prisma/schema.prisma` (generator/datasource) and `prisma/models/*.prisma`.  
New schema changes: `npm run prisma:migrate:dev -- --name <change_name>`.

If you previously used `db push` and migrate fails on an existing database, baseline once:

```bash
npx prisma migrate resolve --applied 20260722100000_init
```

Web:

```bash
cd apps/web
npm install
npm run dev
```

## REST surface

```
GET    /api/v1/health
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/auth/oauth/google/authorize
GET    /api/v1/auth/oauth/google/callback
GET    /api/v1/users
GET    /api/v1/users/:id
GET    /api/v1/weather/by-coords
GET    /api/v1/weather/geo/suggest
```

## Weather module

Protected route: `/weather` (menu from Dashboard).

1. Get a free key at [OpenWeatherMap](https://home.openweathermap.org/api_keys)
2. Set in `.env`:

```env
OPENWEATHER_API_KEY=your_key_here
```

3. Restart API. Endpoints (Bearer required):

```
GET /api/v1/weather/by-coords?lat=&lon=
GET /api/v1/weather/geo/suggest?q=
```

## Lint / format

```bash
npm run lint
npm run format
```
