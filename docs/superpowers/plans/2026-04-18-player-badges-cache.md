# Video Player + Download Badges + Torrent Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-browser video streaming for torrents, download status badges on movie cards, and 24-hour SQLite caching for Jackett torrent results.

**Architecture:** A new Express streaming route (`/api/stream/:infoHash`) pipes WebTorrent file streams with HTTP Range support. A React player page at `/player/:infoHash` consumes it. Download status (active/completed) is derived from socket context + a lightweight `/api/downloads/ids` endpoint, shared via a `useDownloadStatus` hook used directly in `MovieItem`. Jackett results are cached in a new `torrent_cache` SQLite table with a 24-hour TTL.

**Tech Stack:** Express, WebTorrent (`file.createReadStream`), React 18, React Router v6, TanStack React Query v5, SQLite3, shadcn/ui, Tailwind CSS.

---

## File Structure

**New files:**
- `server/routes/stream.js` — streaming route (range-aware HTTP video streaming)
- `src/pages/player.tsx` — full-screen video player page
- `src/hooks/useDownloadStatus.ts` — hook: `'downloading' | 'downloaded' | null` for a movie ID

**Modified files:**
- `server/db.js` — add `torrent_cache` table
- `server/routes/torrents.js` — add `dbGet` helper + `fetchJackettCached`
- `server/index.js` — export `client`; add `infoHash`+`theMovieDbId` to progress events; add `/api/downloads/ids` route; wire stream router
- `src/context/sockets.tsx` — add `infoHash: string` and `theMovieDbId: number` to `DownloadItem`; initialize in `startDownload`
- `src/services/api.ts` — add `fetchDownloadIds()` method
- `src/components/movie-item.tsx` — add download status badge using `useDownloadStatus`
- `src/pages/downloads.tsx` — add play buttons to active + completed cards
- `src/pages/movie.tsx` — add watch button when download exists
- `src/router.tsx` — add `/player/:infoHash` route

---

## Task 1: Torrent Cache

**Files:**
- Modify: `server/db.js`
- Modify: `server/routes/torrents.js`

### Context

`server/db.js` creates SQLite tables using `db.serialize(() => { db.run(...) })`. `server/routes/torrents.js` has `fetchJackett(title)` and two route handlers that call it. `sqlite3` is callback-based so needs a promisified helper.

- [ ] **Step 1: Add `torrent_cache` table to `server/db.js`**

Open `server/db.js`. Inside the `db.serialize(() => { ... })` block, after the existing `db.run(...)` calls, add:

