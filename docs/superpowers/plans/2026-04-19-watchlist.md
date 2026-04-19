# Watchlist Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personal watchlist so users can save movies and TV shows with a toggle button on detail pages and a dedicated `/watchlist` route.

**Architecture:** Backend stores items in a new `watchlist` SQLite table keyed by `username` + `the_movie_db_id`. Three REST endpoints handle CRUD. The frontend shares a single React Query cache (`['watchlist']`) across a reusable `WatchlistButton` component (used in both hero components) and the watchlist page — no global context needed.

**Tech Stack:** Node.js ESM + Express + SQLite3 (backend); React 18 + TypeScript + TanStack React Query v5 + Tailwind + shadcn/ui (frontend).

---

## File Map

| Action   | Path                                          | Responsibility                                      |
|----------|-----------------------------------------------|-----------------------------------------------------|
| Modify   | `server/db.js`                                | Add `watchlist` table migration                     |
| Create   | `server/routes/watchlist.js`                  | GET / POST / DELETE endpoints + DB helpers          |
| Create   | `server/routes/watchlist.test.js`             | Node.js built-in test runner tests for DB helpers   |
| Modify   | `server/index.js`                             | Register watchlist router                           |
| Modify   | `src/services/api.ts`                         | Add `fetchWatchlist`, `addToWatchlist`, `removeFromWatchlist` |
| Create   | `src/hooks/useWatchlist.ts`                   | React Query hook: state + toggle mutation           |
| Create   | `src/components/WatchlistButton.tsx`          | Reusable toggle button (used by both heroes)        |
| Modify   | `src/components/movie/movie-hero.tsx`         | Replace disabled placeholder with WatchlistButton  |
| Modify   | `src/components/tvshow/tvshow-hero.tsx`       | Add WatchlistButton to actions row                  |
| Create   | `src/pages/watchlist.tsx`                     | `/watchlist` page with saved items grid             |
| Modify   | `src/router.tsx`                              | Add `/watchlist` route                              |
| Modify   | `src/pages/root.tsx`                          | Add "Minha Lista" nav link                          |

---

## Task 1: Add `watchlist` table to SQLite

**Files:**
- Modify: `server/db.js`

- [ ] **Step 1: Add migration in `server/db.js`**

Open `server/db.js`. Inside the `db.serialize(() => { ... })` block, after the last existing `db.run(...)` call (after `api_cache`), add:

```js
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      username        TEXT    NOT NULL,
      the_movie_db_id INTEGER NOT NULL,
      media_type      TEXT    NOT NULL CHECK (media_type IN ('movie', 'tv')),
      added_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (username, the_movie_db_id)
    );
  `)
```

- [ ] **Step 2: Start the server and verify the table was created**

```bash
cd server && node -e "
import('./db.js').then(m => {
  m.default.all(\"SELECT name FROM sqlite_master WHERE type='table' AND name='watchlist'\", (err, rows) => {
    console.log(rows)
    process.exit(0)
  })
})
"
```

Expected output: `[ { name: 'watchlist' } ]`

- [ ] **Step 3: Commit**

```bash
git add server/db.js
git commit -m "feat(db): add watchlist table"
```

---

## Task 2: Create watchlist route with tests

**Files:**
- Create: `server/routes/watchlist.js`
- Create: `server/routes/watchlist.test.js`

- [ ] **Step 1: Write the test file first**

Create `server/routes/watchlist.test.js`:

```js
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import sqlite3 from 'sqlite3'
import { getItems, addItem, removeItem } from './watchlist.js'

let db

