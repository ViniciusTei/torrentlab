# Downloads Tab Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist file size, quality, and torrent name to SQLite and surface them in the Downloads tab, plus add Cancel (active) and Delete (completed) actions.

**Architecture:** Backend extracts `torrent.length`, `torrent.name`, and quality tags from WebTorrent metadata on download start and persists them. A new DELETE endpoint and `cancel` socket event handle removal. Frontend reads new fields from the DB response and adds action buttons.

**Tech Stack:** Node.js ESM, SQLite3, WebTorrent, React 18, TypeScript, TanStack Query, Socket.IO, Tailwind, shadcn/ui

---

## File Map

| File | Change |
|------|--------|
| `server/utils.js` | **Create** — `extractQuality(name)` regex function |
| `server/utils.test.js` | **Create** — Node built-in test runner tests for `extractQuality` |
| `server/db.js` | **Modify** — add `size`, `quality`, `torrent_name` column migrations |
| `server/index.js` | **Modify** — persist new fields on INSERT; add `cancel` socket event; add DELETE endpoint |
| `src/services/api.ts` | **Modify** — update `fetchDownloadIds` return type; add `deleteDownload(infoHash)` |
| `src/context/sockets.tsx` | **Modify** — add `cancelDownload(itemId)` to context |
| `src/components/movie/downloads-tab.tsx` | **Modify** — update `CompletedRow`, `ActiveDownloadRow`, and `DownloadsTab` |

---

### Task 1: `extractQuality` utility

**Files:**
- Create: `server/utils.js`
- Create: `server/utils.test.js`

- [ ] **Step 1: Create `server/utils.js`**

```js
/**
 * Extracts a short quality string from a torrent name.
 * Returns null if no known tokens are found.
 * @param {string | null} name
 * @returns {string | null}
 */
export function extractQuality(name) {
  if (!name) return null
  const tokens = []

  if (/\b(2160p|4K|UHD)\b/i.test(name)) tokens.push('4K')
  else if (/\b1080p\b/i.test(name)) tokens.push('1080p')
  else if (/\b720p\b/i.test(name)) tokens.push('720p')
  else if (/\b480p\b/i.test(name)) tokens.push('480p')

  if (/\bBlu[-.]?Ray\b/i.test(name)) tokens.push('BluRay')
  else if (/\bWEB[-.]?DL\b/i.test(name)) tokens.push('WEB-DL')
  else if (/\bWEBRip\b/i.test(name)) tokens.push('WEBRip')
  else if (/\bHDTV\b/i.test(name)) tokens.push('HDTV')

  if (/\b(x265|HEVC)\b/i.test(name)) tokens.push('HEVC')
  else if (/\b(x264|AVC)\b/i.test(name)) tokens.push('x264')

  return tokens.length > 0 ? tokens.join(' ') : null
}
```

- [ ] **Step 2: Create `server/utils.test.js`**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractQuality } from './utils.js'

test('1080p WEB-DL x264', () => {
  assert.equal(extractQuality('Movie.2023.1080p.WEB-DL.x264-GROUP'), '1080p WEB-DL x264')
})

test('4K BluRay HEVC', () => {
  assert.equal(extractQuality('Movie.2023.2160p.BluRay.x265-GROUP'), '4K BluRay HEVC')
})

test('720p WEBRip', () => {
  assert.equal(extractQuality('Movie.2023.720p.WEBRip'), '720p WEBRip')
})

test('UHD maps to 4K', () => {
  assert.equal(extractQuality('Movie.2023.UHD.BluRay.HEVC'), '4K BluRay HEVC')
})

test('returns null for unknown name', () => {
  assert.equal(extractQuality('some-random-file'), null)
})

test('returns null for null input', () => {
  assert.equal(extractQuality(null), null)
})