```js
  db.run(`
    CREATE TABLE IF NOT EXISTS torrent_cache (
      cache_key TEXT PRIMARY KEY,
      results   TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `)
```

- [ ] **Step 2: Add `dbGet` helper and `fetchJackettCached` to `server/routes/torrents.js`**

Open `server/routes/torrents.js`. After the existing imports and before `async function omdbTitleById`, add:

```js
function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
}

const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds

async function fetchJackettCached(cacheKey, title) {
  const now = Math.floor(Date.now() / 1000)
  const cached = await dbGet('SELECT * FROM torrent_cache WHERE cache_key = ?', [cacheKey])
  if (cached && (now - cached.cached_at) < CACHE_TTL) return JSON.parse(cached.results)
  const results = await fetchJackett(title)
  db.run(
    'INSERT OR REPLACE INTO torrent_cache (cache_key, results, cached_at) VALUES (?, ?, ?)',
    [cacheKey, JSON.stringify(results), now]
  )
  return results
}
```

`server/routes/torrents.js` does **not** currently import `db`. Add this import at the top with the other imports:

```js
import db from '../db.js'
```

- [ ] **Step 3: Update route handlers to use `fetchJackettCached`**

In the `router.get('/torrents', ...)` handler, replace the two `fetchJackett(title)` calls with cached versions:

```js
router.get('/torrents', async (req, res) => {
  try {
    const { imdb_id, search, type } = req.query

    if (imdb_id) {
      const title = await omdbTitleById(imdb_id)
      if (!title) return res.json([])
      return res.json(await fetchJackettCached(`imdb:${imdb_id}`, title))
    }

    if (search) {
      const omdbType = type === 'series' ? 'series' : 'movie'
      const title = await omdbTitleBySearch(search, omdbType)
      if (!title) return res.json([])
      return res.json(await fetchJackettCached(`search:${omdbType}:${search}`, title))
    }

    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 4: Verify cache works**

Rebuild and run:
```bash
docker compose up --build -d app
```

Visit a movie detail page that has torrents. Note the response time. Reload the same page — the second load should be noticeably faster (no Jackett request). Check logs:
```bash
docker compose logs app --since 1m
```
You should see no Jackett-related log noise on the second load.

- [ ] **Step 5: Commit**

```bash
git add server/db.js server/routes/torrents.js
git commit -m "feat: add 24h SQLite cache for Jackett torrent results"
```

---

## Task 2: `/api/downloads/ids` Endpoint + Frontend Method

**Files:**
- Modify: `server/index.js`
- Modify: `src/services/api.ts`

### Context

`server/index.js` already has a `GET /api/downloads` route that fetches `downloaded = 1` rows. We need a new endpoint that returns ALL rows (active + completed) with `info_hash`. `src/services/api.ts` has an `http` axios instance with auth interceptor; add a new method to the `API` class.

- [ ] **Step 1: Add `/api/downloads/ids` route to `server/index.js`**

In `server/index.js`, after the existing `app.get('/api/downloads', ...)` handler, add:

```js
app.get('/api/downloads/ids', requireAuth, (req, res) => {
  db.all('SELECT * FROM downloads', (err, rows) => {
    if (err) return res.status(500).send(err)
    res.send(rows)
  })
})
```

- [ ] **Step 2: Add `fetchDownloadIds()` to `src/services/api.ts`**

Inside the `API` class, after `fetchDownloaded()`, add:

```ts
async fetchDownloadIds(): Promise<{ download_id: string; info_hash: string; the_movie_db_id: number; downloaded: number }[]> {
  const res = await http.get('/api/downloads/ids')
  return res.data
}
```

- [ ] **Step 3: Verify endpoint**

Rebuild:
```bash
docker compose up --build -d app
```

Test with curl (replace TOKEN with a valid JWT from localStorage in browser DevTools):
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/downloads/ids
```
Expected: JSON array of download rows, e.g. `[{"download_id":"https://yts.bz/...","info_hash":"887d8b...","the_movie_db_id":12345,"downloaded":1}]`

- [ ] **Step 4: Commit**

```bash
git add server/index.js src/services/api.ts
git commit -m "feat: add /api/downloads/ids endpoint and fetchDownloadIds API method"
```

---

## Task 3: Socket Event Changes — Add `infoHash` + `theMovieDbId`

**Files:**
- Modify: `server/index.js`
- Modify: `src/context/sockets.tsx`

### Context

`server/index.js` has two places that emit `downloaded` progress events: inside `clientAdd()` (for downloads restored on startup) and inside the `socket.on('download', ...)` handler (for new downloads). Both need `infoHash` and `theMovieDbId` added. `src/context/sockets.tsx` defines `DownloadItem` and `startDownload`.

- [ ] **Step 1: Update `clientAdd` in `server/index.js`**

Change the function signature and both the download progress event and the call site. Replace the entire `clientAdd` function:

```js
function clientAdd(info, id, theMovieDbId) {
  client.add(info, { path: config.downloadsPath }, (torrent) => {
    torrent.on('download', () => {
      const downloadData = {
        itemId: id,
        infoHash: torrent.infoHash,
        theMovieDbId,
        peers: torrent.numPeers,
        downloaded: torrent.downloaded,
        timeRemaining: torrent.timeRemaining,
        progress: torrent.progress,
      }
      if (downloadData.progress < 1 && _socket) {
        _socket.emit('downloaded', downloadData)
      }
    })

    torrent.on('done', () => {
      const stmt = db.prepare(`UPDATE downloads SET downloaded = 1 WHERE download_id = ?`)
      stmt.run([id], (_, err) => { if (err) console.log(err) })
      if (_socket) _socket.emit('done', { itemId: id })
    })

    torrent.on('error', (err) => {
      console.log('Torrent error', err)
      if (_socket) _socket.emit('error', err)
    })
  })
}
```

Then update the call site inside `server.listen`:

```js
db.each('SELECT * FROM downloads WHERE downloaded = 0', (err, row) => {
  if (err) console.log(err)
  if (row) clientAdd(row.info_hash, row.download_id, row.the_movie_db_id)
})
```

- [ ] **Step 2: Update `socket.on('download', ...)` handler in `server/index.js`**

Inside the `socket.on('download', (arg) => { ... })` handler, replace the `torrent.on('download', ...)` event:

```js
torrent.on('download', () => {
  if (torrent.progress < 1 && _socket) {
    _socket.emit('downloaded', {
      itemId: arg.itemId,
      infoHash: torrent.infoHash,
      theMovieDbId: arg.theMovieDbId,
      peers: torrent.numPeers,
      downloaded: torrent.downloaded,
      timeRemaining: torrent.timeRemaining,
      progress: torrent.progress,
    })
  }
})
```

- [ ] **Step 3: Update `DownloadItem` type and `startDownload` in `src/context/sockets.tsx`**

Replace the `DownloadItem` type:

```ts
export type DownloadItem = {
  itemId: string
  infoHash: string
  theMovieDbId: number
  title: string
  size: number
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}
```

Replace the `startDownload` function body (keep the same signature):

```ts
function startDownload({ magnet, itemId, theMovieDbId, title, size }: DownloadProps) {
  console.log('[socket] emitting download', { itemId, magnet: String(magnet).slice(0, 100), connected: socket.connected })
  socket.emit('download', { magnet, itemId, theMovieDbId })
  setActiveDownloads(prev => [
    ...prev,
    { itemId, infoHash: '', theMovieDbId, title, size, progress: 0, peers: 0, downloaded: 0, timeRemaining: 0 },
  ])
  toast({ title: 'Download iniciado', description: title })
}
```

The `onProgress` handler already uses `{ ...i, ...value }` spread so it will automatically fill `infoHash` and `theMovieDbId` from the first progress event — no changes needed there.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors. If there are errors about `DownloadItem` missing fields, check that `ActiveDownloadCard` in `src/pages/downloads.tsx` doesn't destructure fields that no longer exist.

- [ ] **Step 5: Commit**

```bash
git add server/index.js src/context/sockets.tsx
git commit -m "feat: add infoHash and theMovieDbId to socket progress events"
```

---

## Task 4: Streaming Endpoint

**Files:**
- Modify: `server/index.js` — export `client`, wire stream router
- Create: `server/routes/stream.js`

### Context

`server/index.js` creates `const client = new WebTorrent()`. We need to export it so `stream.js` can import it. The stream route finds a torrent by `infoHash`, picks the largest video file, and pipes it with HTTP Range support.

- [ ] **Step 1: Export `client` from `server/index.js`**

Change:
```js
const client = new WebTorrent()
```
to:
```js
export const client = new WebTorrent()
```

- [ ] **Step 2: Create `server/routes/stream.js`**

```js
import express from 'express'
import path from 'path'
import { client } from '../index.js'
import requireAuth from '../middleware/auth.js'

const router = express.Router()

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'])
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

router.get('/stream/:infoHash', requireAuth, (req, res) => {
  const { infoHash } = req.params
  const torrent = client.torrents.find(
    t => t.infoHash.toLowerCase() === infoHash.toLowerCase()
  )
  if (!torrent) return res.status(404).json({ error: 'Torrent not found' })

  const file = torrent.files
    .filter(f => VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]

  if (!file) return res.status(404).json({ error: 'No video file found in torrent' })

  const ext = path.extname(file.name).toLowerCase()
  const contentType = MIME_TYPES[ext] ?? 'video/mp4'
  const fileSize = file.length
  const range = req.headers.range

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })
    file.createReadStream({ start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    file.createReadStream().pipe(res)
  }
})

export default router
```

- [ ] **Step 3: Wire the stream router in `server/index.js`**

Add the import near the other route imports at the top:
```js
import streamRouter from './routes/stream.js'
```

Add the route after the other `app.use('/api', ...)` lines:
```js
app.use('/api', streamRouter)
```

- [ ] **Step 4: Rebuild and verify the stream endpoint**

```bash
docker compose up --build -d app
```

Get the `infoHash` of a completed download from the DB:
```bash
docker compose exec app sh -c "sqlite3 /app/db/db.sql 'SELECT info_hash FROM downloads LIMIT 1;'"
```

Test the stream endpoint (replace TOKEN and INFOHASH):
```bash
curl -I -H "Authorization: Bearer TOKEN" http://localhost:3000/api/stream/INFOHASH
```

Expected response headers include:
```
HTTP/1.1 200 OK
Content-Type: video/mp4   (or video/x-matroska)
Accept-Ranges: bytes
Content-Length: <number>
```

If you get 404, the torrent may not be loaded in WebTorrent yet — the server re-adds `downloaded=0` torrents on startup but not completed ones until they're re-seeded. Check `client.torrents` length in logs if needed.

- [ ] **Step 5: Commit**

```bash
git add server/index.js server/routes/stream.js
git commit -m "feat: add /api/stream/:infoHash endpoint with HTTP Range support"
```

---

## Task 5: Player Page + Route

**Files:**
- Create: `src/pages/player.tsx`
- Modify: `src/router.tsx`

### Context

The player is a standalone full-screen page (NOT nested inside `Root`, to avoid the `mx-16` container constraint). It has its own `authLoader` so unauthenticated users are redirected. URL shape: `/player/887d8b...?title=Movie+Name`. The `<video>` element's `src` points to `/api/stream/:infoHash`. If the movie is actively downloading, a progress bar is shown below the player.

- [ ] **Step 1: Create `src/pages/player.tsx`**

```tsx
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useSocketContext } from '@/context/sockets'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/utils/format'
import dayjs from 'dayjs'

export default function PlayerPage() {
  const { infoHash } = useParams<{ infoHash: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const title = searchParams.get('title') ?? 'Sem título'
  const { activeDownloads } = useSocketContext()
  const activeItem = activeDownloads.find(d => d.infoHash === infoHash)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center gap-4 px-6 py-4 bg-slate-900">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Voltar
        </button>
        <h1 className="font-semibold text-lg truncate">{title}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <video
          src={`/api/stream/${infoHash}`}
          controls
          autoPlay
          className="w-full max-w-5xl rounded-lg bg-slate-900"
        />

        {activeItem && (
          <div className="w-full max-w-5xl mt-4 bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Progress value={activeItem.progress * 100} className="h-2 flex-1" />
              <span className="text-sm text-slate-400 min-w-fit">
                {Math.round(activeItem.progress * 100)}%
              </span>
            </div>
            <div className="flex gap-4 text-sm text-slate-400">
              <span>{activeItem.peers} peers</span>
              <span>{formatBytes(activeItem.downloaded)}/{formatBytes(activeItem.size)}</span>
              {activeItem.timeRemaining > 0 && (
                <span>{dayjs(activeItem.timeRemaining).format('HH:mm:ss')}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add player route to `src/router.tsx`**

Add the import near the top with the other page imports:
```ts
import PlayerPage from './pages/player'
```

Add the route as a **sibling** to the existing `'/'` route object (not a child), so it doesn't inherit the Root layout:

```ts
{
  path: '/player/:infoHash',
  element: <PlayerPage />,
  loader: authLoader,
},
```

The full router array becomes:
```ts
const router = createBrowserRouter([
  { path: '/setup', element: <SetupPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/player/:infoHash',
    element: <PlayerPage />,
    loader: authLoader,
  },
  {
    path: '/',
    element: <Root />,
    loader: authLoader,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '', element: <App /> },
      { path: '/movie/:id', element: <Movie />, loader: movieLoader },
      { path: '/tvshow/:id', element: <TvShowPage />, loader: tvShowLoader },
      { path: '/search', element: <SearchPage />, loader: searchLoader },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/downloads', element: <DownloadsPage /> },
    ]
  }
])
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Test in browser**

