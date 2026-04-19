# Watchlist Feature — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

## Overview

Allow users to save movies and TV shows to a personal watchlist. The "Adicionar à Lista" button already exists as a visual placeholder in `MovieHero`; this spec wires it up end-to-end and extends the same button to `TvShowHero`.

---

## Backend

### Database — `server/db.js`

Add migration inline (same pattern as existing `ALTER TABLE` migrations):

```sql
CREATE TABLE IF NOT EXISTS watchlist (
  username       TEXT    NOT NULL,
  the_movie_db_id INTEGER NOT NULL,
  media_type     TEXT    NOT NULL CHECK (media_type IN ('movie', 'tv')),
  added_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (username, the_movie_db_id)
);
```

`username` is stored directly from the JWT payload (`req.user.username`). No JOIN needed — avoids extra complexity for what is effectively a single-user system.

### Routes — `server/routes/watchlist.js`

New Express router file, registered in `server/index.js` as:
```js
import watchlistRouter from './routes/watchlist.js'
app.use('/api', requireAuth, watchlistRouter)
```

| Method   | Path                            | Description                              |
|----------|---------------------------------|------------------------------------------|
| GET      | `/api/watchlist`                | Returns all watchlist items for the user |
| POST     | `/api/watchlist`                | Adds an item; body: `{ the_movie_db_id, media_type }` |
| DELETE   | `/api/watchlist/:the_movie_db_id` | Removes an item                        |

- POST uses `INSERT OR IGNORE` to handle duplicates gracefully.
- All endpoints read `req.user.username` from the JWT middleware.
- Response shape for GET: `{ the_movie_db_id: number, media_type: string, added_at: string }[]`

No separate `/check` endpoint. The full list is fetched once and shared via React Query cache (`['watchlist']` key).

---

## Frontend

### API Client — `src/services/api.ts`

Three new methods added to the `API` class:

```ts
fetchWatchlist(): Promise<{ the_movie_db_id: number; media_type: string; added_at: string }[]>
addToWatchlist(the_movie_db_id: number, media_type: 'movie' | 'tv'): Promise<void>
removeFromWatchlist(the_movie_db_id: number): Promise<void>
```

### Hook — `src/hooks/useWatchlist.ts`

Single-responsibility hook encapsulating all watchlist state and mutations.

```ts
function useWatchlist(the_movie_db_id: number): {
  inWatchlist: boolean
  toggle: () => void
  isPending: boolean
}
```

- Uses `useQuery(['watchlist'], api.fetchWatchlist)` — cache is shared across all consumers.
- `toggle` calls `addToWatchlist` or `removeFromWatchlist` based on current state, then calls `queryClient.invalidateQueries(['watchlist'])`.
- `isPending` is `true` while the mutation is in-flight (disables the button to prevent double-clicks).

### Reusable component — `src/components/WatchlistButton.tsx`

Extracted from `MovieHero`/`TvShowHero` to avoid duplication. Both heroes pass `id` and `mediaType`; the button manages its own state internally via `useWatchlist`.

```tsx
interface Props {
  the_movie_db_id: number
  media_type: 'movie' | 'tv'
}
```

Visual states:
- **Not saved:** `variant="outline"` with border-white/40, text "Adicionar à Lista"
- **Saved:** `variant="outline"` with green tint (`border-green-400 text-green-400`), text "✓ Na Lista"
- **Pending:** button disabled with reduced opacity

This component has one job: render the watchlist toggle for a given item. No routing, no layout concerns.

### `MovieHero` — `src/components/movie/movie-hero.tsx`

Replace the current disabled `<Button>` placeholder with `<WatchlistButton the_movie_db_id={movie.id} media_type="movie" />`.

### `TvShowHero` — `src/components/tvshow/tvshow-hero.tsx`

Add `<WatchlistButton the_movie_db_id={show.id} media_type="tv" />` in the actions row, consistent with the MovieHero layout.

### Watchlist Page — `src/pages/watchlist.tsx`

Route: `/watchlist`

- Uses `useQuery(['watchlist'], api.fetchWatchlist)` to get the saved list.
- For each item, fetches full details via `api.fetchMovieDetails` or `api.fetchTvShowsDetails` based on `media_type`, using `Promise.all`.
- Renders a grid of `<MovieItem>` cards (same component used in `DownloadsPage`, `App`, etc.).
- Overlays a remove button on each card — **extract a reusable `<CardOverlayButton>` component** if the same overlay pattern is used in `DownloadsPage` (currently the "Assistir" link). This avoids duplicating the absolute-positioned overlay markup.
- Empty state: `<Alert>` with "Sua lista está vazia." message, consistent with `DownloadsPage`.
- Loading state: `<Skeleton>` grid, consistent with other pages.

### Router — `src/router.tsx`

Add inside the `Root` layout children:
```ts
{ path: '/watchlist', element: <WatchlistPage /> }
```

### Navigation — `src/pages/root.tsx`

Add "Minha Lista" link in `<nav>` between "Home" and "Baixados":
```tsx
<li><Link to="/watchlist" className="text-sm hover:text-primary transition-colors">Minha Lista</Link></li>
```

---

## Component Boundaries (SOLID / KISS)

| Component / Hook        | Single Responsibility                                  |
|-------------------------|--------------------------------------------------------|
| `useWatchlist`          | Watchlist state + mutations for one item               |
| `WatchlistButton`       | Render watchlist toggle button; no layout concerns     |
| `watchlist.js` (route)  | HTTP interface only; no business logic beyond DB ops   |
| `WatchlistPage`         | Compose list view; delegates card rendering to `MovieItem` |

Reuse opportunities identified:
- `MovieItem` already handles cards — reused as-is in `WatchlistPage`.
- `Alert` + `Skeleton` patterns — reused from `DownloadsPage`.
- If `DownloadsPage` overlay button and `WatchlistPage` overlay button share the same absolute-positioned structure, extract `CardOverlayButton` (renders a small pill-shaped button at top-center of a card).

---

## Error Handling

- POST/DELETE failures: surface via `useToast` (already available in the project) — "Não foi possível atualizar sua lista."
- GET failure: React Query default retry; page shows empty `Alert` on persistent failure.
- Duplicate add: handled silently by `INSERT OR IGNORE` on the backend.

---

## Out of Scope

- Sorting or filtering the watchlist.
- Sharing or exporting the list.
- Notifications when a watchlisted item becomes available.