test('case insensitive matching', () => {
  assert.equal(extractQuality('movie.1080P.web-dl.X264'), '1080p WEB-DL x264')
})
```

- [ ] **Step 3: Run tests**

```bash
node --test server/utils.test.js
```

Expected output: 7 passing tests, 0 failing.

- [ ] **Step 4: Commit**

```bash
git add server/utils.js server/utils.test.js
git commit -m "feat: add extractQuality utility for torrent name parsing"
```

---

### Task 2: DB migration

**Files:**
- Modify: `server/db.js`

- [ ] **Step 1: Add three `ALTER TABLE` migrations**

In `server/db.js`, inside the `db.serialize()` block, after the existing `ALTER TABLE downloads ADD COLUMN title TEXT` line, add:

```js
  db.run(`ALTER TABLE downloads ADD COLUMN title TEXT`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN size INTEGER`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN quality TEXT`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN torrent_name TEXT`, () => {})
```

- [ ] **Step 2: Verify the server starts without errors**

```bash
cd server && node index.js
```

Expected: `Server running on port 5174` with no SQLite errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/db.js
git commit -m "feat: add size, quality, torrent_name columns to downloads table"
```

---

### Task 3: Persist metadata on download start + add cancel event

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Import `extractQuality` at the top of `server/index.js`**

Add after the existing imports:

```js
import { extractQuality } from './utils.js'
```

- [ ] **Step 2: Update the `download` socket event handler to persist new fields**

Find the `io.on('connection', ...)` block. Inside `socket.on('download', ...)`, locate the `client.add` callback where the INSERT happens. Replace the INSERT statement:

```js
// Before:
const stmt = db.prepare('INSERT INTO downloads VALUES (?, ?, ?, ?, ?);')
stmt.run(arg.itemId, torrent.infoHash, arg.theMovieDbId, 0, arg.title ?? null, (_, err) => {
  if (err) console.log(err)
})

// After:
const stmt = db.prepare('INSERT INTO downloads VALUES (?, ?, ?, ?, ?, ?, ?, ?);')
stmt.run(
  arg.itemId,
  torrent.infoHash,
  arg.theMovieDbId,
  0,
  arg.title ?? null,
  torrent.length,
  extractQuality(torrent.name),
  torrent.name,
  (_, err) => { if (err) console.log(err) }
)
```

- [ ] **Step 3: Add `cancel` socket event handler**

Inside the `io.on('connection', (socket) => { ... })` block, after the `socket.on('download', ...)` handler, add:

```js
  socket.on('cancel', ({ itemId }) => {
    db.get('SELECT info_hash FROM downloads WHERE download_id = ?', [itemId], (err, row) => {
      if (err) return console.log(err)
      if (row) {
        const torrent = client.get(row.info_hash)
        if (torrent) torrent.destroy()
        db.run('DELETE FROM downloads WHERE download_id = ?', [itemId], (err) => {
          if (err) console.log(err)
        })
      }
      if (_socket) _socket.emit('done', { itemId })
    })
  })
```

- [ ] **Step 4: Verify the server starts without syntax errors**

```bash
cd server && node index.js
```

Expected: `Server running on port 5174`. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add server/index.js
git commit -m "feat: persist size/quality/torrent_name on download; add cancel socket event"
```

---

### Task 4: DELETE endpoint for completed downloads

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add DELETE endpoint**

After the existing `app.get('/api/downloads/ids', ...)` endpoint, add:

```js
app.delete('/api/downloads/:infoHash', requireAuth, (req, res) => {
  const { infoHash } = req.params
  db.get('SELECT torrent_name FROM downloads WHERE info_hash = ?', [infoHash], (err, row) => {
    if (err) return res.status(500).send(err)
    if (!row) return res.status(404).json({ error: 'Not found' })

    const torrent = client.get(infoHash)
    if (torrent) {
      torrent.destroy({ destroyStore: true })
    } else if (row.torrent_name) {
      const folderPath = path.join(config.downloadsPath, row.torrent_name)
      fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) console.log('Failed to delete files:', err)
      })
    }

    db.run('DELETE FROM downloads WHERE info_hash = ?', [infoHash], (err) => {
      if (err) return res.status(500).send(err)
      res.sendStatus(204)
    })
  })
})
```

- [ ] **Step 2: Verify server starts cleanly**

```bash
cd server && node index.js
```

Expected: `Server running on port 5174`. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add DELETE /api/downloads/:infoHash endpoint"
```

---

### Task 5: Frontend — API service

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Update `fetchDownloadIds` return type to include new fields**

Find the `fetchDownloadIds` method and replace it:

```ts
  async fetchDownloadIds(): Promise<{
    download_id: string
    info_hash: string
    the_movie_db_id: number
    downloaded: number
    title: string | null
    size: number | null
    quality: string | null
    torrent_name: string | null
  }[]> {
    const res = await http.get('/api/downloads/ids')
    return res.data
  }
```

- [ ] **Step 2: Add `deleteDownload` method**

After `fetchDownloadIds`, add:

```ts
  async deleteDownload(infoHash: string): Promise<void> {
    await http.delete(`/api/downloads/${infoHash}`)
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add deleteDownload method and extend fetchDownloadIds return type"
```

---

### Task 6: Frontend — socket context cancel action

**Files:**
- Modify: `src/context/sockets.tsx`

- [ ] **Step 1: Add `cancelDownload` to the context type**

Find the `SocketContextType` type definition and add `cancelDownload`:

```ts
type SocketContextType = {
  isConnected: boolean
  activeDownloads: DownloadItem[]
  startDownload: (props: DownloadProps) => void
  cancelDownload: (itemId: string) => void
}
```

- [ ] **Step 2: Implement `cancelDownload` in `useDownloadSocket`**

Inside the `useDownloadSocket` function, after the `startDownload` function, add:

```ts
  function cancelDownload(itemId: string) {
    socket.emit('cancel', { itemId })
    setActiveDownloads(prev => prev.filter(i => i.itemId !== itemId))
  }
```

- [ ] **Step 3: Add `cancelDownload` to the return value**

```ts
  return { isConnected, activeDownloads, startDownload, cancelDownload }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/sockets.tsx
git commit -m "feat: add cancelDownload to socket context"
```

---

### Task 7: Frontend — Downloads tab UI

**Files:**
- Modify: `src/components/movie/downloads-tab.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, X, Trash2 } from "lucide-react";

import getAPI from "@/services/api";
import { useSocketContext } from "@/context/sockets";
import { DownloadItem } from "@/context/sockets";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/utils/format";

interface Props {
  movieId: number;
  title: string;
}

interface CompletedRow {
  info_hash: string;
  title: string | null;
  torrent_name: string | null;
  the_movie_db_id: number;
  downloaded: number;
  size: number | null;
  quality: string | null;
}

function QualityBadge({ quality }: { quality: string | null }) {
  if (!quality) return null;
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
      {quality}
    </Badge>
  );
}