Rebuild:
```bash
docker compose up --build -d app
```

Navigate manually to `http://localhost:3000/player/INFOHASH?title=Test` (use a real infoHash from the DB). Expected: dark full-screen page with a video player. Clicking the video should start playback. The back button should navigate back.

- [ ] **Step 5: Commit**

```bash
git add src/pages/player.tsx src/router.tsx
git commit -m "feat: add /player/:infoHash page with streaming video player"
```

---

## Task 6: Download Status Badges on Movie Cards

**Files:**
- Create: `src/hooks/useDownloadStatus.ts`
- Modify: `src/components/movie-item.tsx`

### Context

`MovieItem` renders a poster card with title and genres. We add a coloured pill badge at the bottom of the poster image: yellow "⬇ Baixando" if actively downloading, green "✓ Baixado" if completed. The hook calls `useQuery(['download-ids'])` (shared cache across all card instances — React Query deduplicates the fetch).

- [ ] **Step 1: Create `src/hooks/useDownloadStatus.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { useSocketContext } from '@/context/sockets'
import getAPI from '@/services/api'

export type DownloadStatus = 'downloading' | 'downloaded' | null

export function useDownloadStatus(movieId: number): DownloadStatus {
  const { activeDownloads } = useSocketContext()
  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })

  if (activeDownloads.some(d => d.theMovieDbId === movieId)) return 'downloading'
  if (downloadIds?.some(d => d.the_movie_db_id === movieId && d.downloaded === 1)) return 'downloaded'
  return null
}
```