before(async () => {
  db = new sqlite3.verbose().Database(':memory:')
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE watchlist (
        username        TEXT    NOT NULL,
        the_movie_db_id INTEGER NOT NULL,
        media_type      TEXT    NOT NULL CHECK (media_type IN ('movie', 'tv')),
        added_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (username, the_movie_db_id)
      )
    `, err => err ? reject(err) : resolve())
  })
})

after(async () => {
  await new Promise(resolve => db.close(resolve))
})

test('getItems returns empty array for new user', async () => {
  const items = await getItems('alice', db)
  assert.deepEqual(items, [])
})

test('addItem inserts a movie entry', async () => {
  await addItem('alice', 550, 'movie', db)
  const items = await getItems('alice', db)
  assert.equal(items.length, 1)
  assert.equal(items[0].the_movie_db_id, 550)
  assert.equal(items[0].media_type, 'movie')
})

test('addItem is idempotent — INSERT OR IGNORE', async () => {
  await addItem('alice', 550, 'movie', db)
  const items = await getItems('alice', db)
  assert.equal(items.length, 1)
})

test('removeItem deletes the entry', async () => {
  await removeItem('alice', 550, db)
  const items = await getItems('alice', db)
  assert.deepEqual(items, [])
})

test('getItems is isolated by username', async () => {
  await addItem('alice', 100, 'tv', db)
  await addItem('bob', 200, 'movie', db)
  const aliceItems = await getItems('alice', db)
  const bobItems = await getItems('bob', db)
  assert.equal(aliceItems.length, 1)
  assert.equal(aliceItems[0].the_movie_db_id, 100)
  assert.equal(bobItems.length, 1)
  assert.equal(bobItems[0].the_movie_db_id, 200)
})
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
cd server && node --test routes/watchlist.test.js
```

Expected: error — `Cannot find module './watchlist.js'`

- [ ] **Step 3: Create `server/routes/watchlist.js`**

```js
import express from 'express'
import defaultDb from '../db.js'

const router = express.Router()

function getItems(username, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT the_movie_db_id, media_type, added_at FROM watchlist WHERE username = ? ORDER BY added_at DESC',
      [username],
      (err, rows) => err ? reject(err) : resolve(rows)
    )
  })
}

function addItem(username, the_movie_db_id, media_type, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO watchlist (username, the_movie_db_id, media_type) VALUES (?, ?, ?)',
      [username, the_movie_db_id, media_type],
      err => err ? reject(err) : resolve()
    )
  })
}

function removeItem(username, the_movie_db_id, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM watchlist WHERE username = ? AND the_movie_db_id = ?',
      [username, the_movie_db_id],
      err => err ? reject(err) : resolve()
    )
  })
}

// GET /api/watchlist
router.get('/watchlist', async (req, res) => {
  try {
    const items = await getItems(req.user.username)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/watchlist
router.post('/watchlist', async (req, res) => {
  const { the_movie_db_id, media_type } = req.body
  if (!the_movie_db_id || !['movie', 'tv'].includes(media_type)) {
    return res.status(400).json({ error: 'the_movie_db_id and media_type (movie|tv) required' })
  }
  try {
    await addItem(req.user.username, the_movie_db_id, media_type)
    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/watchlist/:the_movie_db_id
router.delete('/watchlist/:the_movie_db_id', async (req, res) => {
  try {
    await removeItem(req.user.username, Number(req.params.the_movie_db_id))
    res.sendStatus(204)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { getItems, addItem, removeItem }
export default router
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd server && node --test routes/watchlist.test.js
```

Expected output:
```
✔ getItems returns empty array for new user
✔ addItem inserts a movie entry
✔ addItem is idempotent — INSERT OR IGNORE
✔ removeItem deletes the entry
✔ getItems is isolated by username
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/watchlist.js server/routes/watchlist.test.js
git commit -m "feat(server): add watchlist route with tests"
```

---

## Task 3: Register watchlist router in the server

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add import at the top of `server/index.js`** (after the existing route imports, around line 18)

```js
import watchlistRouter from './routes/watchlist.js'
```

- [ ] **Step 2: Register the router** (after `app.use('/api', requireAuth, createStreamRouter(client))` around line 87)

```js
app.use('/api', requireAuth, watchlistRouter)
```

- [ ] **Step 3: Verify manually**

Start the server (`cd server && npm start`), then in another terminal (replace `<TOKEN>` with a valid JWT from login):

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:5174/api/watchlist
```

Expected: `[]`

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(server): register watchlist router"
```

---

## Task 4: Add watchlist methods to the API client

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Add the `WatchlistItem` type and three methods to the `API` class**

Add this type above the `API` class definition (after the existing type imports area):

```ts
export type WatchlistItem = {
  the_movie_db_id: number
  media_type: 'movie' | 'tv'
  added_at: string
}
```

Add these three methods inside the `API` class, after `updateSettings`:

```ts
  async fetchWatchlist(): Promise<WatchlistItem[]> {
    const res = await http.get<WatchlistItem[]>('/api/watchlist')
    return res.data
  }

  async addToWatchlist(the_movie_db_id: number, media_type: 'movie' | 'tv'): Promise<void> {
    await http.post('/api/watchlist', { the_movie_db_id, media_type })
  }

  async removeFromWatchlist(the_movie_db_id: number): Promise<void> {
    await http.delete(`/api/watchlist/${the_movie_db_id}`)
  }
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(api): add watchlist client methods"
```

---

## Task 5: Create `useWatchlist` hook

**Files:**
- Create: `src/hooks/useWatchlist.ts`

- [ ] **Step 1: Create `src/hooks/useWatchlist.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import getAPI from '@/services/api'

export function useWatchlist(the_movie_db_id: number, media_type: 'movie' | 'tv') {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getAPI().fetchWatchlist(),
  })

  const inWatchlist = watchlist.some(item => item.the_movie_db_id === the_movie_db_id)

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () =>
      inWatchlist
        ? getAPI().removeFromWatchlist(the_movie_db_id)
        : getAPI().addToWatchlist(the_movie_db_id, media_type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: () =>
      toast({ title: 'Não foi possível atualizar sua lista.', variant: 'destructive' }),
  })

  return { inWatchlist, toggle, isPending }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWatchlist.ts
git commit -m "feat(hooks): add useWatchlist hook"
```

---

## Task 6: Create `WatchlistButton` component

**Files:**
- Create: `src/components/WatchlistButton.tsx`

- [ ] **Step 1: Create `src/components/WatchlistButton.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { useWatchlist } from '@/hooks/useWatchlist'

interface Props {
  the_movie_db_id: number
  media_type: 'movie' | 'tv'
}

export default function WatchlistButton({ the_movie_db_id, media_type }: Props) {
  const { inWatchlist, toggle, isPending } = useWatchlist(the_movie_db_id, media_type)

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => toggle()}
      className={
        inWatchlist
          ? 'border-green-400 text-green-400 hover:bg-green-400/10 disabled:opacity-60'
          : 'border-white/40 bg-transparent text-white hover:bg-white/10 disabled:opacity-60'
      }
    >
      {inWatchlist ? '✓ Na Lista' : 'Adicionar à Lista'}
    </Button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/WatchlistButton.tsx
git commit -m "feat(components): add WatchlistButton"
```

---

## Task 7: Integrate WatchlistButton into MovieHero

**Files:**
- Modify: `src/components/movie/movie-hero.tsx`

- [ ] **Step 1: Replace the disabled button placeholder**

In `src/components/movie/movie-hero.tsx`, add the import at the top:

```ts
import WatchlistButton from '@/components/WatchlistButton'
```

Then replace the entire disabled `<Button>` block (lines 69–75):

```tsx
            <Button
              variant="outline"
              disabled
              className="border-white/40 bg-transparent text-white hover:bg-white/10 disabled:opacity-60"
            >
              Adicionar à Lista
            </Button>
```

With:

```tsx
            <WatchlistButton the_movie_db_id={movie.id} media_type="movie" />
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/movie/movie-hero.tsx
git commit -m "feat(movie-hero): wire up WatchlistButton"
```

---

## Task 8: Add WatchlistButton to TvShowHero

**Files:**
- Modify: `src/components/tvshow/tvshow-hero.tsx`

- [ ] **Step 1: Add import and button**

In `src/components/tvshow/tvshow-hero.tsx`, add the import at the top:

```ts
import WatchlistButton from '@/components/WatchlistButton'
```

Add an actions row after the overview paragraph (`</p>` that ends `{show.overview}`) and before the lead cast block. Insert it between the overview `<p>` and the cast `{show.cast && ...}` block:

```tsx
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <WatchlistButton the_movie_db_id={show.id} media_type="tv" />
          </div>
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tvshow/tvshow-hero.tsx
git commit -m "feat(tvshow-hero): add WatchlistButton"
```

---

## Task 9: Create the Watchlist page

**Files:**
- Create: `src/pages/watchlist.tsx`

- [ ] **Step 1: Create `src/pages/watchlist.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import MovieItem from '@/components/movie-item'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import getAPI from '@/services/api'

export default function WatchlistPage() {
  const { data: saved = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getAPI().fetchWatchlist(),
  })

  const { data: items, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['watchlist-details', saved.map(s => s.the_movie_db_id)],
    queryFn: () =>
      Promise.all(
        saved.map(s =>
          s.media_type === 'movie'
            ? getAPI().fetchMovieDetails(s.the_movie_db_id)
            : getAPI().fetchTvShowsDetails(s.the_movie_db_id)
        )
      ),
    enabled: saved.length > 0,
  })

  const isLoading = isLoadingList || (saved.length > 0 && isLoadingDetails)

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Minha Lista</h1>
      <Content
        isLoading={isLoading}
        items={items as TheMovieDbTrendingType[] | undefined}
        savedCount={saved.length}
      />
    </div>
  )
}

interface ContentProps {
  isLoading: boolean
  items: TheMovieDbTrendingType[] | undefined
  savedCount: number
}

function Content({ isLoading, items, savedCount }: ContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[226px] h-[385px] rounded" />
        ))}
      </div>
    )
  }

  if (savedCount === 0 || !items || items.length === 0) {
    return (
      <Alert>
        <AlertTitle>Sua lista está vazia.</AlertTitle>
        <AlertDescription>
          Adicione filmes e séries usando o botão "Adicionar à Lista" na página de detalhes.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {items.map(item => (
        <WatchlistCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function WatchlistCard({ item }: { item: TheMovieDbTrendingType }) {
  const queryClient = useQueryClient()

  const { mutate: remove } = useMutation({
    mutationFn: () => getAPI().removeFromWatchlist(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <div className="relative">
      <MovieItem item={item} />
      <button
        type="button"
        onClick={() => remove()}
        className="absolute top-2 left-0 right-0 mx-auto w-fit inline-flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-700 transition-colors z-10"
      >
        ✕ Remover
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/watchlist.tsx
git commit -m "feat(pages): add WatchlistPage"
```

---

## Task 10: Add route and navigation link

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/pages/root.tsx`

- [ ] **Step 1: Add import and route in `src/router.tsx`**

Add the import near the other page imports (around line 14):

```ts
import WatchlistPage from './pages/watchlist'
```

Inside the `Root` layout children array, add after the `/downloads` route:

```ts
{ path: '/watchlist', element: <WatchlistPage /> },
```

- [ ] **Step 2: Add nav link in `src/pages/root.tsx`**

Inside the `<ul>` in `<nav>`, add "Minha Lista" between "Home" and "Baixados":

```tsx
            <li>
              <Link
                to="/watchlist"
                className="text-sm hover:text-primary transition-colors"
              >
                Minha Lista
              </Link>
            </li>
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run build && npm run lint
```

Expected: no errors, zero warnings.

- [ ] **Step 4: Commit**

```bash
git add src/router.tsx src/pages/root.tsx
git commit -m "feat(router): add /watchlist route and nav link"
```

---

## Task 11: End-to-end verification

- [ ] **Step 1: Start both servers**

Terminal 1 (backend):
```bash
cd server && npm start
```

Terminal 2 (frontend):
```bash
npm run dev
```

- [ ] **Step 2: Verify MovieHero button**

1. Open `http://localhost:5173/movie/<any-id>` (e.g. the home page has movie links)
2. The "Adicionar à Lista" button must be clickable (no longer disabled)
3. Click it — button should change to "✓ Na Lista" with green border
4. Refresh page — button should still show "✓ Na Lista" (state persisted in DB)
5. Click again — should revert to "Adicionar à Lista"

- [ ] **Step 3: Verify TvShowHero button**

1. Open any TV show page (e.g. via search or home)
2. Repeat the same toggle test as above

- [ ] **Step 4: Verify /watchlist page**

1. Navigate to "Minha Lista" in the header
2. With nothing saved: Alert "Sua lista está vazia." should appear
3. Go to a movie, add it to the list, navigate back to Minha Lista
4. Movie card should appear with a "✕ Remover" button
5. Click "✕ Remover" — card should disappear, list returns to empty state

- [ ] **Step 5: Final lint + build**

```bash
npm run build && npm run lint
```

Expected: clean.