function ActiveDownloadRow({ item }: { item: DownloadItem }) {
  const { cancelDownload } = useSocketContext();

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium truncate max-w-[260px]">
        {item.title}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {formatBytes(item.downloaded)}/{formatBytes(item.size)}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {item.peers} peers
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {item.timeRemaining > 0 ? formatDuration(item.timeRemaining) : "—"}
      </td>
      <td className="py-3 pr-4 min-w-[160px]">
        <div className="flex items-center gap-2">
          <Progress value={item.progress * 100} className="h-1.5 flex-1" />
          <span className="text-xs text-yellow-500 font-medium whitespace-nowrap">
            {Math.round(item.progress * 100)}%
          </span>
        </div>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          {item.infoHash ? (
            <Button asChild size="sm" variant="secondary">
              <Link
                to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}`}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Assistir
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => cancelDownload(item.itemId)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CompletedDownloadRow({
  row,
  title,
}: {
  row: CompletedRow;
  title: string;
}) {
  const queryClient = useQueryClient();

  async function handleDelete() {
    await getAPI().deleteDownload(row.info_hash);
    queryClient.invalidateQueries({ queryKey: ["download-ids"] });
  }

  const displayName = row.title ?? row.torrent_name ?? row.info_hash;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium max-w-[260px]">
        <div className="flex flex-col gap-1">
          <span className="truncate">{displayName}</span>
          <QualityBadge quality={row.quality} />
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {row.size ? formatBytes(row.size) : "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">—</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">—</td>
      <td className="py-3 pr-4">
        <span className="text-xs font-semibold text-green-500">✓ Concluído</span>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link
              to={`/player/${row.info_hash}?title=${encodeURIComponent(row.title ?? title)}`}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Assistir
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function DownloadsTab({ movieId, title }: Props) {
  const { data: downloadIds, isLoading } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();

  const completed = (downloadIds ?? []).filter(
    (d) => d.the_movie_db_id === movieId && d.downloaded !== 0,
  );
  const active = activeDownloads.filter((d) => d.theMovieDbId === movieId);
  const hasAny = completed.length > 0 || active.length > 0;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Meus Downloads</h2>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {!isLoading && !hasAny && (
        <Alert>
          <AlertTitle>Nenhum download encontrado</AlertTitle>
          <AlertDescription>
            Inicie um download na aba de Torrents para ver o conteúdo aqui.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && hasAny && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Nome
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Tamanho
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Peers
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Tempo Rest.
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {active.map((item) => (
                <ActiveDownloadRow key={item.itemId} item={item} />
              ))}
              {completed.map((row) => (
                <CompletedDownloadRow
                  key={row.info_hash}
                  row={row}
                  title={title}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify `Badge` is available in shadcn/ui**

```bash
ls src/components/ui/badge.tsx
```

If missing, install it:

```bash
npx shadcn@latest add badge
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
npm run build 2>&1 | head -40
```

Expected: Clean build.

- [ ] **Step 4: Start the dev server and test manually**

```bash
npm run dev
```

Open the movie page. In the Downloads tab verify:
- Completed downloads show size and quality badge (for newly downloaded items — old rows without metadata will show "—" which is correct)
- The Cancel (X) button appears on active download rows
- The Delete (trash) button appears on completed download rows and removes the row after clicking
- Watch button still works on both row types

- [ ] **Step 5: Commit**

```bash
git add src/components/movie/downloads-tab.tsx
git commit -m "feat: improve downloads tab with quality badge, size, cancel and delete actions"
```
