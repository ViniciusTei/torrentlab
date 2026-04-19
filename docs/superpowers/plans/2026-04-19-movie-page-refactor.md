# Movie Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a universal SQLite API cache, enrich the movie endpoint with cast/rating/runtime, refactor the global navbar, add a footer, and redesign the movie detail page into focused sub-components.

**Architecture:** Backend changes come first (cache utility → enriched movie endpoint → apply cache everywhere), then TypeScript types, then UI (footer → navbar → movie sub-components → thin coordinator). Each task is independently committable. No new npm packages required.

**Tech Stack:** Node.js ESM, Express, SQLite3, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Query, Socket.IO client.

---

## File Map

**Created:**
- `server/cache.js` — `withCache(key, ttl, fn)` utility
- `src/components/footer.tsx` — global footer
- `src/components/movie/movie-hero.tsx` — backdrop hero section
- `src/components/movie/movie-cast.tsx` — cast card list
- `src/components/movie/movie-technical-info.tsx` — IMDB/production info
- `src/components/movie/torrents-table.tsx` — structured torrent table
- `src/components/movie/subtitles-grid.tsx` — subtitle card grid

**Modified:**
- `server/db.js` — add `api_cache` table
- `server/routes/movies.js` — cache all TMDB calls, enrich movie endpoint
- `server/routes/torrents.js` — cache OMDB calls
- `server/routes/subtitles.js` — cache OpenSubtitles calls
- `src/services/types/themoviedb.ts` — extend `TheMovieDbDetailsType`
- `src/services/torrents.ts` — add `seeders`/`leechers` to `JackettItem`
- `src/pages/root.tsx` — navbar refactor + Footer inclusion
- `src/pages/movie.tsx` — thin coordinator using sub-components
- `README.md` — add Watchlist TODO section

---

### Task 1: Add `api_cache` table to SQLite schema

**Files:**
- Modify: `server/db.js`

- [ ] **Step 1: Add `api_cache` table creation after the `torrent_cache` block**

Open `server/db.js`. After the `torrent_cache` `db.run(...)` block (line ~38), add:

```js
  db.run(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      response  TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `)
```

The full `db.serialize` block should now end with four tables: `downloads`, `users`, `settings`, `torrent_cache`, `api_cache`.

- [ ] **Step 2: Verify the server starts without errors**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab/server && npm start
```

Expected: server starts on port 5174 with no SQLite errors. Kill with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/db.js
git commit -m "feat: add api_cache table to SQLite schema"
```

---

### Task 2: Create `server/cache.js` with `withCache` utility

**Files:**
- Create: `server/cache.js`

- [ ] **Step 1: Create `server/cache.js`**

```js
import db from './db.js'

function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
}

/**
 * Wraps any async fetch with a SQLite-backed TTL cache.
 * key        — unique string cache key
 * ttlSeconds — how long to consider the cached value fresh
 * fetchFn    — async () => value, called on cache miss
 */
export async function withCache(key, ttlSeconds, fetchFn) {
  const now = Math.floor(Date.now() / 1000)
  const cached = await dbGet('SELECT * FROM api_cache WHERE cache_key = ?', [key])
  if (cached && (now - cached.cached_at) < ttlSeconds) {
    return JSON.parse(cached.response)
  }
  const result = await fetchFn()
  db.run(
    'INSERT OR REPLACE INTO api_cache (cache_key, response, cached_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(result), now],
    (err) => { if (err) console.error('[api-cache] write error:', err.message) }
  )
  return result
}
```

- [ ] **Step 2: Verify the server still starts**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab/server && npm start
```

