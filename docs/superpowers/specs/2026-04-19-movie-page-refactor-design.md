# Movie Page Refactor Design

**Date:** 2026-04-19
**Status:** Approved

## Goal

Refactor the global layout (navbar + add footer) and fully redesign the movie detail page following the design reference at `docs/movie-ui-refactor/screen.png`. Add a universal SQLite cache for all external API calls. Enrich the movie endpoint with cast, content rating, and runtime data.

## Reference

`docs/movie-ui-refactor/screen.png`

## Scope

- `server/db.js` — add `api_cache` table
- `server/cache.js` — new shared `withCache` utility
- `server/routes/movies.js` — enrich movie endpoint, apply cache to all TMDB calls
- `server/routes/torrents.js` — apply cache to OMDB calls
- `server/routes/subtitles.js` — apply cache to OpenSubtitles calls
- `src/services/types/themoviedb.ts` — extend `TheMovieDbDetailsType`
- `src/pages/root.tsx` — navbar refactor + footer inclusion
- `src/components/footer.tsx` — new footer component
- `src/pages/movie.tsx` — thin coordinator, delegates to sub-components
- `src/components/movie/movie-hero.tsx` — new
- `src/components/movie/movie-cast.tsx` — new
- `src/components/movie/movie-technical-info.tsx` — new
- `src/components/movie/torrents-table.tsx` — new (replaces DownloadItem in movie context)
- `src/components/movie/subtitles-grid.tsx` — new (replaces SubtitleItem list in movie context)
- `README.md` — add TODO section for Watchlist feature

---

## Section 1: Backend — Universal API Cache

### `server/db.js`

Add one new table alongside existing ones:

```sql
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  response  TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);
```

### `server/cache.js` (new file)

Export a single helper:

```js
export async function withCache(key, ttlSeconds, fetchFn)
```

- Checks `api_cache` for `cache_key = key`
- If found and `now - cached_at < ttlSeconds`: return `JSON.parse(response)`
- Otherwise: call `fetchFn()`, write result to `api_cache` (INSERT OR REPLACE), return result
- Cache write errors are logged but do not throw

### Cache TTLs

| Call | TTL |
|---|---|
| TMDB movie/tvshow details | 7 days |
| TMDB `/credits` | 7 days |
| TMDB `/release_dates` | 7 days |
| TMDB trending | 6 hours |
| TMDB search | 1 hour |
| TMDB image config | 24 hours |
| OMDB title lookup | 7 days |
| OpenSubtitles search | 24 hours |

### `server/routes/movies.js` — Movie Enrichment

`GET /api/movie/:id` fetches four things in parallel (all wrapped in `withCache`):

1. `fetchTmdb(/3/movie/:id?language=pt-BR)` — main details
2. `getImageConfig()` — image URL builder (already cached in memory + now also in api_cache)
3. `fetchTmdb(/3/movie/:id/credits)` — cast
4. `fetchTmdb(/3/movie/:id/release_dates)` — content rating

**Cast:** Take first 6 entries from `credits.cast`. For each: `name`, `character`, `profile_path` built using image config `profile_sizes` (use `w185` or `original`). `profile_path` is `null` if the actor has no photo.

**Content rating:** From `release_dates.results`, find the entry where `iso_3166_1 === 'US'`, take the first `release_dates` entry's `certification`. Fall back to `null`.

**New response fields:**

```json
{
  "vote_average": 8.8,
  "runtime": 112,
  "content_rating": "PG-13",
  "production_companies": ["Warner Bros.", "..."],
  "production_countries": ["United States of America"],
  "cast": [
    { "name": "Actor Name", "character": "Character", "profile_path": "https://..." }
  ]
}
```

All TMDB calls in `trending` and `search` routes are also wrapped in `withCache`.

---

## Section 2: TypeScript Types

### `src/services/types/themoviedb.ts`

Add to `TheMovieDbDetailsType`:

```ts
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
```

---

## Section 3: Global Layout

### `src/pages/root.tsx` — Navbar

- Logo image + "TorrentLab" text side by side (replace current icon-only logo)
- Nav links (no icons, clean text): Home, Baixados, Configurações
- Search bar on the right
- No user avatar
- Add `<Footer />` below `<main>`

### `src/components/footer.tsx` (new)

Full-width footer, two sides:

- **Left:** "TorrentLab" bold text + "© 2025 TorrentLab. Software criado para a era digital"
- **Right:** Four `<a href="#">` links — Termos de Serviço, Privacidade, DMCA, Contato

---

## Section 4: Movie Page

### `src/pages/movie.tsx` — Thin Coordinator

Handles:
- `useLoaderData()` for movie data
- `useQuery(['download-ids'])` + `useSocketContext()` for `watchInfoHash`

Renders:
```
<MovieHero movie={movie} watchInfoHash={watchInfoHash} />
<div two-column grid>
  <left column>
    <MovieCast cast={movie.cast} />
    <MovieTechnicalInfo movie={movie} />
  </left>
  <right column>
    <TorrentsTable imdb_id={movie.imdb_id} movieId={movie.id} />
    <SubtitlesGrid subtitles={movie.subtitles} />
  </right>
</div>
```

---

## Section 5: Movie Sub-components

### `src/components/movie/movie-hero.tsx`

Props: `movie: TheMovieDbDetailsType`, `watchInfoHash: string | null`

Layout:
- Full-width backdrop image (`movie.images.backdrop_paths.lg`) with dark gradient overlay
- Left: movie poster (`movie.images.poster_paths.lg`)
- Right: title, `vote_average` badge, `content_rating` badge, runtime formatted as `Xh Ym`, genres + year, overview text
- Buttons row:
  - "Baixar Torrent" — scrolls to `#torrents` section via `<a href="#torrents">`
  - "Adicionar à Lista" — `disabled`, no-op (placeholder)
  - "Assistir" — `<Link to="/player/:infoHash">`, only rendered if `watchInfoHash !== null`

### `src/components/movie/movie-cast.tsx`

Props: `cast: TheMovieDbDetailsType['cast']`

Renders "Elenco Principal" section. Up to 6 cast cards:
- Profile photo (circular) or placeholder avatar if `profile_path` is null
- Actor name (bold)
- Character name (muted)

Hidden entirely if `cast` is empty.

### `src/components/movie/movie-technical-info.tsx`

Props: `movie: TheMovieDbDetailsType`

Renders "Informações Técnicas" section with label/value rows:
- IMDB ID (linked to `https://imdb.com/title/:imdb_id`)
- Produção: `production_companies.join(', ')` or "—"
- País: `production_countries.join(', ')` or "—"

### `src/components/movie/torrents-table.tsx`

Props: `imdb_id: string`, `movieId: number`

Replaces the current `TorrentsList`/`DownloadItem` pattern for the movie page. Table with columns:
- **Qualidade** — parsed from torrent title: "4K Ultra HD" (2160p/4K), "1080p", "720p", or raw title prefix as fallback
- **Formato** — parsed from torrent title: "Blu-ray", "WEB-DL", "WEBRip", "HDTV", or "—"
- **Tamanho** — `formatBytes(item.size)`
- **S/L** — `item.seeders / item.leechers` (green/red colored)
- **Ação** — download button with progress bar inline; shows spinner when downloading

Uses existing `useSocketContext()` and `startDownload()` patterns from `DownloadItem`.
Anchored with `id="torrents"` for the hero scroll link.

### `src/components/movie/subtitles-grid.tsx`

Props: `subtitles: Subtitle[] | undefined`

Replaces the current `SubtitleItem` list. Card grid (3–4 per row) per subtitle entry:
- Language name (`subtitle.attributes.language` uppercased)
- Release name truncated
- Download icon button

Uses existing `api.downloadSubtitles()` + `saveAs` pattern from `SubtitleItem`.
Hidden with empty-state message if no subtitles.

---

## README — Watchlist TODO

Add a `## TODO` section to `README.md`:

```markdown
## TODO

### Watchlist
Allow users to save movies/TV shows to a personal watchlist. The "Adicionar à Lista"
button is already present in the movie page UI as a placeholder. Implementation requires:
- A `watchlist` table in SQLite (user_id, the_movie_db_id, added_at)
- `POST /api/watchlist` and `GET /api/watchlist` endpoints
- Frontend list page showing saved items with remove option
```

---

## Out of Scope

- TV show page redesign (only movie page is touched)
- Watchlist functionality (placeholder button only)
- User avatar in navbar
- Content rating for non-US regions
- Subtitle language flags/icons