- [ ] **Step 2: Update `src/components/movie-item.tsx`**

Replace the entire file:

```tsx
import { FaDownload } from 'react-icons/fa'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import { useDownloadStatus } from '@/hooks/useDownloadStatus'

interface Props {
  item: TheMovieDbTrendingType
}

function MovieItem({ item }: Props) {
  const downloadStatus = useDownloadStatus(item.id)

  if (!item) return null

  return (
    <a
      href={item.is_movie ? `/movie/${item.id}` : `/tvshow/${item.id}`}
      className="cursor-pointer min-w-[226px] h-[385px] flex-1 bg-gray-700 text-white pt-2 px-0 rounded-sm relative"
    >
      <div className="relative">
        <img alt={item.title} src={item.images.poster_paths.md} className="object-contain m-0 p-0 mx-auto" />
        {downloadStatus && (
          <span className={`absolute bottom-0 left-0 right-0 text-center text-xs font-semibold py-1 ${
            downloadStatus === 'downloaded'
              ? 'bg-green-600 text-white'
              : 'bg-yellow-500 text-black'
          }`}>
            {downloadStatus === 'downloaded' ? '✓ Baixado' : '⬇ Baixando'}
          </span>
        )}
      </div>
      <p className="ml-2 font-semibold whitespace-normal">{item.title}</p>
      <p className="ml-2 font-light text-xs whitespace-normal">{item.genres?.join(', ')}</p>
      <button type="button" className="absolute bottom-2 right-2">
        <FaDownload color="#1884F7" />
      </button>
    </a>
  )
}

export default MovieItem
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Test badges in browser**

Rebuild:
```bash
docker compose up --build -d app
```

Go to the home page. Movies that are in the `downloads` table with `downloaded=1` should show a green "✓ Baixado" badge on their poster. Start a new download — that movie card should show the yellow "⬇ Baixando" badge within seconds.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDownloadStatus.ts src/components/movie-item.tsx
git commit -m "feat: add download status badges to movie cards"
```