Expected: starts cleanly. Kill with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/cache.js
git commit -m "feat: add withCache SQLite utility for external API caching"
```

---

### Task 3: Enrich movie endpoint + cache all TMDB calls in `movies.js`

**Files:**
- Modify: `server/routes/movies.js`

This task replaces the entire file. The changes are:
1. Import `withCache`
2. Add TTL constants
3. Wrap `getImageConfig` fetch with `withCache`
4. Cache the genre list in `buildTrendingList`
5. Cache trending and search route fetches
6. Extend `GET /api/movie/:id` to fetch credits + release_dates and include new fields

- [ ] **Step 1: Replace the entire contents of `server/routes/movies.js`**

```js
import express from 'express'
import axios from 'axios'
import { getConfig } from '../config.js'
import { searchSubtitles } from './subtitles.js'
import { withCache } from '../cache.js'

const router = express.Router()
const TMDB_BASE = 'https://api.themoviedb.org'
let tmdbImageConfig = null

const TTL = {
  MOVIE:    7 * 24 * 60 * 60, // 7 days
  TRENDING: 6 * 60 * 60,      // 6 hours
  SEARCH:   1 * 60 * 60,      // 1 hour
  CONFIG:   24 * 60 * 60,     // 24 hours
  SUBS:     24 * 60 * 60,     // 24 hours
}

async function fetchTmdb(path) {
  const config = await getConfig()
  const res = await axios.get(`${TMDB_BASE}${path}`, {
    headers: { accept: 'application/json', Authorization: config.tmdbToken }
  })
  return res.data
}

async function getImageConfig() {
  if (tmdbImageConfig) return tmdbImageConfig
  const data = await withCache('tmdb:configuration', TTL.CONFIG, () => fetchTmdb('/3/configuration'))
  const { base_url, backdrop_sizes, poster_sizes, profile_sizes } = data.images
  tmdbImageConfig = { base_url, backdrop_sizes, poster_sizes, profile_sizes }
  return tmdbImageConfig
}

function buildImages(cfg, backdrop_path, poster_path) {
  return {
    backdrop_paths: {
      sm: `${cfg.base_url}${cfg.backdrop_sizes.find(s => s === 'w300') ?? 'original'}${backdrop_path}`,
      md: `${cfg.base_url}${cfg.backdrop_sizes.find(s => s === 'w700') ?? 'original'}${backdrop_path}`,
      lg: `${cfg.base_url}${cfg.backdrop_sizes.find(s => s === 'w1280') ?? 'original'}${backdrop_path}`,
    },
    poster_paths: {
      sm: `${cfg.base_url}${cfg.poster_sizes.find(s => s === 'w92') ?? 'original'}${poster_path}`,
      md: `${cfg.base_url}${cfg.poster_sizes.find(s => s === 'w185') ?? 'original'}${poster_path}`,
      lg: `${cfg.base_url}${cfg.poster_sizes.find(s => s === 'w780') ?? 'original'}${poster_path}`,
    }
  }
}

function buildProfileUrl(cfg, profile_path) {
  if (!profile_path) return null
  const size = cfg.profile_sizes?.find(s => s === 'w185') ?? 'original'
  return `${cfg.base_url}${size}${profile_path}`
}

async function buildTrendingList(results) {
  const [cfg, genresData] = await Promise.all([
    getImageConfig(),
    withCache('tmdb:genres:movie', TTL.CONFIG, () => fetchTmdb('/3/genre/movie/list')),
  ])
  return results.map(entry => ({
    id: entry.id,
    title: entry.title || entry.original_name || entry.original_title || '',
    overview: entry.overview,
    popularity: entry.popularity,
    release_date: new Date(entry.release_date || entry.first_air_date || '').toLocaleDateString('pt-BR'),
    images: buildImages(cfg, entry.backdrop_path, entry.poster_path),
    genres: entry.genre_ids?.map(id => genresData.genres.find(x => x.id === id)?.name ?? 'Outros'),
    is_movie: entry.media_type === 'movie',
  }))
}

