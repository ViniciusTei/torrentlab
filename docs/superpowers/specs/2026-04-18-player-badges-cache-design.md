# Video Player + Download Badges + Torrent Cache Design

**Goal:** Stream torrent files in-browser while downloading or after completion, show download status badges on movie cards, and cache Jackett torrent results for 24 hours.

**Architecture:** A new streaming Express route pipes WebTorrent file streams with HTTP Range support. A dedicated player page consumes it. Download status is derived from a lightweight DB endpoint and socket context. Torrent results are cached in SQLite.

**Tech Stack:** Express (range streaming), WebTorrent (`file.createReadStream`), React (`<video>`), SQLite (torrent_cache table), React Query (badge data).

---

## Feature 1: Video Streaming Endpoint

**Route:** `GET /api/stream/:infoHash`

**Behavior:**
1. Find torrent in `client.torrents` by `infoHash` (case-insensitive).
2. If not found, return 404.
3. Among `torrent.files`, pick the largest file whose extension is one of: `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`.
4. If no video file found, return 404.
5. Support HTTP Range requests:
   - Parse `Range: bytes=start-end` header.
   - Respond 206 with `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type`.
   - Pipe `file.createReadStream({ start, end })`.
   - If no Range header, respond 200 with full content.
6. Content-Type derived from file extension: `.mp4` → `video/mp4`, `.mkv` → `video/x-matroska`, `.avi` → `video/x-msvideo`, `.webm` → `video/webm`, others → `video/mp4`.
7. Route is protected by `requireAuth` middleware.

**File:** `server/routes/stream.js` (new)

The WebTorrent `client` instance must be importable from `server/index.js`. Export it: `export { client }`. Import in stream route.

**Completed downloads** are re-added to `client` on startup via `clientAdd()` and remain available via `torrent.files`, so no separate disk-streaming path is needed.

---

## Feature 2: Player Page

**Route:** `/player/:infoHash` (frontend React Router route)

**URL shape:** `/player/887d8b95ea218a46a5b97773c9872d49bf0823aa?title=The+Legend+of+Aang`

**Layout (dark full-page):**
```
[ ← Voltar ]  [ Title ]

[ <video src="/api/stream/:infoHash" controls autoPlay /> ]

[ Progress bar + stats ]  ← only shown if movie is in activeDownloads
```

**Component behavior:**
- Read `infoHash` from `useParams()`.
- Read `title` from `useSearchParams()`.
- Render `<video src={/api/stream/${infoHash}} controls autoPlay className="w-full" />`.
- Check `activeDownloads` from `useSocketContext()` — if item with matching `itemId` exists (itemId = torrent guid, not infoHash), show progress bar with peers, downloaded/size, time remaining. The `downloads` DB row links `download_id` (guid) to `info_hash`, so we match by infoHash via a new `/api/downloads/ids` query.
- Back button navigates to `-1` (browser history back).

**File:** `src/pages/player.tsx` (new)

**Router:** Add `{ path: '/player/:infoHash', element: <PlayerPage /> }` to `src/router.tsx`. Route is inside `requireAuth` guard.

---

## Feature 3: Play Buttons

### Downloads Page

`ActiveDownloadCard` and completed movie cards both get a "▶ Assistir" button.

- **Active downloads:** `DownloadItem` needs `infoHash: string` field added (in addition to `theMovieDbId: number` below). The server emits `infoHash` in the `done` event already. Add it to the `downloaded` progress event too.
- **Completed tab:** `GET /api/downloads/ids` returns `{ download_id, info_hash, the_movie_db_id, downloaded }[]`. Use `info_hash` to build the player URL.

Button: `<Link to={/player/${infoHash}?title=${encodeURIComponent(title)}>▶ Assistir</Link>`

### Movie Detail Page

In `src/pages/movie.tsx`, after the downloads section:
- Call `useQuery(['download-ids'])` → `GET /api/downloads/ids`.
- If a row exists where `the_movie_db_id === movies.id`, show `<Link to={/player/${row.info_hash}?title=${encodeURIComponent(movies.title)}>▶ Assistir</Link>` button near the top of the page.
- Also check `activeDownloads` (from socket context) for an in-progress match.

---

## Feature 4: Download Status Badges on Movie Cards

### Data sources

**Active:** `activeDownloads` from `useSocketContext()`. Add `theMovieDbId: number` to `DownloadItem` type and carry it through `startDownload` and socket progress events.

