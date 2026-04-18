# TorrentLab Docker + Settings + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dockerize TorrentLab with Jackett by moving all API calls server-side, then add first-run setup, login, and a settings page for self-hosted deployments.

**Architecture:** Multi-stage Docker build produces a single `app` container (Express serves built Vite frontend + all `/api/*` routes) alongside a `jackett` container. Vite proxies `/api` and `/socket.io` to the backend in dev. In Phase 2, SQLite gains `users` and `settings` tables; JWT auth middleware guards all API routes; the settings page lets the admin configure all external service credentials.

**Tech Stack:** Node.js/Express, React/Vite/TypeScript, SQLite3, Socket.IO, WebTorrent, axios, xml2js, bcrypt, jsonwebtoken (Phase 2), Docker/docker-compose.

---

## File Map

### Phase 1 — Docker + Backend API Proxy

**Create:**
- `server/db.js` — SQLite singleton + schema init (extracted from index.js)
- `server/config.js` — reads env vars with hardcoded fallbacks
- `server/routes/movies.js` — TMDB proxy: `/api/trending`, `/api/search`, `/api/movie/:id`, `/api/tvshow/:id`
- `server/routes/subtitles.js` — OpenSubtitles proxy: `/api/subtitles`, `/api/subtitles/download`; exports `searchSubtitles()` helper
- `server/routes/torrents.js` — Jackett/OMDB proxy: `/api/torrents`
- `Dockerfile` — multi-stage: build frontend → Node.js runtime
- `docker-compose.yml` — app + jackett, bind mounts
- `.dockerignore`

**Modify:**
- `server/index.js` — wire routers, serve `../dist`, update CORS, add body parser, move `/downloads` to `/api/downloads`
- `server/package.json` — add: axios, xml2js, webtorrent, parse-torrent
- `src/services/api.ts` — call `/api/*` directly, remove Movies class dependency
- `src/services/torrents.ts` — call `/api/torrents` instead of Jackett directly
- `src/services/webtorrent.ts` — use `io()` (relative URL)
- `src/services/useServices.ts` — use `api.fetchTorrents()` instead of importing `Torrents`
- `vite.config.ts` — add proxy: `/api` + `/socket.io` → `localhost:5174`

**Delete:**
- `src/services/movies.ts`
- `src/services/subtitles.ts`
- `src/utils/env.ts`

### Phase 2 — Auth + Settings

**Create:**
- `server/middleware/auth.js` — JWT validation middleware
- `server/routes/auth.js` — `/api/auth/setup`, `/api/auth/login`, `/api/auth/me`
- `server/routes/settings.js` — `/api/settings` GET/PUT
- `src/pages/setup.tsx` — first-run admin creation form
- `src/pages/login.tsx` — login form
- `src/pages/settings.tsx` — settings configuration form

**Modify:**
- `server/db.js` — add `users` and `settings` table creation
- `server/config.js` — async `getConfig()` reads from DB with env fallback, seeds on startup
- `server/index.js` — wire auth/settings routes, apply auth middleware, seed settings on start
- `server/package.json` — add: bcrypt, jsonwebtoken
- `src/services/api.ts` — add auth methods + JWT interceptor
- `src/router.tsx` — add `/setup`, `/login`, `/settings` routes + auth guard loader
- `src/pages/root.tsx` — fix settings nav link to `/settings`

---

## Phase 1

### Task 1: Extract DB module

**Files:**
- Create: `server/db.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create `server/db.js`**

```js
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.sql')

const sql = sqlite3.verbose()
const db = new sql.Database(DB_PATH)

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS downloads (
      download_id TEXT PRIMARY KEY,
      info_hash TEXT NOT NULL,
      the_movie_db_id INTEGER,
      downloaded INTEGER NOT NULL CHECK (downloaded IN (0, 1))
    );
  `)
})

export default db
```

- [ ] **Step 2: Update `server/index.js` — replace inline DB setup with import**

Remove these lines from `server/index.js`:
```js
import sqlite3 from 'sqlite3'
const sql = sqlite3.verbose()
const db = new sql.Database('db.sql')
// db.serialize(() => { ... })
```

Add at the top of imports:
```js
import db from './db.js'
```

- [ ] **Step 3: Verify server starts**

```bash
cd server && npm start
```
Expected: `Server running on port 5174` with no errors

- [ ] **Step 4: Commit**

```bash
git add server/db.js server/index.js
git commit -m "refactor: extract SQLite singleton to server/db.js"
```

---

### Task 2: Add config module

**Files:**
- Create: `server/config.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create `server/config.js`**

```js
const config = {
  tmdbToken: process.env.TMDB_TOKEN || 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c',
  omdbApiKey: process.env.OMDB_API_KEY || '6c3ebf7c',
  jackettUrl: process.env.JACKETT_URL || 'http://localhost:9117',
  jackettApiKey: process.env.JACKETT_API_KEY || 'sopqxl8kcm4j0fe7atq4tevsc4kg9kgd',
  subtitlesEmail: process.env.SUBTITLES_EMAIL || '',
  subtitlesPass: process.env.SUBTITLES_PASS || '',
  subtitlesKey: process.env.SUBTITLES_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  port: parseInt(process.env.PORT || '5174'),
  downloadsPath: process.env.DOWNLOADS_PATH || 'downloads',
  metadataPath: process.env.METADATA_PATH || 'metadata',
}