// GET /api/trending?type=all|movie|tv
router.get('/trending', async (req, res) => {
  try {
    const type = req.query.type || 'all'
    const data = await withCache(
      `tmdb:trending:${type}`,
      TTL.TRENDING,
      () => fetchTmdb(`/3/trending/${type}/day?language=pt-BR`)
    )
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/search?q=query
router.get('/search', async (req, res) => {
  try {
    const q = encodeURIComponent(req.query.q || '')
    const data = await withCache(
      `tmdb:search:${q}`,
      TTL.SEARCH,
      () => fetchTmdb(`/3/search/multi?query=${q}&include_adult=false&language=pt-BR&page=1`)
    )
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/movie/:id
router.get('/movie/:id', async (req, res) => {
  try {
    const id = req.params.id
    const [data, cfg, credits, releaseDates, subtitles] = await Promise.all([
      withCache(`tmdb:movie:${id}`, TTL.MOVIE, () => fetchTmdb(`/3/movie/${id}?language=pt-BR`)),
      getImageConfig(),
      withCache(`tmdb:movie:${id}:credits`, TTL.MOVIE, () => fetchTmdb(`/3/movie/${id}/credits`)),
      withCache(`tmdb:movie:${id}:release_dates`, TTL.MOVIE, () => fetchTmdb(`/3/movie/${id}/release_dates`)),
      withCache(`subs:tmdb:${id}`, TTL.SUBS, () => searchSubtitles(id)),
    ])

    const usRelease = releaseDates.results?.find(r => r.iso_3166_1 === 'US')
    const content_rating = usRelease?.release_dates?.[0]?.certification || null

    const cast = (credits.cast || []).slice(0, 6).map(c => ({
      name: c.name,
      character: c.character,
      profile_path: buildProfileUrl(cfg, c.profile_path),
    }))

    res.json({
      id: data.id,
      title: data.title || data.original_title || '',
      overview: data.overview,
      popularity: data.popularity,
      vote_average: data.vote_average ?? 0,
      runtime: data.runtime ?? null,
      release_date: new Date(data.release_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_title,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: data.imdb_id,
      content_rating,
      production_companies: data.production_companies?.map(c => c.name) ?? [],
      production_countries: data.production_countries?.map(c => c.name) ?? [],
      cast,
      is_movie: true,
      is_tv_show: false,
      subtitles,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tvshow/:id
router.get('/tvshow/:id', async (req, res) => {
  try {
    const id = req.params.id
    const [data, cfg, subtitles] = await Promise.all([
      withCache(`tmdb:tvshow:${id}`, TTL.MOVIE, () => fetchTmdb(`/3/tv/${id}?language=pt-BR`)),
      getImageConfig(),
      withCache(`subs:tmdb:${id}`, TTL.SUBS, () => searchSubtitles(id)),
    ])
    res.json({
      id: data.id,
      title: data.name || data.original_name || '',
      overview: data.overview,
      popularity: data.popularity,
      vote_average: data.vote_average ?? 0,
      runtime: null,
      release_date: new Date(data.first_air_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_name,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: null,
      content_rating: null,
      production_companies: data.production_companies?.map(c => c.name) ?? [],
      production_countries: data.production_countries?.map(c => c.name) ?? [],
      cast: [],
      is_movie: false,
      is_tv_show: true,
      subtitles,
      seasons: data.seasons || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { buildImages, getImageConfig, fetchTmdb }
export default router
```

- [ ] **Step 2: Test the movie endpoint returns new fields**

Start the server, then in another terminal:
```bash
curl -s http://localhost:5174/api/movie/550 | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const p=JSON.parse(d); console.log(JSON.stringify({vote_average:p.vote_average,runtime:p.runtime,content_rating:p.content_rating,cast_count:p.cast?.length,production_companies:p.production_companies},null,2))"
```

Expected output includes `vote_average` (number), `runtime` (number or null), `content_rating` (string or null), `cast_count` (up to 6), `production_companies` (array).

- [ ] **Step 3: Commit**

```bash
git add server/routes/movies.js
git commit -m "feat: enrich movie endpoint with cast, content rating, runtime; cache all TMDB calls"
```

---

### Task 4: Cache OMDB calls in `torrents.js` and OpenSubtitles calls in `subtitles.js`

**Files:**
- Modify: `server/routes/torrents.js`
- Modify: `server/routes/subtitles.js`

- [ ] **Step 1: Update `server/routes/torrents.js` — wrap OMDB calls with `withCache`**

Add `import { withCache } from '../cache.js'` at the top (after existing imports).

Replace the two OMDB functions:

```js
async function omdbTitleById(imdbId) {
  return withCache(`omdb:id:${imdbId}`, 7 * 24 * 60 * 60, async () => {
    const config = await getConfig()
    const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${encodeURIComponent(imdbId)}`)
    return res.data.Title || null
  })
}

async function omdbTitleBySearch(searchName, type) {
  return withCache(`omdb:search:${type}:${encodeURIComponent(searchName)}`, 7 * 24 * 60 * 60, async () => {
    const config = await getConfig()
    const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(searchName)}&type=${type}`)
    const results = res.data.Search || []
    const match = results.find(f => f.Title === searchName && f.Type === type)
    return match?.Title || null
  })
}
```

Everything else in the file stays unchanged.

- [ ] **Step 2: Update `server/routes/subtitles.js` — cache the subtitle search route**

Add `import { withCache } from '../cache.js'` at the top.

Replace the `GET /api/subtitles` route handler:

```js
router.get('/subtitles', async (req, res) => {
  try {
    const tmdb_id = req.query.tmdb_id
    const subtitles = await withCache(
      `subs:tmdb:${tmdb_id}`,
      24 * 60 * 60,
      () => searchSubtitles(tmdb_id)
    )
    res.json({ data: subtitles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

The `POST /api/subtitles/download` route is unchanged — downloads are not cached.

- [ ] **Step 3: Restart server and verify it starts cleanly**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab/server && npm start
```

Expected: no import errors. Kill with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/routes/torrents.js server/routes/subtitles.js
git commit -m "feat: cache OMDB and OpenSubtitles API calls"
```

---

### Task 5: Extend TypeScript types

**Files:**
- Modify: `src/services/types/themoviedb.ts`
- Modify: `src/services/torrents.ts`

- [ ] **Step 1: Extend `TheMovieDbDetailsType` in `src/services/types/themoviedb.ts`**

The current `TheMovieDbDetailsType` ends at line 90. Add the new fields before the closing `}`:

```ts
export interface TheMovieDbDetailsType {
  id: number
  title: string
  overview: string
  release_date: string
  popularity: number
  vote_average: number
  runtime: number | null
  content_rating: string | null
  production_companies: string[]
  production_countries: string[]
  cast: Array<{
    name: string
    character: string
    profile_path: string | null
  }>
  is_movie: boolean
  images: {
    backdrop_paths: {
      sm: string
      md: string
      lg: string
    },
    poster_paths: {
      sm: string
      md: string
      lg: string
    }
  }
  genres: string[] | undefined
  imdb_id: string
  is_tv_show: boolean
  subtitles: Subtitle[] | undefined
}
```

- [ ] **Step 2: Add `seeders` and `leechers` to `JackettItem` in `src/services/torrents.ts`**

Replace the `JackettItem` type:

```ts
export type JackettItem = {
  title: string
  guid: string
  link: string | string[]
  size: number
  magneturl?: string
  seeders?: string
  leechers?: string
}
```

Note: Jackett returns these as strings from XML attributes.

- [ ] **Step 3: Run type-check**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab && npx tsc --noEmit 2>&1 | head -30
```

Expected: same pre-existing errors as before this task, no new errors about `vote_average`, `runtime`, `cast`, `seeders`, or `leechers`.

- [ ] **Step 4: Commit**

```bash
git add src/services/types/themoviedb.ts src/services/torrents.ts
git commit -m "feat: extend TheMovieDbDetailsType with cast, rating, runtime fields"
```

---

### Task 6: Create `src/components/footer.tsx`

**Files:**
- Create: `src/components/footer.tsx`

- [ ] **Step 1: Create the footer component**

```tsx
export default function Footer() {
  return (
    <footer className="border-t mt-8 py-6 px-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">TorrentLab</p>
          <p className="text-sm text-muted-foreground">
            © 2025 TorrentLab. Software criado para a era digital
          </p>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Termos de Serviço</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <a href="#" className="hover:text-foreground transition-colors">DMCA</a>
          <a href="#" className="hover:text-foreground transition-colors">Contato</a>
        </nav>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/footer.tsx
git commit -m "feat: add Footer component"
```

---

### Task 7: Refactor navbar in `src/pages/root.tsx` + add Footer

**Files:**
- Modify: `src/pages/root.tsx`

- [ ] **Step 1: Replace the entire contents of `src/pages/root.tsx`**

```tsx
import { Link, Outlet, useNavigation, useNavigate } from "react-router-dom";

import SearchInput from "@/components/search-input";
import { Toaster } from "@/components/ui/toaster";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCounter } from "@/utils/counter";
import Footer from "@/components/footer";

export default function Root() {
  const value = useCounter();
  const navigation = useNavigation();
  const navigate = useNavigate();

  return (
    <>
      {navigation.state === "loading" && <Progress value={value} />}

      <header className="flex items-center h-14 px-16 border-b">
        <div className="flex items-center gap-2 mr-8">
          <img
            src="/bd-logo.svg"
            alt="Logo"
            width="28px"
            height="32px"
          />
          <span className="font-bold text-lg">TorrentLab</span>
        </div>
        <nav className="flex-1">
          <ul className="flex gap-6">
            <li>
              <Link to="/" className="text-sm hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/downloads" className="text-sm hover:text-primary transition-colors">
                Baixados
              </Link>
            </li>
            <li>
              <Link to="/settings" className="text-sm hover:text-primary transition-colors">
                Configurações
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <SearchInput onSearch={(ev) => navigate(`/search?query=${ev}`)} />
        </div>
      </header>

      <main className="flex-1 mx-16">
        <Outlet />
        {["loading", "submiting"].includes(navigation.state) && <Loading />}
        <Toaster />
      </main>

      <Footer />
    </>
  );
}

function Loading() {
  return (
    <div className="px-12 py-4 inline-flex gap-6 w-full">
      <Skeleton className="h-[180px] w-[240px]" />
      <div className="flex-1 h-full w-full">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-[180px] w-full rounded-lg mb-4" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server and verify navbar + footer render**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab && npm run dev
```

Open `http://localhost:5173`. Expected:
- Navbar shows logo image + "TorrentLab" text, three text links (Home, Baixados, Configurações), search bar
- Footer appears at the bottom with TorrentLab branding and four links
- No react-icons imports remaining in root.tsx

- [ ] **Step 3: Commit**

```bash
git add src/pages/root.tsx
git commit -m "feat: refactor navbar, add Footer to global layout"
```

---

### Task 8: Create `src/components/movie/movie-hero.tsx`

**Files:**
- Create: `src/components/movie/movie-hero.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p /home/vinicius.teixiera/Documentos/torrentlab/src/components/movie
```

```tsx
// src/components/movie/movie-hero.tsx
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TheMovieDbDetailsType } from '@/services/types/themoviedb'

interface Props {
  movie: TheMovieDbDetailsType
  watchInfoHash: string | null
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function MovieHero({ movie, watchInfoHash }: Props) {
  return (
    <div className="relative w-full min-h-[420px]">
      {/* Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={movie.images.backdrop_paths.lg}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex gap-8 px-16 py-10 items-end min-h-[420px]">
        <img
          src={movie.images.poster_paths.lg}
          alt={`${movie.title} poster`}
          className="w-40 h-60 object-cover rounded shadow-lg flex-shrink-0"
        />
        <div className="flex flex-col justify-end text-white max-w-2xl pb-2">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2">
            {movie.vote_average > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            )}
            {movie.content_rating && (
              <span className="border border-white/50 text-white text-xs px-2 py-0.5 rounded">
                {movie.content_rating}
              </span>
            )}
            {movie.runtime != null && movie.runtime > 0 && (
              <span className="text-white/70 text-sm">{formatRuntime(movie.runtime)}</span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-1">{movie.title}</h1>
          <p className="text-white/70 text-sm mb-3">
            {movie.genres?.join(', ')} • {movie.release_date}
          </p>
          <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-3">
            {movie.overview}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild>
              <a href="#torrents">Baixar Torrent</a>
            </Button>
            <Button
              variant="outline"
              disabled
              className="border-white/40 bg-transparent text-white hover:bg-white/10 disabled:opacity-60"
            >
              Adicionar à Lista
            </Button>
            {watchInfoHash && (
              <Button asChild variant="secondary">
                <Link
                  to={`/player/${watchInfoHash}?title=${encodeURIComponent(movie.title ?? '')}`}
                >
                  ▶ Assistir
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/movie/movie-hero.tsx
git commit -m "feat: add MovieHero component with backdrop, badges, and action buttons"
```

---

### Task 9: Create `src/components/movie/movie-cast.tsx`

**Files:**
- Create: `src/components/movie/movie-cast.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/movie/movie-cast.tsx
import { TheMovieDbDetailsType } from '@/services/types/themoviedb'

interface Props {
  cast: TheMovieDbDetailsType['cast']
}

export default function MovieCast({ cast }: Props) {
  if (!cast || cast.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Elenco Principal</h2>
      <div className="flex flex-col gap-4">
        {cast.map((member) => (
          <div key={`${member.name}-${member.character}`} className="flex items-center gap-3">
            {member.profile_path ? (
              <img
                src={member.profile_path}
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-sm font-semibold">
                {member.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.character}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/movie/movie-cast.tsx
git commit -m "feat: add MovieCast component"
```

---

### Task 10: Create `src/components/movie/movie-technical-info.tsx`

**Files:**
- Create: `src/components/movie/movie-technical-info.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/movie/movie-technical-info.tsx
import { TheMovieDbDetailsType } from '@/services/types/themoviedb'

interface Props {
  movie: TheMovieDbDetailsType
}

export default function MovieTechnicalInfo({ movie }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Informações Técnicas</h2>
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">IMDB ID</dt>
          <dd className="text-sm">
            {movie.imdb_id ? (
              <a
                href={`https://imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {movie.imdb_id}
              </a>
            ) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Produção</dt>
          <dd className="text-sm">{movie.production_companies?.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">País</dt>
          <dd className="text-sm">{movie.production_countries?.join(', ') || '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/movie/movie-technical-info.tsx
git commit -m "feat: add MovieTechnicalInfo component"
```

---

### Task 11: Create `src/components/movie/torrents-table.tsx`

**Files:**
- Create: `src/components/movie/torrents-table.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/movie/torrents-table.tsx
import { useQuery } from '@tanstack/react-query'
import { FaDownload } from 'react-icons/fa'

import { useSocketContext } from '@/context/sockets'
import Torrents, { JackettItem } from '@/services/torrents'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatBytes } from '@/utils/format'

interface Props {
  imdb_id: string
  movieId: number
}

function parseQuality(title: string): string {
  if (/2160p|4K/i.test(title)) return '4K Ultra HD'
  if (/1080p/i.test(title)) return '1080p'
  if (/720p/i.test(title)) return '720p'
  if (/480p/i.test(title)) return '480p'
  return '—'
}

function parseFormat(title: string): string {
  if (/blu.?ray|bluray/i.test(title)) return 'Blu-ray'
  if (/WEB-DL/i.test(title)) return 'WEB-DL'
  if (/WEBRip/i.test(title)) return 'WEBRip'
  if (/HDTV/i.test(title)) return 'HDTV'
  if (/DVDRip/i.test(title)) return 'DVDRip'
  return '—'
}

function TorrentRow({ item, movieId }: { item: JackettItem; movieId: number }) {
  const { activeDownloads, startDownload } = useSocketContext()
  const active = activeDownloads.find(i => i.itemId === item.guid)
  const pending = !!active

  function handleDownload() {
    startDownload({
      magnet: item.magneturl ?? (Array.isArray(item.link) ? item.link[0] : item.link),
      itemId: item.guid,
      theMovieDbId: movieId,
      title: item.title,
      size: item.size,
    })
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium">{parseQuality(item.title)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{parseFormat(item.title)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">{formatBytes(item.size)}</td>
      <td className="py-3 pr-4 text-sm whitespace-nowrap">
        <span className="text-green-600">{item.seeders ?? '—'}</span>
        <span className="text-muted-foreground mx-0.5">/</span>
        <span className="text-red-500">{item.leechers ?? '—'}</span>
      </td>
      <td className="py-3">
        {pending ? (
          <div className="flex items-center gap-2 min-w-[180px]">
            <Progress value={(active?.progress ?? 0) * 100} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatBytes(active?.downloaded ?? 0)}/{formatBytes(item.size)}
            </span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <FaDownload className="mr-1.5" /> Baixar
          </Button>
        )}
      </td>
    </tr>
  )
}

export default function TorrentsTable({ imdb_id, movieId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['torrents', imdb_id],
    queryFn: () => Torrents({ type: 'movie', imdb_id }),
  })

  return (
    <section id="torrents" className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Torrents Disponíveis</h2>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <Alert variant="destructive">
          <AlertTitle>Sem downloads</AlertTitle>
          <AlertDescription>Nenhum torrent disponível para essa mídia.</AlertDescription>
        </Alert>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Qualidade</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Formato</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Tamanho</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">S/L</th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <TorrentRow key={item.guid} item={item} movieId={movieId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/movie/torrents-table.tsx
git commit -m "feat: add TorrentsTable component with quality/format parsing"
```

---

### Task 12: Create `src/components/movie/subtitles-grid.tsx`

**Files:**
- Create: `src/components/movie/subtitles-grid.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/movie/subtitles-grid.tsx
import { saveAs } from 'file-saver'
import { FaDownload } from 'react-icons/fa'

import { useToast } from '@/components/ui/use-toast'
import { Subtitle } from 'src/services/types/subtitles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import getAPI from '@/services/api'

interface Props {
  subtitles: Subtitle[] | undefined
}

export default function SubtitlesGrid({ subtitles }: Props) {
  const { toast } = useToast()
  const api = getAPI()

  async function handleDownload(subtitle: Subtitle) {
    try {
      const fileId = subtitle.attributes.files[0].file_id
      const response = await api.downloadSubtitles(fileId)
      saveAs(response.link, response.file_name)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar a legenda',
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Legendas</h2>

      {(!subtitles || subtitles.length === 0) && (
        <Alert variant="destructive">
          <AlertTitle>Sem legendas</AlertTitle>
          <AlertDescription>Nenhuma legenda disponível para essa mídia.</AlertDescription>
        </Alert>
      )}

      {subtitles && subtitles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {subtitles.map(subtitle => (
            <button
              key={subtitle.id}
              onClick={() => handleDownload(subtitle)}
              className="flex items-center justify-between gap-2 rounded border p-3 text-left hover:bg-muted/50 transition-colors w-full"
            >
              <div className="overflow-hidden">
                <p className="text-sm font-semibold uppercase">{subtitle.attributes.language}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle.attributes.release}</p>
              </div>
              <FaDownload className="flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/movie/subtitles-grid.tsx
git commit -m "feat: add SubtitlesGrid component"
```

---

### Task 13: Refactor `src/pages/movie.tsx` as thin coordinator

**Files:**
- Modify: `src/pages/movie.tsx`

- [ ] **Step 1: Replace the entire contents of `src/pages/movie.tsx`**

```tsx
import { useLoaderData } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { TheMovieDbDetailsType } from '@/services/types/themoviedb'
import getAPI from '@/services/api'
import { useSocketContext } from '@/context/sockets'
import MovieHero from '@/components/movie/movie-hero'
import MovieCast from '@/components/movie/movie-cast'
import MovieTechnicalInfo from '@/components/movie/movie-technical-info'
import TorrentsTable from '@/components/movie/torrents-table'
import SubtitlesGrid from '@/components/movie/subtitles-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function Movie() {
  const movie = useLoaderData() as TheMovieDbDetailsType

  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })
  const { activeDownloads } = useSocketContext()
  const downloadRow = downloadIds?.find(d => d.the_movie_db_id === movie.id && d.downloaded !== 0)
  const activeItem = activeDownloads.find(d => d.theMovieDbId === movie.id)
  const watchInfoHash = downloadRow?.info_hash ?? activeItem?.infoHash ?? null

  return (
    <div className="-mx-16">
      <MovieHero movie={movie} watchInfoHash={watchInfoHash} />

      <div className="grid grid-cols-[280px_1fr] gap-8 px-16 py-8">
        <aside>
          <MovieCast cast={movie.cast} />
          <MovieTechnicalInfo movie={movie} />
        </aside>
        <main>
          {movie.imdb_id ? (
            <TorrentsTable imdb_id={movie.imdb_id} movieId={movie.id} />
          ) : (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Sem downloads</AlertTitle>
              <AlertDescription>IMDb ID não encontrado para essa mídia.</AlertDescription>
            </Alert>
          )}
          <SubtitlesGrid subtitles={movie.subtitles} />
        </main>
      </div>
    </div>
  )
}

export async function loader({ params }: { params: { id: string } }) {
  const api = getAPI()
  return api.fetchMovieDetails(Number(params.id))
}

export default Movie
```

- [ ] **Step 2: Start both servers and test the full movie page**

Terminal 1:
```bash
cd /home/vinicius.teixiera/Documentos/torrentlab/server && npm start
```

Terminal 2:
```bash
cd /home/vinicius.teixiera/Documentos/torrentlab && npm run dev
```

Navigate to any movie page (e.g. `http://localhost:5173/movie/550`). Verify:
- Hero renders with backdrop image, poster, title, vote badge, runtime, genres
- "Baixar Torrent" scrolls to the torrents section
- "Adicionar à Lista" is visually disabled
- Cast cards appear on the left
- Technical info (IMDB ID link, production, country) appears below cast
- Torrents table shows Quality/Format/Size/S/L columns
- Subtitles render as a card grid

- [ ] **Step 3: Run lint**

```bash
cd /home/vinicius.teixiera/Documentos/torrentlab && npm run lint 2>&1 | grep -v "src/pages/movie.tsx\|src/pages/search.tsx\|src/pages/tvshow.tsx\|src/registerSW"
```

Expected: no new errors in the files changed by this task.

- [ ] **Step 4: Commit**

```bash
git add src/pages/movie.tsx
git commit -m "feat: refactor movie page as thin coordinator with sub-components"
```

---

### Task 14: Update `README.md` with Watchlist TODO

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append the TODO section to the end of `README.md`**

Read the current `README.md` to find the last line, then append:

```markdown

## TODO

### Lista de Favoritos (Watchlist)

Permitir que os usuários salvem filmes e séries em uma lista pessoal de favoritos. O botão "Adicionar à Lista" já está presente na página de detalhes do filme como placeholder visual.

Implementação necessária:
- Tabela `watchlist` no SQLite (`user_id`, `the_movie_db_id`, `media_type`, `added_at`)
- Endpoints `POST /api/watchlist` e `GET /api/watchlist` no servidor
- Página frontend listando os itens salvos com opção de remoção
- Integração do botão "Adicionar à Lista" na `MovieHero` com feedback visual de estado (adicionado/não adicionado)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Watchlist TODO section to README"
```
