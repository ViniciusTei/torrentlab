# Downloads Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full downloads feature — toast on start, `/downloads` page with "Em andamento" / "Concluídos" tabs, and automatic move when a torrent finishes.

**Architecture:** Fix the server `done` event to carry `itemId`, extend the socket context to store title+size per download and handle start/done toasts and query invalidation, then wire a new `/downloads` page that reads from context (active) and React Query (completed).

**Tech Stack:** React 18, TypeScript, TanStack React Query v5, Socket.IO client, shadcn/ui (Tabs), React Router v6, Express + SQLite on server.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `server/index.js` | Emit `{ itemId }` on `done` (two places) |
| Delete | `src/services/useSockets.ts` | Dead duplicate of socket context |
| Modify | `src/main.tsx` | Swap provider order so `QueryClientProvider` wraps `SocketProvider` |
| Modify | `src/context/sockets.tsx` | Refactor: typed context, extract `useDownloadSocket` hook, store title+size, start toast, done handler |
| Modify | `src/components/download-item.tsx` | Pass `title` and `size` to `startDownload` |
| Create | `src/components/ui/tabs.tsx` | shadcn Tabs (installed via CLI) |
| Create | `src/pages/downloads.tsx` | Tabs page — "Em andamento" + "Concluídos" |
| Modify | `src/router.tsx` | Add `/downloads` route |
| Modify | `src/pages/root.tsx` | Update "Baixados" nav link to `/downloads` |

---

## Task 1: Fix server `done` events

**Files:**
- Modify: `server/index.js`

Both `done` handlers in `server/index.js` emit a plain string. Change them to emit `{ itemId }`.

- [ ] **Step 1: Fix first `done` handler** (inside `clientAdd`, line ~47)

Replace:
```js
if (_socket) _socket.emit('done', 'Download finished')
```
With:
```js
if (_socket) _socket.emit('done', { itemId: id })
```

- [ ] **Step 2: Fix second `done` handler** (inside `io.on('connection')`, line ~101)

Replace:
```js
if (_socket) _socket.emit('done', 'Download finished')
```
With:
```js
if (_socket) _socket.emit('done', { itemId: arg.itemId })
```

- [ ] **Step 3: Commit**
```bash
git add server/index.js
git commit -m "fix: emit itemId with done socket event"
```

---

## Task 2: Delete dead code and fix provider order

**Files:**
- Delete: `src/services/useSockets.ts`
- Modify: `src/main.tsx`

`useSockets.ts` is an exact duplicate of the socket context and is not imported anywhere. `main.tsx` has `QueryClientProvider` nested inside `SocketProvider`, which means `useQueryClient()` can't be called inside the socket context. We must swap them.

- [ ] **Step 1: Delete `src/services/useSockets.ts`**
```bash
rm src/services/useSockets.ts
```

- [ ] **Step 2: Swap provider order in `src/main.tsx`**