**Completed:** New `GET /api/downloads/ids` endpoint (also used by player feature). Returns all rows from `downloads` table. Fetched once with React Query key `['download-ids']`, shared across components.

### Badge display

`MovieItem` component gets an optional `downloadStatus?: 'downloading' | 'downloaded'` prop.

Badge overlays the bottom of the poster image:
- `'downloading'` → yellow pill: `⬇ Baixando`
- `'downloaded'` → green pill: `✓ Baixado`

### Propagation

Parent components that render `MovieItem` lists (home page trending, search results, downloads completed tab) pass `downloadStatus` by checking:
1. `activeDownloads.some(d => d.theMovieDbId === item.id)` → `'downloading'`
2. `downloadIds.some(d => d.the_movie_db_id === item.id && d.downloaded === 1)` → `'downloaded'`

A shared hook `useDownloadStatus(movieId: number): 'downloading' | 'downloaded' | null` encapsulates this logic. Lives in `src/hooks/useDownloadStatus.ts`.

---

## Feature 5: Torrent Cache

### DB schema (added to `server/db.js`)

```sql
CREATE TABLE IF NOT EXISTS torrent_cache (
  cache_key TEXT PRIMARY KEY,
  results   TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);
```

`cache_key` values:
- For imdb_id lookups: `imdb:tt1234567`
- For search queries: `search:movie:Avengers`

### Cache logic (in `server/routes/torrents.js`)

```js
const TTL = 24 * 60 * 60  // seconds

async function fetchJackettCached(cacheKey, title) {
  const now = Math.floor(Date.now() / 1000)
  // check cache
  const row = await dbGet('SELECT * FROM torrent_cache WHERE cache_key = ?', [cacheKey])
  if (row && (now - row.cached_at) < TTL) return JSON.parse(row.results)
  // fetch fresh
  const results = await fetchJackett(title)
  db.run('INSERT OR REPLACE INTO torrent_cache (cache_key, results, cached_at) VALUES (?, ?, ?)',
    [cacheKey, JSON.stringify(results), now])
  return results
}
```

Route handlers call `fetchJackettCached('imdb:' + imdb_id, title)` and `fetchJackettCached('search:' + type + ':' + search, title)`.

A promisified `dbGet` helper is needed since `sqlite3` is callback-based:
```js
function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
}
```

---

## New API Endpoint

`GET /api/downloads/ids` — returns all rows from `downloads` table as JSON: `{ download_id, info_hash, the_movie_db_id, downloaded }[]`. Protected by `requireAuth`. Used by player feature and badge feature.

---

## Socket Event Changes

### Server emits (in `server/index.js`)

`downloaded` progress event gains `infoHash` and `theMovieDbId` fields — in **both** the `socket.on('download', ...)` handler and the `clientAdd()` function (which re-adds torrents on startup). For `clientAdd`, `theMovieDbId` is read from the DB row passed in.

```js
_socket.emit('downloaded', {
  itemId: arg.itemId,
  infoHash: torrent.infoHash,
  theMovieDbId: arg.theMovieDbId,
  peers: torrent.numPeers,
  ...
})
```

### Frontend type changes (in `src/context/sockets.tsx`)

```ts
export type DownloadItem = {
  itemId: string
  infoHash: string       // added
  theMovieDbId: number   // added
  title: string
  size: number
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}
```

`startDownload` adds `infoHash: ''` as initial placeholder (filled by first progress event).

---

## Files Created / Modified

| File | Action |
|------|--------|
| `server/routes/stream.js` | Create |
| `server/index.js` | Export `client`; add stream route; add `infoHash` to progress event |
| `server/db.js` | Add `torrent_cache` table |
| `server/routes/torrents.js` | Add cache logic |
| `src/pages/player.tsx` | Create |
| `src/hooks/useDownloadStatus.ts` | Create |
| `src/router.tsx` | Add `/player/:infoHash` route |
| `src/context/sockets.tsx` | Add `infoHash` + `theMovieDbId` to `DownloadItem` |
| `src/services/api.ts` | Add `fetchDownloadIds()` method |
| `src/components/movie-item.tsx` | Add `downloadStatus` badge prop |
| `src/pages/downloads.tsx` | Add play buttons |
| `src/pages/movie.tsx` | Add watch button |