---

## Task 7: Play Buttons on Downloads Page + Movie Detail Page

**Files:**
- Modify: `src/pages/downloads.tsx`
- Modify: `src/pages/movie.tsx`

### Context

`downloads.tsx` has `ActiveDownloadCard` (uses `DownloadItem` which now has `infoHash`) and `CompletedTab` (has movie details from `fetchDownloaded`). For the completed tab, get `info_hash` by cross-referencing the `['download-ids']` query.

`movie.tsx` shows movie details. When a download exists, show "▶ Assistir" near the title.

- [ ] **Step 1: Update `ActiveDownloadCard` in `src/pages/downloads.tsx`**

First add `Link` to the react-router-dom import at the top of `downloads.tsx`:
```tsx
import { Link } from 'react-router-dom'
```

`ActiveDownloadCard` receives a `DownloadItem` which now has `infoHash` and `title`. Add a play button:

Replace the `ActiveDownloadCard` function:

```tsx
function ActiveDownloadCard({ item }: { item: DownloadItem }) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{item.title}</p>
        {item.infoHash && (
          <Link
            to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}`}
            className="inline-flex items-center gap-1 bg-white text-black text-sm font-semibold px-3 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            ▶ Assistir
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Progress value={item.progress * 100} className="h-2 flex-1" />
        <span className="text-sm text-slate-400">{Math.round(item.progress * 100)}%</span>
      </div>
      <div className="flex gap-4 text-sm text-slate-400">
        <span className="inline-flex items-center gap-1">
          <FaPeopleArrows /> {item.peers} peers
        </span>
        <span className="inline-flex items-center gap-1">
          <LuFileDown /> {formatBytes(item.downloaded)}/{formatBytes(item.size)}
        </span>
        <span className="inline-flex items-center gap-1">
          <LuTimerReset />
          {item.timeRemaining > 0 ? dayjs(item.timeRemaining).format('HH:mm:ss') : '—'}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `CompletedTab` in `src/pages/downloads.tsx`**

