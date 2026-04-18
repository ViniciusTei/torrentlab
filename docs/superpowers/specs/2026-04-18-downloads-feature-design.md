# Downloads Feature Design

**Date:** 2026-04-18
**Status:** Approved

## Overview

Implement the full download feature: toast on start, a `/downloads` page with two tabs (in-progress and completed), and auto-move when a download finishes. Refactor dead code along the way.

---

## 1. Server fix — `server/index.js`

The `done` event currently emits a plain string. Change both torrent `done` handlers to emit `{ itemId }`:

```js
_socket.emit('done', { itemId })
```

This lets the frontend identify which download completed and act on it.

---

## 2. Socket context — `src/context/sockets.tsx`

Refactor following SOLID/KISS:

- **Single responsibility:** extract `useDownloadSocket` as a custom hook (socket wiring only), keep `SocketProvider` as thin context wrapper.
- **Start toast:** `startDownload` fires a toast — *"Download iniciado"* with the item title or id as description.
- **Done handler:** receives `{ itemId }`, removes that item from `onDownloadItems`, calls `queryClient.invalidateQueries(['downloads'])` to refresh the completed tab automatically.
- **Typed context:** replace `createContext({} as any)` with a proper typed interface.

Delete `src/services/useSockets.ts` — it is an exact duplicate of the context and is not imported anywhere.

---

## 3. Downloads page — `src/pages/downloads.tsx`

New page at `/downloads` with two tabs via shadcn/ui `Tabs` (to be installed).

### "Em andamento" tab
- Reads `onDownloadItems` from `useSocketContext()`
- Renders existing `DownloadItem` component per item
- Empty state: *"Nenhum download em andamento."*

### "Concluídos" tab
- `useQuery(['downloads'], api.fetchDownloaded)`
- Renders `MovieItem` card per result (poster + title, links to `/movie/:id`)
- Skeleton grid while loading
- Empty state: *"Nenhum download concluído ainda."*

---

## 4. Wiring

| File | Change |
|---|---|
| `src/router.tsx` | Add `{ path: '/downloads', element: <DownloadsPage /> }` under the root route |
| `src/pages/root.tsx` | Update "Baixados" `Link` `to` from `/` to `/downloads` |

---

## 5. New dependency

`Tabs` component is not yet installed. Add it before implementation:

```bash
npx shadcn@latest add tabs
```

---

## 6. Deleted files

- `src/services/useSockets.ts` — dead duplicate of socket context

---

## Data flow

```
User clicks download
  → startDownload() emits socket 'download' + shows toast
  → server adds to WebTorrent, emits 'downloaded' on progress
  → onEvent() updates onDownloadItems[] in context
  → DownloadItem renders progress bar

Torrent finishes
  → server emits 'done' { itemId }
  → onDone() removes itemId from onDownloadItems[]
  → onDone() invalidates ['downloads'] query
  → "Concluídos" tab refetches and shows the movie card
  → toast: "Download finalizado"
```

---

## Out of scope

- Delete/remove a completed download
- TV show downloads (follows same pattern, deferred)
- Download speed display (data not in socket payload)
