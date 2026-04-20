# Episode Page Tabs + Episode-Specific Subtitles

**Date:** 2026-04-20  
**Scope:** `src/pages/episode.tsx`, `src/pages/tvshow.tsx`, `server/routes/subtitles.js`, `src/services/api.ts`

---

## Goal

Refactor the TV show episode page to match the movie page pattern: tabs for Torrents, Legendas, and Meus Downloads. Fix subtitle search to return subtitles specific to the episode/season instead of the whole show. Remove the stacked `SubtitlesGrid` from the show overview page.

---

## Changes

### 1. Remove SubtitlesGrid from `/tvshow/:id`

Remove `<SubtitlesGrid subtitles={show.subtitles} />` from `src/pages/tvshow.tsx`. Subtitle discovery is the episode page's responsibility.

No other changes to `tvshow.tsx`.

### 2. Episode page tabs (`src/pages/episode.tsx`)

Replace the stacked `TorrentsTable + SubtitlesGrid` layout with a `Tabs` component (same shadcn/ui `Tabs` used in `movie.tsx`).

**Tabs:**

| Value | Label | Content |
|-------|-------|---------|
| `torrents` | Torrents | Existing `TorrentsTable` with `searchQuery` |
| `downloads` | Meus Downloads | `DownloadsTab` with `movieId={episode.id}` and `title={episode.name}` |
| `subtitles` | Legendas | `SubtitlesGrid` receiving data from a React Query fetch |

**Download count badge** on the "Meus Downloads" tab trigger: sum of `activeDownloads` filtered by `itemId === String(episode.id)` plus completed `downloadIds` filtered by `the_movie_db_id === episode.id && downloaded !== 0`.

**Subtitle fetch** — client-side React Query call using a new `fetchEpisodeSubtitles` method (see below). The loader does not need to change. The `SubtitlesGrid` component receives the fetched `subtitles` array as a prop (no changes to that component).

**Hero button** — the existing `<a href="#torrents">Baixar Torrent</a>` anchor becomes a `defaultValue` prop on `Tabs` set to `"torrents"`, keeping the first tab selected on load. Remove the anchor since tabs handle navigation.

### 3. Episode-specific subtitle endpoint (backend)

**File:** `server/routes/subtitles.js`

Update `searchSubtitles(tmdb_id, season_number?, episode_number?)` to forward optional season/episode params to OpenSubtitles:

```js
async function searchSubtitles(tmdb_id, season_number, episode_number) {
  const params = { tmdb_id, languages: 'pt-br' }
  if (season_number != null) params.season_number = season_number
  if (episode_number != null) params.episode_number = episode_number
  // ... existing fetch logic
}
```

Update `GET /api/subtitles` to accept and forward `season_number` and `episode_number` query params. Cache key must include these params:

```
subs:tmdb:${tmdb_id}:s${season_number}:e${episode_number}
```

The existing show-level `searchSubtitles(id)` call in `movies.js` (for `/api/tvshow/:id`) is unaffected — it calls without season/episode params.

### 4. API client method (`src/services/api.ts`)

Add `fetchEpisodeSubtitles(tmdb_id, season_number, episode_number)`:

```ts
async fetchEpisodeSubtitles(tmdb_id: number, season_number: number, episode_number: number): Promise<Subtitle[]> {
  const res = await http.get<{ data: Subtitle[] }>(
    `/api/subtitles?tmdb_id=${tmdb_id}&season_number=${season_number}&episode_number=${episode_number}`
  )
  return res.data.data
}
```

---

## Data Flow

```
episode.tsx (loader)
  → fetchTvShowsDetails(showId)       → /api/tvshow/:id  (no subtitles needed)
  → fetchTvShowSeasonEpisodes(...)    → /api/tvshow/:id/season/:s

episode.tsx (client, React Query)
  → fetchEpisodeSubtitles(show.id, season, episode_number)
  → GET /api/subtitles?tmdb_id=&season_number=&episode_number=
  → searchSubtitles(tmdb_id, season, episode) → OpenSubtitles API
  → SubtitlesGrid receives data[]
```

---

## Out of Scope

- Fixing the `theMovieDbId` inconsistency in `episode-row.tsx` (show ID vs episode ID) — pre-existing issue, separate task.
- Adding tabs to `/tvshow/:id` overview page — explicitly excluded per design decision.
- Subtitle language filter UI — existing pt-br default is kept.
