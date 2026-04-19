# Downloads Tab Improvement — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

## Overview

Improve the Downloads tab on the movie page to store richer metadata and give users better visibility and control over their downloads. Currently, completed downloads show only the title (or raw info_hash) with "—" in all other columns and no way to delete them. Active downloads have no cancel action.

## Goals

- Persist file size and quality string to SQLite so completed rows render fully
- Extract quality/resolution tags from the torrent name on the backend (authoritative source)
- Add Delete action for completed downloads (removes DB record + files on disk)
- Add Cancel action for active downloads (stops torrent + removes from DB)

## Non-goals

- Timestamps (started_at / completed_at)
- Pause/resume support
- Quality parsing on the frontend

---

## Data Layer

### DB Migration

Three new columns added via `ALTER TABLE` in `server/db.js` (same pattern as existing `title` migration):

```sql
ALTER TABLE downloads ADD COLUMN size INTEGER;
ALTER TABLE downloads ADD COLUMN quality TEXT;
ALTER TABLE downloads ADD COLUMN torrent_name TEXT;
```

- `size` — total torrent size in bytes (`torrent.length` from WebTorrent)
- `quality` — short string extracted from `torrent.name`, e.g. `"1080p WEB-DL"`, `"4K HEVC"`
- `torrent_name` — the actual torrent name (`torrent.name`), used to locate files on disk for deletion. Distinct from `title` which is the TMDB display title.

### Quality Extraction

A `extractQuality(name)` function in `server/utils.js`. Applies regex to the torrent name searching for known tokens in this priority order:

| Category   | Tokens                                      |
|------------|---------------------------------------------|
| Resolution | `2160p`, `4K`, `UHD`, `1080p`, `720p`, `480p` |
| Codec      | `x265`, `HEVC`, `x264`, `AVC`              |
| Source     | `BluRay`, `WEB-DL`, `WEBRip`, `HDTV`       |

Returns a compact string with the matched tokens joined by space, e.g. `"1080p WEB-DL x265"`. Returns `null` if nothing matches.

---

## Backend

### Changes to `server/index.js`

**On `download` socket event**, after `client.add` resolves and torrent metadata is ready:
- Extract `size = torrent.length` and `quality = extractQuality(torrent.name)`
- Include all three in the `INSERT INTO downloads` statement (5 columns → 8 columns)

**New endpoint: `DELETE /api/downloads/:infoHash`**
- Removes the DB record: `DELETE FROM downloads WHERE info_hash = ?`
- If the torrent is still active in the WebTorrent client (`client.get(infoHash)`), calls `torrent.destroy({ destroyStore: true })` to remove files
- Otherwise, deletes `path.join(config.downloadsPath, torrent_name)` from disk using the stored `torrent_name`
- Returns 204 on success

**New socket event: `cancel`**
- Payload: `{ itemId: string }`
- Calls `client.remove(infoHash)` on the WebTorrent client
- Deletes the DB record
- Emits `done` back with `{ itemId }` so the frontend removes it from active state

---

## Frontend

### `CompletedRow` (`src/components/movie/downloads-tab.tsx`)

Updated `CompletedRow` interface gains `size: number | null` and `quality: string | null`.

Displays:
- **Quality badge**: small colored badge showing `quality` string (e.g. `1080p WEB-DL`). Hidden if null.
- **Size**: formatted with `formatBytes()` utility. Shows "—" if null.
- **Delete button**: calls `DELETE /api/downloads/:infoHash`, then invalidates `["download-ids"]` query. Button shows a trash icon.

### `ActiveDownloadRow`

Adds a **Cancel button** (X icon, destructive variant) in the actions column. On click, calls `cancelDownload(itemId)` from socket context.

### `SocketContext` (`src/context/sockets.tsx`)

Adds `cancelDownload(itemId: string)` to the context type and implementation:
- Emits `cancel` socket event with `{ itemId }`
- Optimistically removes the item from `activeDownloads` state

The `done` socket event already handles cleanup, so cancellation uses the same path.

---

## Affected Files

| File | Change |
|------|--------|
| `server/db.js` | Add `size`, `quality`, and `torrent_name` column migrations |
| `server/utils.js` | New file — `extractQuality()` function |
| `server/index.js` | Persist size+quality on INSERT; add DELETE endpoint; add `cancel` socket event |
| `src/context/sockets.tsx` | Add `cancelDownload()` to context |
| `src/components/movie/downloads-tab.tsx` | Update `CompletedRow` and `ActiveDownloadRow` |
