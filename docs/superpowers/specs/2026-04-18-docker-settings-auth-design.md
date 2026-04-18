# TorrentLab — Docker + Settings + Auth Design

**Date:** 2026-04-18  
**Scope:** Dockerize the app with Jackett, then add backend API proxying, first-run setup, login, and a settings page for self-hosted configuration.

---

## Approach: Phased

### Phase 1 — Docker + Backend API Proxy
### Phase 2 — Auth + Settings UI

Each phase is independently shippable and testable.

---

## Phase 1: Docker + Backend API Proxy

### Architecture

All external API calls move from the frontend (browser) into the Express backend. The frontend becomes a thin client that only talks to the backend — no API keys ever reach the browser.

**Single app container** (multi-stage Dockerfile):
- Stage 1: Build Vite frontend → `dist/`
- Stage 2: Node.js runs Express, serves `dist/` as static files, exposes all API routes

**Jackett container**: `lscr.io/linuxserver/jackett` official image, accessible internally at `http://jackett:9117`.

### New Backend Routes

| Route | Replaces |
|---|---|
| `GET /api/trending` | `src/services/movies.ts` → TheMovieDB |
| `GET /api/search?q=` | `src/services/movies.ts` → TheMovieDB |
| `GET /api/movie/:id` | `src/services/movies.ts` → TheMovieDB |
| `GET /api/tvshow/:id` | `src/services/movies.ts` → TheMovieDB |
| `GET /api/torrents?imdb_id=` | `src/services/torrents.ts` → Jackett + OMDB |
| `GET /api/subtitles?tmdb_id=` | `src/services/subtitles.ts` → OpenSubtitles |
| `POST /api/subtitles/download` | `src/services/subtitles.ts` → OpenSubtitles |

### Frontend Changes

`movies.ts`, `torrents.ts`, `subtitles.ts` become thin Axios wrappers calling `/api/*` instead of external URLs. No external API keys in the frontend bundle.

### Docker Compose Services

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes:
      - ./data/downloads:/app/downloads
      - ./data/db:/app/db
    environment:
      - TMDB_TOKEN=...
      - OMDB_API_KEY=...
      - JACKETT_URL=http://jackett:9117
      - JACKETT_API_KEY=...
      - SUBTITLES_EMAIL=...
      - SUBTITLES_PASS=...
      - SUBTITLES_KEY=...

  jackett:
    image: lscr.io/linuxserver/jackett
    volumes:
      - ./data/jackett:/config
      - ./data/downloads:/downloads
    ports: ["9117:9117"]
```

### Bind Mounts (host `./data/`)

| Host path | Container path | Purpose |
|---|---|---|
| `./data/downloads` | `/app/downloads` | Downloaded torrent files |
| `./data/db` | `/app/db` | SQLite database file |
| `./data/jackett` | `/config` | Jackett config + tracker data |

---

## Phase 2: Auth + Settings

### Auth Flow

1. On first visit, backend `/api/auth/me` returns `{ firstRun: true }` if no admin user exists
2. Frontend redirects to `/setup` — create admin username + password
3. After setup, all routes require a valid JWT
4. Login at `/login` issues a JWT stored in `localStorage`, sent as `Authorization: Bearer` on all API requests
5. Backend validates JWT middleware on all `/api/*` routes

### New SQLite Tables

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### New Backend Routes

| Route | Purpose |
|---|---|
| `POST /api/auth/setup` | Create admin user — only works if no user exists |
| `POST /api/auth/login` | Validate credentials, return JWT |
| `GET /api/auth/me` | Return `{ firstRun, authenticated }` state |
| `GET /api/settings` | Return all settings (requires auth) |
| `PUT /api/settings` | Update one or more settings (requires auth) |

### Settings Managed via UI

| Key | Description | Default source |
|---|---|---|
| `tmdb_token` | TheMovieDB Bearer token | Hardcoded → env var |
| `omdb_api_key` | OMDB API key | Hardcoded |
| `jackett_url` | Jackett base URL | `http://jackett:9117` |
| `jackett_api_key` | Jackett API key | Env var |
| `subtitles_email` | OpenSubtitles email | `.env` `VITE_SUBTITLES_EMAIL` |
| `subtitles_pass` | OpenSubtitles password | `.env` `VITE_SUBTITLES_PASS` |
| `subtitles_key` | OpenSubtitles API key | `.env` `VITE_SUBTITLES_KEY` |

On startup, backend seeds `settings` table from env vars if keys don't exist yet (so docker-compose env vars remain the default source).

### New Frontend Routes

| Path | Purpose |
|---|---|
| `/setup` | First-run wizard: create admin account |
| `/login` | Login form |
| `/settings` | Config form for all settings keys |

Auth guard in `router.tsx` calls `/api/auth/me` on load:
- `firstRun: true` → redirect to `/setup`
- `authenticated: false` → redirect to `/login`
- `authenticated: true` → render the app normally

### Libraries

- Backend: `bcrypt` (password hashing), `jsonwebtoken` (JWT issue/verify)
- Frontend: no new libraries — standard React state + existing Axios instance with auth header

---

## File Structure Changes

```
/
├── Dockerfile              # new — multi-stage build
├── docker-compose.yml      # new
├── .dockerignore           # new
├── server/
│   └── index.js            # extended: new routes, auth middleware, settings DB
└── src/
    ├── router.tsx           # extended: /setup, /login, /settings routes + auth guard
    ├── pages/
    │   ├── setup.tsx        # new
    │   ├── login.tsx        # new
    │   └── settings.tsx     # new
    └── services/
        ├── movies.ts        # simplified: calls /api/* instead of TMDB directly
        ├── torrents.ts      # simplified: calls /api/torrents instead of Jackett
        └── subtitles.ts     # simplified: calls /api/subtitles instead of OpenSubtitles
```