Replace the current render with:
```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

Note: `SocketProvier` import will be updated to `SocketProvider` in Task 3.

- [ ] **Step 3: Commit**
```bash
git add src/main.tsx
git commit -m "refactor: move QueryClientProvider above SocketProvider"
```

---

## Task 3: Refactor socket context

**Files:**
- Modify: `src/context/sockets.tsx`

Rewrite the file following SOLID/KISS:
- Extract `useDownloadSocket` — all socket logic lives here (single responsibility)
- `SocketProvider` becomes a thin wrapper (no logic)
- Typed context replaces `{} as any`
- `DownloadItem` gains `title` and `size` fields so the downloads page can render them without needing the original `JackettItem`
- `startDownload` seeds the item into state immediately + fires a toast
- `onDone` removes the item from state, invalidates `['downloads']` query, fires a toast

- [ ] **Step 1: Rewrite `src/context/sockets.tsx`**

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import socket from '@/services/webtorrent'

export type DownloadItem = {
  itemId: string
  title: string
  size: number
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}

export type DownloadProps = {
  magnet: string
  itemId: string
  theMovieDbId: number
  title: string
  size: number
}

type SocketContextType = {
  isConnected: boolean
  onDownloadItems: DownloadItem[]
  startDownload: (props: DownloadProps) => void
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType)

function useDownloadSocket(): SocketContextType {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [onDownloadItems, setOnDownloadItems] = useState<DownloadItem[]>([])
  const [isConnected, setIsConnected] = useState(socket.connected)

  function startDownload({ magnet, itemId, theMovieDbId, title, size }: DownloadProps) {
    socket.emit('download', { magnet, itemId, theMovieDbId })
    setOnDownloadItems(prev => [
      ...prev,
      { itemId, title, size, progress: 0, peers: 0, downloaded: 0, timeRemaining: 0 },
    ])
    toast({ title: 'Download iniciado', description: title })
  }

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
      socket.emit('ready', 'Start', (res: unknown) => console.log(res))
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    function onProgress(value: Omit<DownloadItem, 'title' | 'size'>) {
      setOnDownloadItems(prev =>
        prev.map(i => (i.itemId === value.itemId ? { ...i, ...value } : i))
      )
    }

    function onDone({ itemId }: { itemId: string }) {
      setOnDownloadItems(prev => prev.filter(i => i.itemId !== itemId))
      queryClient.invalidateQueries({ queryKey: ['downloads'] })
      toast({ title: 'Download finalizado', description: 'Abra na pasta para visualizar o arquivo.' })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('downloaded', onProgress)
    socket.on('done', onDone)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('downloaded', onProgress)
      socket.off('done', onDone)
    }
  }, [])

  return { isConnected, onDownloadItems, startDownload }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const value = useDownloadSocket()
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocketContext = () => useContext(SocketContext)
```

- [ ] **Step 2: Fix the import in `src/main.tsx`** — change `SocketProvier` to `SocketProvider`:
```tsx
import { SocketProvider } from './context/sockets.tsx'
```
And update the JSX: `<SocketProvider>` / `</SocketProvider>`.

- [ ] **Step 3: Run type check**
```bash
npm run build 2>&1 | head -40
```
Expected: no errors related to `sockets.tsx` or `main.tsx`.

- [ ] **Step 4: Commit**
```bash
git add src/context/sockets.tsx src/main.tsx
git commit -m "refactor: extract useDownloadSocket hook, type context, add start/done toasts"
```

---

## Task 4: Update DownloadItem component

**Files:**
- Modify: `src/components/download-item.tsx`

`startDownload` now requires `title` and `size`. Pass them from the `JackettItem`.

- [ ] **Step 1: Update `handleDownload` in `src/components/download-item.tsx`**

Replace:
```tsx
startDownload({ magnet, itemId: item.guid, theMovieDbId: theMovieDbId })
```
With:
```tsx
startDownload({ magnet, itemId: item.guid, theMovieDbId, title: item.title, size: item.size })
```

- [ ] **Step 2: Run type check**
```bash
npm run build 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/components/download-item.tsx
git commit -m "fix: pass title and size to startDownload"
```

---

## Task 5: Install shadcn Tabs component

**Files:**
- Create: `src/components/ui/tabs.tsx`

- [ ] **Step 1: Install the Tabs component**
```bash
npx shadcn@latest add tabs
```
When prompted, confirm overwriting — answer `y`. This creates `src/components/ui/tabs.tsx` and installs `@radix-ui/react-tabs`.

- [ ] **Step 2: Verify the file exists**
```bash
ls src/components/ui/tabs.tsx
```
Expected: file listed.

- [ ] **Step 3: Commit**
```bash
git add src/components/ui/tabs.tsx package.json yarn.lock
git commit -m "chore: add shadcn Tabs component"
```

---

## Task 6: Create downloads page

**Files:**
- Create: `src/pages/downloads.tsx`

Two tabs:
- **"Em andamento"**: inline `ActiveDownloadCard` reads from `useSocketContext()`, uses `Progress`, `dayjs`, `formatBytes`
- **"Concluídos"**: `useQuery` → `api.fetchDownloaded()` → `MovieItem` cards