export default config
```

- [ ] **Step 2: Update `server/index.js` to use config**

Add import at top:
```js
import config from './config.js'
```

Replace the Socket.IO CORS:
```js
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
})
```

Replace `'downloads'` path in `clientAdd`:
```js
client.add(info, { path: config.downloadsPath }, (torrent) => {
```

Replace `'metadata'` path in `downloadEvent`:
```js
fs.writeFileSync(path.join(config.metadataPath, `${torrent.infoHash}.torrent`), buf)
```

Replace hardcoded port in `server.listen`:
```js
server.listen(config.port, () => {
```

- [ ] **Step 3: Verify server starts**

```bash
cd server && npm start
```
Expected: `Server running on port 5174`

- [ ] **Step 4: Commit**

```bash
git add server/config.js server/index.js
git commit -m "refactor: extract env config to server/config.js"
```

---

### Task 3: Add TMDB movie routes to backend

**Files:**
- Create: `server/routes/movies.js`
- Modify: `server/package.json`, `server/index.js`

- [ ] **Step 1: Add `axios` to `server/package.json` and install**

```json
{
  "name": "server",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "type": "module",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "axios": "^1.6.8",
    "express": "^4.18.3",
    "socket.io": "^4.7.5",
    "sqlite3": "^5.1.7",
    "websocket": "^1.0.34"
  }
}
```

```bash
cd server && npm install
```

- [ ] **Step 2: Create `server/routes/movies.js`**

```js
import express from 'express'
import axios from 'axios'
import config from '../config.js'

const router = express.Router()
const TMDB_BASE = 'https://api.themoviedb.org'
let tmdbImageConfig = null

async function fetchTmdb(path) {
  const res = await axios.get(`${TMDB_BASE}${path}`, {
    headers: { accept: 'application/json', Authorization: config.tmdbToken }
  })
  return res.data
}

async function getImageConfig() {
  if (tmdbImageConfig) return tmdbImageConfig
  const data = await fetchTmdb('/3/configuration')
  const { base_url, backdrop_sizes, poster_sizes } = data.images
  tmdbImageConfig = { base_url, backdrop_sizes, poster_sizes }
  return tmdbImageConfig
}

function buildImages(cfg, backdrop_path, poster_path) {
  return {
    backdrop_paths: {
      sm: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w300') ?? 'original'}${backdrop_path}`,
      md: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w700') ?? 'original'}${backdrop_path}`,
      lg: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w1280') ?? 'original'}${backdrop_path}`,
    },
    poster_paths: {
      sm: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w92') ?? 'original'}${poster_path}`,
      md: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w185') ?? 'original'}${poster_path}`,
      lg: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w780') ?? 'original'}${poster_path}`,
    }
  }
}

async function buildTrendingList(results) {
  const [cfg, genresData] = await Promise.all([
    getImageConfig(),
    fetchTmdb('/3/genre/movie/list'),
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
    const data = await fetchTmdb(`/3/trending/${type}/day?language=pt-BR`)
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/search?q=query
router.get('/search', async (req, res) => {
  try {
    const q = encodeURIComponent(req.query.q || '')
    const data = await fetchTmdb(`/3/search/multi?query=${q}&include_adult=false&language=pt-BR&page=1`)
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/movie/:id  (subtitles added in Task 5)
router.get('/movie/:id', async (req, res) => {
  try {
    const [data, cfg] = await Promise.all([
      fetchTmdb(`/3/movie/${req.params.id}?language=pt-BR`),
      getImageConfig(),
    ])
    res.json({
      id: data.id,
      title: data.title || data.original_title || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.release_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_title,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: data.imdb_id,
      is_movie: true,
      is_tv_show: false,
      subtitles: [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tvshow/:id  (subtitles added in Task 5)
router.get('/tvshow/:id', async (req, res) => {
  try {
    const [data, cfg] = await Promise.all([
      fetchTmdb(`/3/tv/${req.params.id}?language=pt-BR`),
      getImageConfig(),
    ])
    res.json({
      id: data.id,
      title: data.name || data.original_name || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.first_air_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_name,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: null,
      is_movie: false,
      is_tv_show: true,
      subtitles: [],
      seasons: data.seasons || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { buildImages, getImageConfig, fetchTmdb }
export default router
```

- [ ] **Step 3: Wire movies router in `server/index.js`**

Add at the top of imports:
```js
import moviesRouter from './routes/movies.js'
```

Add after `app.get('/')`:
```js
app.use('/api', moviesRouter)
```

- [ ] **Step 4: Smoke test trending endpoint**

```bash
cd server && npm start &
sleep 2
curl -s "http://localhost:5174/api/trending?type=movie" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const p=JSON.parse(d); console.log('count:', p.length, 'first title:', p[0]?.title)"
kill %1
```
Expected: `count: 20 first title: <some movie name>`

- [ ] **Step 5: Commit**

```bash
git add server/routes/movies.js server/index.js server/package.json server/package-lock.json
git commit -m "feat: add TMDB proxy routes to backend"
```

---

### Task 4: Add OpenSubtitles routes to backend

**Files:**
- Create: `server/routes/subtitles.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create `server/routes/subtitles.js`**

```js
import express from 'express'
import axios from 'axios'
import config from '../config.js'

const router = express.Router()
let subtitleToken = null

const subsApi = axios.create({
  baseURL: 'https://api.opensubtitles.com/api/v1',
  headers: {
    'Api-Key': config.subtitlesKey,
    'User-Agent': 'torrentlab v0.0.1',
  }
})

export async function getSubtitleToken() {
  if (subtitleToken) return subtitleToken
  const auth = await subsApi.post('/login', {
    username: config.subtitlesEmail,
    password: config.subtitlesPass,
  })
  subtitleToken = auth.data.token
  return subtitleToken
}

export async function searchSubtitles(tmdb_id) {
  try {
    const bearer = await getSubtitleToken()
    const result = await subsApi.get('/subtitles', {
      params: { tmdb_id, languages: 'pt-br' },
      headers: { Authorization: `Bearer ${bearer}` }
    })
    return result.data.data || []
  } catch {
    subtitleToken = null
    return []
  }
}

// GET /api/subtitles?tmdb_id=12345
router.get('/subtitles', async (req, res) => {
  try {
    const subtitles = await searchSubtitles(req.query.tmdb_id)
    res.json({ data: subtitles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/subtitles/download
router.post('/subtitles/download', async (req, res) => {
  try {
    const { file_id } = req.body
    const bearer = await getSubtitleToken()
    const result = await subsApi.post('/download', { file_id }, {
      headers: { Authorization: `Bearer ${bearer}` }
    })
    res.json(result.data)
  } catch (err) {
    subtitleToken = null
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: Wire subtitles router + add `express.json()` in `server/index.js`**

Add import:
```js
import subtitlesRouter from './routes/subtitles.js'
```

Add BEFORE the `app.get('/')` line:
```js
app.use(express.json())
app.use('/api', subtitlesRouter)
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/subtitles.js server/index.js
git commit -m "feat: add OpenSubtitles proxy routes to backend"
```

---

### Task 5: Add subtitles to movie/tvshow detail routes

**Files:**
- Modify: `server/routes/movies.js`

- [ ] **Step 1: Update `/api/movie/:id` in `server/routes/movies.js` to fetch subtitles**

Add import at top of `movies.js`:
```js
import { searchSubtitles } from './subtitles.js'
```

Replace the `/movie/:id` handler:
```js
router.get('/movie/:id', async (req, res) => {
  try {
    const data = await fetchTmdb(`/3/movie/${req.params.id}?language=pt-BR`)
    const [cfg, subtitles] = await Promise.all([
      getImageConfig(),
      searchSubtitles(data.id),
    ])
    res.json({
      id: data.id,
      title: data.title || data.original_title || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.release_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_title,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: data.imdb_id,
      is_movie: true,
      is_tv_show: false,
      subtitles,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 2: Update `/api/tvshow/:id` handler similarly**

Replace the `/tvshow/:id` handler:
```js
router.get('/tvshow/:id', async (req, res) => {
  try {
    const data = await fetchTmdb(`/3/tv/${req.params.id}?language=pt-BR`)
    const [cfg, subtitles] = await Promise.all([
      getImageConfig(),
      searchSubtitles(data.id),
    ])
    res.json({
      id: data.id,
      title: data.name || data.original_name || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.first_air_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_name,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: null,
      is_movie: false,
      is_tv_show: true,
      subtitles,
      seasons: data.seasons || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/movies.js
git commit -m "feat: include subtitles in movie/tvshow detail responses"
```

---

### Task 6: Add Jackett + OMDB torrent routes to backend

**Files:**
- Create: `server/routes/torrents.js`
- Modify: `server/package.json`, `server/index.js`

- [ ] **Step 1: Add `xml2js` to `server/package.json` and install**

Add `"xml2js": "^0.6.2"` to the `dependencies` in `server/package.json`, then:

```bash
cd server && npm install
```

- [ ] **Step 2: Create `server/routes/torrents.js`**

```js
import express from 'express'
import axios from 'axios'
import xml from 'xml2js'
import config from '../config.js'

const router = express.Router()

async function fetchOmdb(searchName) {
  const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(searchName)}`)
  return res.data.Search || []
}

async function fetchJackett(imdbId) {
  const url = `${config.jackettUrl}/api/v2.0/indexers/all/results/torznab`
  const res = await axios.get(`${url}?apikey=${config.jackettApiKey}&imdbid=${imdbId}`, {
    responseType: 'text'
  })

  const data = await xml.parseStringPromise(res.data)
  if (data.error) throw new Error(`Jackett error: ${data.error['$'].description}`)
  if (!data.rss?.channel) return []

  const channels = Array.isArray(data.rss.channel) ? data.rss.channel : [data.rss.channel]
  const items = channels
    .filter(c => !!c.item)
    .reduce((acc, chan) => { chan.item.forEach(i => acc.push(i)); return acc }, [])

  return items.map(obj => {
    const flat = {}
    for (const key in obj) {
      flat[key] = Array.isArray(obj[key]) && obj[key].length > 0 ? obj[key][0] : obj[key]
    }
    return flat
  })
}

// GET /api/torrents?imdb_id=tt1234567
// GET /api/torrents?search=Movie+Title&type=movie|series
router.get('/torrents', async (req, res) => {
  try {
    const { imdb_id, search, type } = req.query

    if (imdb_id) {
      return res.json(await fetchJackett(imdb_id))
    }

    if (search) {
      const results = await fetchOmdb(search)
      const omdbType = type === 'series' ? 'series' : 'movie'
      const match = results.find(f => f.Title === search && f.Type === omdbType)
      if (!match) return res.json([])
      return res.json(await fetchJackett(match.imdbID))
    }

    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 3: Wire torrents router in `server/index.js`**

Add import:
```js
import torrentsRouter from './routes/torrents.js'
```

Add with the other router uses:
```js
app.use('/api', torrentsRouter)
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/torrents.js server/index.js server/package.json server/package-lock.json
git commit -m "feat: add Jackett/OMDB torrent proxy routes to backend"
```

---

### Task 7: Update server/index.js — complete restructure

**Files:**
- Modify: `server/index.js`

Move `/downloads` to `/api/downloads`, add static file serving for `dist/`, clean up unused imports.

- [ ] **Step 1: Replace `server/index.js` in full**

```js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { toTorrentFile } from 'parse-torrent'

import db from './db.js'
import config from './config.js'
import moviesRouter from './routes/movies.js'
import subtitlesRouter from './routes/subtitles.js'
import torrentsRouter from './routes/torrents.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
})

const client = new WebTorrent()
let _socket = null

function clientAdd(info, id) {
  client.add(info, { path: config.downloadsPath }, (torrent) => {
    torrent.on('download', () => {
      const downloadData = {
        itemId: id,
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
      if (_socket) _socket.emit('done', 'Download finished')
    })

    torrent.on('error', (err) => {
      console.log('Torrent error', err)
      if (_socket) _socket.emit('error', err)
    })
  })
}

app.use(express.json())
app.use('/api', moviesRouter)
app.use('/api', subtitlesRouter)
app.use('/api', torrentsRouter)

app.get('/api/downloads', (req, res) => {
  db.all('SELECT * FROM downloads WHERE downloaded = 1', (err, rows) => {
    if (err) return res.status(500).send(err)
    res.send(rows)
  })
})

// Serve built frontend (only when dist/ exists — i.e., in Docker)
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

io.on('connection', (socket) => {
  _socket = socket
  socket.on('download', (arg) => {
    client.add(arg.magnet, { path: config.downloadsPath }, (torrent) => {
      const buf = toTorrentFile({ infoHash: torrent.infoHash })
      fs.mkdirSync(config.metadataPath, { recursive: true })
      fs.writeFileSync(path.join(config.metadataPath, `${torrent.infoHash}.torrent`), buf)
      const stmt = db.prepare('INSERT INTO downloads VALUES (?, ?, ?, ?);')
      stmt.run(arg.itemId, torrent.infoHash, arg.theMovieDbId, 0, (_, err) => {
        if (err) console.log(err)
      })

      torrent.on('download', () => {
        if (torrent.progress < 1 && _socket) {
          _socket.emit('downloaded', {
            itemId: arg.itemId,
            peers: torrent.numPeers,
            downloaded: torrent.downloaded,
            timeRemaining: torrent.timeRemaining,
            progress: torrent.progress,
          })
        }
      })
      torrent.on('done', () => {
        const stmt = db.prepare('UPDATE downloads SET downloaded = 1 WHERE download_id = ?')
        stmt.run([arg.itemId], (_, err) => { if (err) console.log(err) })
        if (_socket) _socket.emit('done', 'Download finished')
      })
      torrent.on('error', (err) => {
        if (_socket) _socket.emit('error', err)
      })
    })
  })
  socket.on('ready', () => console.log('Client ready'))
})

server.listen(config.port, () => {
  db.each('SELECT * FROM downloads WHERE downloaded = 0', (err, row) => {
    if (err) console.log(err)
    if (row) clientAdd(row.info_hash, row.download_id)
  })
  console.log(`Server running on port ${config.port}`)
})

server.on('close', () => {
  _socket = null
  client.destroy()
  db.close()
})
```

- [ ] **Step 2: Add webtorrent and parse-torrent to `server/package.json`**

Add to dependencies:
```json
"parse-torrent": "^10.0.0",
"webtorrent": "^2.1.37"
```

```bash
cd server && npm install
```

- [ ] **Step 3: Verify server starts and routes respond**

```bash
cd server && npm start &
sleep 2
curl -s http://localhost:5174/api/trending?type=movie | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log('ok, items:', JSON.parse(d).length)"
kill %1
```
Expected: `ok, items: 20`

- [ ] **Step 4: Commit**

```bash
git add server/index.js server/package.json server/package-lock.json
git commit -m "refactor: restructure server/index.js, add static serving, move to /api/downloads"
```

---

### Task 8: Simplify frontend services

**Files:**
- Modify: `src/services/api.ts`, `src/services/torrents.ts`, `src/services/webtorrent.ts`
- Delete: `src/services/movies.ts`, `src/services/subtitles.ts`, `src/utils/env.ts`

- [ ] **Step 1: Rewrite `src/services/api.ts`**

```typescript
import axios, { AxiosError } from 'axios'
import { TheMovieDbDetailsType, TheMovieDbTrendingType } from './types/themoviedb'
import { JackettItem } from './torrents'
import { SubtitleDownloadResponse } from './types/subtitles'

const http = axios.create()

class API {
  async fetchDownloaded(): Promise<TheMovieDbDetailsType[]> {
    try {
      const result = await http.get<{ the_movie_db_id: number }[]>('/api/downloads')
      const downloaded: TheMovieDbDetailsType[] = []
      for (const d of result.data) {
        const detail = await this.fetchMovieDetails(d.the_movie_db_id)
        downloaded.push(detail)
      }
      return downloaded
    } catch (error) {
      throw error
    }
  }

  async fetchTrendingMovies(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=movie')
    return res.data
  }

  async fetchAllTrending(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=all')
    return res.data
  }

  async fetchTrendingTvShows(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=tv')
    return res.data
  }

  async fetchMovieDetails(movie_id: number): Promise<TheMovieDbDetailsType> {
    try {
      const res = await http.get(`/api/movie/${movie_id}`)
      return res.data
    } catch (error) {
      if (error instanceof AxiosError) throw error
      throw new Error('Algo de errado aconteceu ao tentar buscar os detalhes do filme.')
    }
  }

  async fetchTvShowsDetails(id: number): Promise<TheMovieDbDetailsType> {
    const res = await http.get(`/api/tvshow/${id}`)
    return res.data
  }

  async searchAll(query: string): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get(`/api/search?q=${encodeURIComponent(query)}`)
    return res.data
  }

  async fetchTorrents(imdb_id: string): Promise<JackettItem[]> {
    const res = await http.get<JackettItem[]>(`/api/torrents?imdb_id=${encodeURIComponent(imdb_id)}`)
    return res.data
  }

  async downloadSubtitles(file_id: number): Promise<SubtitleDownloadResponse> {
    const res = await http.post<SubtitleDownloadResponse>('/api/subtitles/download', { file_id })
    return res.data
  }
}

let globalAPI: API | null = null

function getAPI() {
  if (!globalAPI) globalAPI = new API()
  return globalAPI
}

export default getAPI
```

- [ ] **Step 2: Rewrite `src/services/torrents.ts`**

```typescript
import axios from 'axios'

export type JackettItem = {
  title: string
  guid: string
  link: string | string[]
  size: number
}

interface TorrentProps {
  type: "movie" | "series"
  search?: string
  imdb_id?: string
}

export default async function Torrents(params: TorrentProps): Promise<JackettItem[]> {
  if (params.imdb_id) {
    const res = await axios.get<JackettItem[]>(`/api/torrents?imdb_id=${encodeURIComponent(params.imdb_id)}`)
    return res.data
  }

  if (params.search) {
    const res = await axios.get<JackettItem[]>(`/api/torrents?search=${encodeURIComponent(params.search)}&type=${params.type}`)
    return res.data
  }

  return []
}
```

- [ ] **Step 3: Rewrite `src/services/webtorrent.ts`**

```typescript
import { io } from 'socket.io-client'

const socket = io()

export default socket
```

- [ ] **Step 4: Delete `src/services/movies.ts`, `src/services/subtitles.ts`, `src/utils/env.ts`**

```bash
rm src/services/movies.ts src/services/subtitles.ts src/utils/env.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/services/api.ts src/services/torrents.ts src/services/webtorrent.ts
git rm src/services/movies.ts src/services/subtitles.ts src/utils/env.ts
git commit -m "refactor: simplify frontend services to call /api/* backend routes"
```

---

### Task 9: Update useServices.ts

**Files:**
- Modify: `src/services/useServices.ts`

- [ ] **Step 1: Rewrite `src/services/useServices.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import getAPI from './api'
import { JackettItem } from './torrents'
import { TheMovieDbDetailsType } from './types/themoviedb'

export type MovieDetails = {
  movies: TheMovieDbDetailsType
  downloads: JackettItem[]
}

export default function useServices() {
  const api = getAPI()

  function useHomePageData() {
    return useQuery({
      queryKey: ['home'],
      queryFn: async () => {
        const [trending, movies, tvShows] = await Promise.all([
          api.fetchAllTrending(),
          api.fetchTrendingMovies(),
          api.fetchTrendingTvShows(),
        ])
        return { trending, movies, tvShows }
      }
    })
  }

  function useAllTrending() {
    return useQuery({
      queryKey: ['trending-all'],
      queryFn: () => api.fetchAllTrending(),
    })
  }

  function useMovieDetails(movie: number) {
    return useQuery({
      queryKey: ['movie-detail', movie],
      queryFn: async () => {
        const results = await api.fetchMovieDetails(movie)
        const downloads = results.imdb_id ? await api.fetchTorrents(results.imdb_id) : []
        return { movies: results, downloads } as MovieDetails
      },
    })
  }

  return { useAllTrending, useMovieDetails, useHomePageData }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/useServices.ts
git commit -m "refactor: update useServices to use api.fetchTorrents"
```

---

### Task 10: Add Vite proxy config for dev

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5174',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 2: Test dev setup end-to-end**

```bash
# Terminal 1
cd server && npm start

# Terminal 2
npm run dev
```

Open `http://localhost:5173` — trending movies should load. Socket.IO should connect (check browser console for no errors).

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Vite proxy for /api and /socket.io in dev"
```

---

### Task 11: Write Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=frontend /app/dist ./dist

RUN mkdir -p downloads db metadata

WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3000 \
    DOWNLOADS_PATH=/app/downloads \
    METADATA_PATH=/app/metadata \
    DB_PATH=/app/db/db.sql

EXPOSE 3000
CMD ["node", "index.js"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile"
```

---

### Task 12: Write docker-compose.yml and .dockerignore

**Files:**
- Create: `docker-compose.yml`, `.dockerignore`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data/downloads:/app/downloads
      - ./data/db:/app/db
      - ./data/metadata:/app/metadata
    environment:
      - TMDB_TOKEN=${TMDB_TOKEN}
      - OMDB_API_KEY=${OMDB_API_KEY:-6c3ebf7c}
      - JACKETT_URL=http://jackett:9117
      - JACKETT_API_KEY=${JACKETT_API_KEY}
      - SUBTITLES_EMAIL=${SUBTITLES_EMAIL}
      - SUBTITLES_PASS=${SUBTITLES_PASS}
      - SUBTITLES_KEY=${SUBTITLES_KEY}
      - CORS_ORIGIN=*
    depends_on:
      - jackett
    restart: unless-stopped

  jackett:
    image: lscr.io/linuxserver/jackett:latest
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Sao_Paulo
      - AUTO_UPDATE=true
    volumes:
      - ./data/jackett:/config
      - ./data/downloads:/downloads
    ports:
      - "9117:9117"
    restart: unless-stopped
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
server/node_modules
dist
.env
data/
*.log
.git
docs/
```

- [ ] **Step 3: Create `data/` dirs and a `.env.example`**

```bash
mkdir -p data/downloads data/db data/metadata data/jackett
```

Create `.env.example`:
```
TMDB_TOKEN=Bearer eyJ...
OMDB_API_KEY=6c3ebf7c
JACKETT_API_KEY=your_jackett_api_key
SUBTITLES_EMAIL=your@email.com
SUBTITLES_PASS=your_password
SUBTITLES_KEY=your_opensubtitles_api_key
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .dockerignore .env.example
git commit -m "feat: add docker-compose with Jackett and bind mounts"
```

---

### Task 13: Build and test Docker

**Files:** none (smoke test only)

- [ ] **Step 1: Build the Docker image**

```bash
docker compose build
```
Expected: build completes with no errors. Stage 1 runs `npm run build`, stage 2 installs server deps.

- [ ] **Step 2: Start the stack**

```bash
cp .env.example .env
# Edit .env with real values, then:
docker compose up
```
Expected: both `app` and `jackett` containers start. App logs `Server running on port 3000`.

- [ ] **Step 3: Verify frontend loads**

Open `http://localhost:3000` in browser.
Expected: TorrentLab home page loads with trending movies.

- [ ] **Step 4: Verify Jackett UI accessible**

Open `http://localhost:9117` in browser.
Expected: Jackett dashboard loads (first run: set admin password).

- [ ] **Step 5: Stop and commit data/ gitignore**

```bash
docker compose down
echo "data/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore runtime data directory"
```

---

## Phase 2

### Task 14: Add users and settings tables to DB

**Files:**
- Modify: `server/db.js`

- [ ] **Step 1: Update `server/db.js` to create users and settings tables**

```js
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.sql')

const sql = sqlite3.verbose()
const db = new sql.Database(DB_PATH)

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS downloads (
      download_id TEXT PRIMARY KEY,
      info_hash TEXT NOT NULL,
      the_movie_db_id INTEGER,
      downloaded INTEGER NOT NULL CHECK (downloaded IN (0, 1))
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
})

export default db
```

- [ ] **Step 2: Commit**

```bash
git add server/db.js
git commit -m "feat: add users and settings tables to SQLite schema"
```

---

### Task 15: Add bcrypt + jsonwebtoken; add auth routes

**Files:**
- Create: `server/routes/auth.js`
- Modify: `server/package.json`

- [ ] **Step 1: Add deps to `server/package.json` and install**

Add to dependencies:
```json
"bcrypt": "^5.1.1",
"jsonwebtoken": "^9.0.2"
```

```bash
cd server && npm install
```

- [ ] **Step 2: Create `server/routes/auth.js`**

```js
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'torrentlab-dev-secret-change-in-production'

function getUserCount() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) reject(err)
      else resolve(row.count)
    })
  })
}

function findUser(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function createUser(username, password_hash) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash], function(err) {
      if (err) reject(err)
      else resolve(this.lastID)
    })
  })
}

// GET /api/auth/me
router.get('/auth/me', (req, res) => {
  getUserCount().then(count => {
    if (count === 0) return res.json({ firstRun: true })

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return res.json({ authenticated: false })

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      res.json({ authenticated: true, username: payload.username })
    } catch {
      res.json({ authenticated: false })
    }
  }).catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/auth/setup  — only works when no users exist
router.post('/auth/setup', async (req, res) => {
  try {
    const count = await getUserCount()
    if (count > 0) return res.status(403).json({ error: 'Setup already completed' })

    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const password_hash = await bcrypt.hash(password, 12)
    await createUser(username, password_hash)

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const user = await findUser(username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { JWT_SECRET }
export default router
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.js server/package.json server/package-lock.json
git commit -m "feat: add auth routes (setup, login, me)"
```

---

### Task 16: Add JWT auth middleware

**Files:**
- Create: `server/middleware/auth.js`

- [ ] **Step 1: Create `server/middleware/auth.js`**

```js
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../routes/auth.js'

export default function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.slice(7)
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/auth.js
git commit -m "feat: add JWT auth middleware"
```

---

### Task 17: Add settings routes

**Files:**
- Create: `server/routes/settings.js`

- [ ] **Step 1: Create `server/routes/settings.js`**

```js
import express from 'express'
import db from '../db.js'

const router = express.Router()

const SETTINGS_KEYS = [
  'tmdb_token',
  'omdb_api_key',
  'jackett_url',
  'jackett_api_key',
  'subtitles_email',
  'subtitles_pass',
  'subtitles_key',
]

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) reject(err)
      else resolve(Object.fromEntries(rows.map(r => [r.key, r.value])))
    })
  })
}

function upsertSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
      err => err ? reject(err) : resolve()
    )
  })
}

// GET /api/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getAllSettings()
    // mask sensitive values in response
    const masked = { ...settings }
    if (masked.subtitles_pass) masked.subtitles_pass = '••••••••'
    res.json(masked)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/settings
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body
    const validKeys = Object.keys(updates).filter(k => SETTINGS_KEYS.includes(k))
    await Promise.all(validKeys.map(k => upsertSetting(k, updates[k])))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { getAllSettings, upsertSetting, SETTINGS_KEYS }
export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/settings.js
git commit -m "feat: add settings GET/PUT routes"
```

---

### Task 18: Update config.js to read from DB

**Files:**
- Modify: `server/config.js`

Config now exports an async `getConfig()` that reads from the `settings` DB table, falling back to env vars. On first call, it seeds missing keys from env vars.

- [ ] **Step 1: Rewrite `server/config.js`**

```js
import db from './db.js'

const ENV_DEFAULTS = {
  tmdb_token: process.env.TMDB_TOKEN || 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c',
  omdb_api_key: process.env.OMDB_API_KEY || '6c3ebf7c',
  jackett_url: process.env.JACKETT_URL || 'http://localhost:9117',
  jackett_api_key: process.env.JACKETT_API_KEY || 'sopqxl8kcm4j0fe7atq4tevsc4kg9kgd',
  subtitles_email: process.env.SUBTITLES_EMAIL || '',
  subtitles_pass: process.env.SUBTITLES_PASS || '',
  subtitles_key: process.env.SUBTITLES_KEY || '',
}

export async function seedSettings() {
  for (const [key, value] of Object.entries(ENV_DEFAULTS)) {
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
        err => err ? reject(err) : resolve()
      )
    })
  }
}

export async function getConfig() {
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
  const dbSettings = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    tmdbToken: dbSettings.tmdb_token || ENV_DEFAULTS.tmdb_token,
    omdbApiKey: dbSettings.omdb_api_key || ENV_DEFAULTS.omdb_api_key,
    jackettUrl: dbSettings.jackett_url || ENV_DEFAULTS.jackett_url,
    jackettApiKey: dbSettings.jackett_api_key || ENV_DEFAULTS.jackett_api_key,
    subtitlesEmail: dbSettings.subtitles_email || ENV_DEFAULTS.subtitles_email,
    subtitlesPass: dbSettings.subtitles_pass || ENV_DEFAULTS.subtitles_pass,
    subtitlesKey: dbSettings.subtitles_key || ENV_DEFAULTS.subtitles_key,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    port: parseInt(process.env.PORT || '5174'),
    downloadsPath: process.env.DOWNLOADS_PATH || 'downloads',
    metadataPath: process.env.METADATA_PATH || 'metadata',
  }
}

// Synchronous config for values that never come from DB
export const staticConfig = {
  corsOrigin: process.env.CORS_ORIGIN || '*',
  port: parseInt(process.env.PORT || '5174'),
  downloadsPath: process.env.DOWNLOADS_PATH || 'downloads',
  metadataPath: process.env.METADATA_PATH || 'metadata',
}
```

- [ ] **Step 2: Update `server/routes/movies.js` to use `getConfig()` per request**

The routes that use `config.tmdbToken` etc. must now call `getConfig()` to pick up DB changes. Update `fetchTmdb` in `movies.js`:

```js
import { getConfig } from '../config.js'

// Remove: import config from '../config.js'

async function fetchTmdb(path) {
  const config = await getConfig()
  const res = await axios.get(`${TMDB_BASE}${path}`, {
    headers: { accept: 'application/json', Authorization: config.tmdbToken }
  })
  return res.data
}
```

Also invalidate `tmdbImageConfig` cache when config changes (simplest: don't cache it, or set TTL). For now, set `tmdbImageConfig = null` at module level and let it re-fetch. Since the cache is only an optimization, this is acceptable.

- [ ] **Step 3: Update `server/routes/subtitles.js` to use `getConfig()`**

Replace `import config from '../config.js'` and the `subsApi` initialization:

```js
import { getConfig } from '../config.js'

// Remove: const subsApi = axios.create(...)
// Remove: let subtitleToken = null

let subtitleToken = null
let subsApiInstance = null

async function getSubsApi() {
  const config = await getConfig()
  if (!subsApiInstance) {
    subsApiInstance = axios.create({
      baseURL: 'https://api.opensubtitles.com/api/v1',
      headers: { 'Api-Key': config.subtitlesKey, 'User-Agent': 'torrentlab v0.0.1' }
    })
  }
  return { subsApi: subsApiInstance, config }
}

export async function getSubtitleToken() {
  if (subtitleToken) return subtitleToken
  const { subsApi, config } = await getSubsApi()
  const auth = await subsApi.post('/login', {
    username: config.subtitlesEmail,
    password: config.subtitlesPass,
  })
  subtitleToken = auth.data.token
  return subtitleToken
}
```

Also export a `resetSubtitleToken()` to invalidate when settings change:
```js
export function resetSubtitleToken() {
  subtitleToken = null
  subsApiInstance = null
}
```

- [ ] **Step 4: Update `server/routes/torrents.js` to use `getConfig()`**

Replace `import config from '../config.js'` with:
```js
import { getConfig } from '../config.js'
```

Update `fetchOmdb` and `fetchJackett` to call `getConfig()` internally:
```js
async function fetchOmdb(searchName) {
  const config = await getConfig()
  const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(searchName)}`)
  return res.data.Search || []
}

async function fetchJackett(imdbId) {
  const config = await getConfig()
  const url = `${config.jackettUrl}/api/v2.0/indexers/all/results/torznab`
  const res = await axios.get(`${url}?apikey=${config.jackettApiKey}&imdbid=${imdbId}`, {
    responseType: 'text'
  })
  // ... rest unchanged
}
```

- [ ] **Step 5: Commit**

```bash
git add server/config.js server/routes/movies.js server/routes/subtitles.js server/routes/torrents.js
git commit -m "feat: make config read from settings DB with env var fallback"
```

---

### Task 19: Wire auth + settings in server/index.js

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add auth + settings routes and middleware to `server/index.js`**

Add imports:
```js
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import requireAuth from './middleware/auth.js'
import { seedSettings } from './config.js'
import { staticConfig } from './config.js'
```

Replace `import config from './config.js'` (which no longer exists as default export) with `import { staticConfig as config } from './config.js'`

Add routes BEFORE the existing `/api` routes:
```js
app.use('/api', authRouter)
app.use('/api', requireAuth, settingsRouter)
app.use('/api', requireAuth, moviesRouter)
app.use('/api', requireAuth, subtitlesRouter)
app.use('/api', requireAuth, torrentsRouter)
app.get('/api/downloads', requireAuth, (req, res) => { ... })
```

In `server.listen` callback, call `seedSettings()`:
```js
server.listen(config.port, async () => {
  await seedSettings()
  db.each('SELECT * FROM downloads WHERE downloaded = 0', (err, row) => {
    if (err) console.log(err)
    if (row) clientAdd(row.info_hash, row.download_id)
  })
  console.log(`Server running on port ${config.port}`)
})
```

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: wire auth middleware and settings routes in server"
```

---

### Task 20: Add auth to frontend api.ts

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Rewrite `src/services/api.ts` with JWT interceptor and auth methods**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { TheMovieDbDetailsType, TheMovieDbTrendingType } from './types/themoviedb'
import { JackettItem } from './torrents'
import { SubtitleDownloadResponse } from './types/subtitles'

const http = axios.create()

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type AuthMeResponse =
  | { firstRun: true }
  | { authenticated: true; username: string }
  | { authenticated: false }

class API {
  async me(): Promise<AuthMeResponse> {
    const res = await http.get<AuthMeResponse>('/api/auth/me')
    return res.data
  }

  async login(username: string, password: string): Promise<void> {
    const res = await http.post<{ token: string }>('/api/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
  }

  async setup(username: string, password: string): Promise<void> {
    const res = await http.post<{ token: string }>('/api/auth/setup', { username, password })
    localStorage.setItem('token', res.data.token)
  }

  logout(): void {
    localStorage.removeItem('token')
  }

  async fetchDownloaded(): Promise<TheMovieDbDetailsType[]> {
    try {
      const result = await http.get<{ the_movie_db_id: number }[]>('/api/downloads')
      const downloaded: TheMovieDbDetailsType[] = []
      for (const d of result.data) {
        const detail = await this.fetchMovieDetails(d.the_movie_db_id)
        downloaded.push(detail)
      }
      return downloaded
    } catch (error) {
      throw error
    }
  }

  async fetchTrendingMovies(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=movie')
    return res.data
  }

  async fetchAllTrending(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=all')
    return res.data
  }

  async fetchTrendingTvShows(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=tv')
    return res.data
  }

  async fetchMovieDetails(movie_id: number): Promise<TheMovieDbDetailsType> {
    try {
      const res = await http.get(`/api/movie/${movie_id}`)
      return res.data
    } catch (error) {
      if (error instanceof AxiosError) throw error
      throw new Error('Algo de errado aconteceu ao tentar buscar os detalhes do filme.')
    }
  }

  async fetchTvShowsDetails(id: number): Promise<TheMovieDbDetailsType> {
    const res = await http.get(`/api/tvshow/${id}`)
    return res.data
  }

  async searchAll(query: string): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get(`/api/search?q=${encodeURIComponent(query)}`)
    return res.data
  }

  async fetchTorrents(imdb_id: string): Promise<JackettItem[]> {
    const res = await http.get<JackettItem[]>(`/api/torrents?imdb_id=${encodeURIComponent(imdb_id)}`)
    return res.data
  }

  async downloadSubtitles(file_id: number): Promise<SubtitleDownloadResponse> {
    const res = await http.post<SubtitleDownloadResponse>('/api/subtitles/download', { file_id })
    return res.data
  }

  async getSettings(): Promise<Record<string, string>> {
    const res = await http.get<Record<string, string>>('/api/settings')
    return res.data
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    await http.put('/api/settings', settings)
  }
}

let globalAPI: API | null = null

function getAPI() {
  if (!globalAPI) globalAPI = new API()
  return globalAPI
}

export default getAPI
```

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add JWT interceptor and auth/settings methods to frontend api"
```

---

### Task 21: Create setup page

**Files:**
- Create: `src/pages/setup.tsx`

- [ ] **Step 1: Create `src/pages/setup.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import getAPI from '@/services/api'
import { Button } from '@/components/ui/button'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await getAPI().setup(username, password)
      navigate('/')
    } catch {
      setError('Falha ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 bg-slate-900 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Configuração inicial</h1>
        <p className="text-slate-400 text-sm mb-6">Crie a conta de administrador para começar.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/setup.tsx
git commit -m "feat: add first-run setup page"
```

---

### Task 22: Create login page

**Files:**
- Create: `src/pages/login.tsx`

- [ ] **Step 1: Create `src/pages/login.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import getAPI from '@/services/api'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await getAPI().login(username, password)
      navigate('/')
    } catch {
      setError('Usuário ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 bg-slate-900 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">TorrentLab</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/login.tsx
git commit -m "feat: add login page"
```

---

### Task 23: Create settings page

**Files:**
- Create: `src/pages/settings.tsx`

- [ ] **Step 1: Create `src/pages/settings.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import getAPI from '@/services/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

type Settings = {
  tmdb_token: string
  omdb_api_key: string
  jackett_url: string
  jackett_api_key: string
  subtitles_email: string
  subtitles_pass: string
  subtitles_key: string
}

const LABELS: Record<keyof Settings, string> = {
  tmdb_token: 'TheMovieDB Token',
  omdb_api_key: 'OMDB API Key',
  jackett_url: 'Jackett URL',
  jackett_api_key: 'Jackett API Key',
  subtitles_email: 'OpenSubtitles Email',
  subtitles_pass: 'OpenSubtitles Password',
  subtitles_key: 'OpenSubtitles API Key',
}

const PASSWORD_FIELDS: (keyof Settings)[] = ['subtitles_pass', 'tmdb_token', 'jackett_api_key', 'subtitles_key']

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    getAPI().getSettings().then(data => {
      setSettings(data as Partial<Settings>)
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await getAPI().updateSettings(settings as Record<string, string>)
      toast({ title: 'Configurações salvas', variant: 'default' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    getAPI().logout()
    navigate('/login')
  }

  if (loading) return <div className="text-white p-8">Carregando...</div>

  return (
    <div className="max-w-xl mx-auto py-8 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">Sair</button>
      </div>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {(Object.keys(LABELS) as (keyof Settings)[]).map(key => (
          <div key={key}>
            <label className="block text-sm text-slate-400 mb-1">{LABELS[key]}</label>
            <input
              className="w-full px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
              type={PASSWORD_FIELDS.includes(key) ? 'password' : 'text'}
              value={settings[key] || ''}
              onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/settings.tsx
git commit -m "feat: add settings configuration page"
```

---

### Task 24: Update router.tsx with auth guard and new routes

**Files:**
- Modify: `src/router.tsx`, `src/pages/root.tsx`

- [ ] **Step 1: Rewrite `src/router.tsx`**

```tsx
import { AxiosError } from 'axios'
import { createBrowserRouter, redirect, useRouteError } from 'react-router-dom'

import Root from './pages/root'
import App from './pages/App'
import Movie, { loader as movieLoader } from './pages/movie'
import SearchPage, { loader as searchLoader } from './pages/search'
import TvShowPage, { loader as tvShowLoader } from './pages/tvshow'
import SetupPage from './pages/setup'
import LoginPage from './pages/login'
import SettingsPage from './pages/settings'
import getAPI from './services/api'

async function authLoader() {
  const state = await getAPI().me()
  if ('firstRun' in state && state.firstRun) return redirect('/setup')
  if ('authenticated' in state && !state.authenticated) return redirect('/login')
  return null
}

const router = createBrowserRouter([
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
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
    ]
  }
])

function ErrorBoundary() {
  const error = useRouteError()
  console.trace(error)
  const displayError = () => {
    if (error instanceof AxiosError) return JSON.stringify(error.toJSON(), null, 2)
    return (error as Error).message
  }
  return (
    <div className="flex items-center justify-center gap-2 h-full">
      <section className="p-4">{displayError()}</section>
      <img src="/bugs.svg" width="300px" height="400px" />
    </div>
  )
}

export default router
```

- [ ] **Step 2: Update settings nav link in `src/pages/root.tsx`**

Change the Configuração link from `to="/"` to `to="/settings"`:

```tsx
<Link to="/settings" className="flex gap-1 items-center cursor-pointer">
  <BsGear /> Configuração
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx src/pages/root.tsx
git commit -m "feat: add auth guard and setup/login/settings routes to router"
```

---

### Task 25: End-to-end test Phase 2

- [ ] **Step 1: Test first-run flow in dev**

```bash
# Terminal 1
cd server && npm start

# Terminal 2
npm run dev
```

1. Open `http://localhost:5173` — should redirect to `/setup`
2. Create admin account — should redirect to home with trending movies loading
3. Navigate to `/settings` — should show settings form with current values
4. Open `/login` in incognito — enter credentials — should reach home

- [ ] **Step 2: Test Docker with Phase 2**

```bash
docker compose down -v  # clean slate
docker compose build
docker compose up
```

1. Open `http://localhost:3000` — redirects to `/setup`
2. Create admin — home loads
3. Go to `/settings` — configure Jackett API key (get from `http://localhost:9117`)
4. Search for a movie — torrent results appear

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 2 - auth, settings, first-run wizard"
```