`CompletedTab` needs `info_hash` per movie to build the player URL. Use the existing `['download-ids']` query (deduped by React Query):

Replace the `CompletedTab` function:

```tsx
function CompletedTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => getAPI().fetchDownloaded(),
  })
  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[226px] h-[385px] rounded" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>Nenhum download concluído ainda.</AlertTitle>
        <AlertDescription>Os filmes baixados aparecerão aqui.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {data.map(movie => {
        const row = downloadIds?.find(d => d.the_movie_db_id === movie.id && d.downloaded === 1)
        return (
          <div key={movie.id} className="relative">
            <MovieItem item={movie as TheMovieDbTrendingType} />
            {row && (
              <Link
                to={`/player/${row.info_hash}?title=${encodeURIComponent(movie.title ?? '')}`}
                className="absolute top-2 left-0 right-0 mx-auto w-fit inline-flex items-center gap-1 bg-white text-black text-xs font-semibold px-3 py-1 rounded hover:bg-gray-200 transition-colors z-10"
              >
                ▶ Assistir
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

Add the import for `getAPI` at the top of the file if not already present. The file already has it. Also verify the import for `MovieItem` is present.

- [ ] **Step 3: Update `src/pages/movie.tsx` — add watch button**

`movie.tsx` already imports `useQuery` and `getAPI`. Add only the **new** imports:

```tsx
import { Link } from 'react-router-dom'
import { useSocketContext } from '@/context/sockets'
```

Inside the `movie()` component function, after `const movies = useLoaderData() as TheMovieDbDetailsType`, add:

```tsx
const { data: downloadIds } = useQuery({
  queryKey: ['download-ids'],
  queryFn: () => getAPI().fetchDownloadIds(),
})
const { activeDownloads } = useSocketContext()

const downloadRow = downloadIds?.find(d => d.the_movie_db_id === movies.id)
const activeItem = activeDownloads.find(d => d.theMovieDbId === movies.id)
const watchInfoHash = downloadRow?.info_hash || (activeItem?.infoHash || null)
```

Then in the JSX, after the `<p className="font-semibold text-3xl">{movies.title}</p>` line, add:

```tsx
{watchInfoHash && (
  <Link
    to={`/player/${watchInfoHash}?title=${encodeURIComponent(movies.title ?? '')}`}
    className="mt-2 inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200 transition-colors"
  >
    ▶ Assistir
  </Link>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors. If `movie.title` shows a type error (possibly `string | undefined`), use `movies.title ?? ''`.

- [ ] **Step 5: Rebuild and test end-to-end**

```bash
docker compose up --build -d app
```

Test the full flow:
1. Go to a movie detail page for a movie you've already downloaded → "▶ Assistir" button should appear near the title.
2. Click it → player page opens, video starts playing.
3. Go to Downloads → Concluídos tab → "▶ Assistir" button on the card.
4. Start a new download → Downloads → Em andamento tab shows "▶ Assistir" once `infoHash` arrives (first progress event).
5. Movie cards on home page show "✓ Baixado" or "⬇ Baixando" badges.

- [ ] **Step 6: Commit**

```bash
git add src/pages/downloads.tsx src/pages/movie.tsx
git commit -m "feat: add play buttons on downloads page and movie detail page"
```