- [ ] **Step 1: Create `src/pages/downloads.tsx`**

```tsx
import dayjs from 'dayjs'
import { FaPeopleArrows } from 'react-icons/fa'
import { LuFileDown, LuTimerReset } from 'react-icons/lu'
import { useQuery } from '@tanstack/react-query'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import MovieItem from '@/components/movie-item'
import { useSocketContext, DownloadItem } from '@/context/sockets'
import getAPI from '@/services/api'

export default function DownloadsPage() {
  return (
    <div className="text-white px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Baixados</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Em andamento</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <ActiveTab />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <CompletedTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ActiveTab() {
  const { onDownloadItems } = useSocketContext()

  if (onDownloadItems.length === 0) {
    return (
      <Alert>
        <AlertTitle>Nenhum download em andamento</AlertTitle>
        <AlertDescription>Inicie um download a partir da página de um filme.</AlertDescription>
      </Alert>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {onDownloadItems.map(item => (
        <li key={item.itemId}>
          <ActiveDownloadCard item={item} />
        </li>
      ))}
    </ul>
  )
}

function ActiveDownloadCard({ item }: { item: DownloadItem }) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-800 rounded-lg">
      <p className="font-semibold">{item.title}</p>
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

function CompletedTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => getAPI().fetchDownloaded(),
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
        <AlertTitle>Nenhum download concluído</AlertTitle>
        <AlertDescription>Os filmes baixados aparecerão aqui.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {data.map(movie => (
        <MovieItem key={movie.id} item={movie as any} />
      ))}
    </div>
  )
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
```

- [ ] **Step 2: Run type check**
```bash
npm run build 2>&1 | head -40
```
Expected: no errors in `downloads.tsx`.

- [ ] **Step 3: Commit**
```bash
git add src/pages/downloads.tsx
git commit -m "feat: add downloads page with active and completed tabs"
```

---

## Task 7: Wire router and nav link

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/pages/root.tsx`

- [ ] **Step 1: Add `/downloads` route in `src/router.tsx`**

Add the import at the top:
```tsx
import DownloadsPage from './pages/downloads'
```

Add the route inside the root children array:
```tsx
{ path: '/downloads', element: <DownloadsPage /> },
```

- [ ] **Step 2: Fix nav link in `src/pages/root.tsx`**

Change:
```tsx
<Link to="/" className="flex gap-1 items-center cursor-pointer">
  <BsFillCollectionPlayFill /> Baixados
</Link>
```
To:
```tsx
<Link to="/downloads" className="flex gap-1 items-center cursor-pointer">
  <BsFillCollectionPlayFill /> Baixados
</Link>
```

- [ ] **Step 3: Run full build to confirm no errors**
```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ built in Xs` with no errors.

- [ ] **Step 4: Commit**
```bash
git add src/router.tsx src/pages/root.tsx
git commit -m "feat: wire /downloads route and nav link"
```

---

## Task 8: Rebuild Docker and smoke test

- [ ] **Step 1: Rebuild the Docker image**
```bash
docker compose up --build -d app
```
Expected: `Container torrentlab-app-1 Started`

- [ ] **Step 2: Verify server is up**
```bash
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
```
Expected: `200`

- [ ] **Step 3: Manual smoke test checklist**

Open `http://localhost:3000` in the browser and verify:
- [ ] "Baixados" nav link navigates to `/downloads`
- [ ] "Em andamento" tab shows empty state when no downloads are active
- [ ] "Concluídos" tab shows skeleton then either empty state or movie cards
- [ ] Navigate to a movie, click a torrent download — toast appears saying "Download iniciado"
- [ ] "Em andamento" tab shows the item with progress bar updating in real time
- [ ] When download completes — toast says "Download finalizado", item disappears from "Em andamento", appears in "Concluídos"

- [ ] **Step 4: Final commit if any tweaks were made**
```bash
git add -p && git commit -m "fix: post-smoke-test adjustments"
```
