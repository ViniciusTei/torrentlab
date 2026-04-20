# Episode Page Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the episode detail page to use tabs (Torrents / Meus Downloads / Legendas), search subtitles specific to the episode, and remove the stacked SubtitlesGrid from the TV show overview page.

**Architecture:** Four self-contained changes in dependency order: backend subtitle endpoint gains optional season/episode params → API client exposes `fetchEpisodeSubtitles` → tvshow page drops its SubtitlesGrid → episode page gets Tabs + React Query subtitle fetch + DownloadsTab.

**Tech Stack:** React 18, TypeScript, React Query, shadcn/ui Tabs, Express, OpenSubtitles API

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server/routes/subtitles.js` | Modify | Add `season_number` / `episode_number` params to `searchSubtitles` and GET endpoint |
| `src/services/api.ts` | Modify | Add `fetchEpisodeSubtitles(tmdb_id, season, episode)` |
| `src/pages/tvshow.tsx` | Modify | Remove `SubtitlesGrid` |
| `src/pages/episode.tsx` | Modify | Replace stacked layout with Tabs, add DownloadsTab, fetch episode subtitles |

---

### Task 1: Episode-specific subtitle endpoint (backend)

**Files:**
- Modify: `server/routes/subtitles.js`

- [ ] **Step 1: Update `searchSubtitles` to accept optional season/episode params**

Replace the existing `searchSubtitles` function (lines 37–50) with:

```js
export async function searchSubtitles(tmdb_id, season_number, episode_number) {
  try {
    const bearer = await getSubtitleToken()
    const { subsApi } = await getSubsApi()
    const params = { tmdb_id, languages: 'pt-br' }
    if (season_number != null) params.season_number = season_number
    if (episode_number != null) params.episode_number = episode_number
    const result = await subsApi.get('/subtitles', {
      params,
      headers: { Authorization: `Bearer ${bearer}` }
    })
    return result.data.data || []
  } catch {
    subtitleToken = null
    return []
  }
}
```

Note: the existing call in `movies.js` — `searchSubtitles(id)` — passes only `tmdb_id`, so `season_number` and `episode_number` will be `undefined` and the params block won't add them. Fully backward compatible.

- [ ] **Step 2: Update the GET `/api/subtitles` route to forward the new params**

Replace the existing `router.get('/subtitles', ...)` handler (lines 53–65) with:

```js
router.get('/subtitles', async (req, res) => {
  try {
    const { tmdb_id, season_number, episode_number } = req.query
    const cacheKey = season_number != null
      ? `subs:tmdb:${tmdb_id}:s${season_number}:e${episode_number}`
      : `subs:tmdb:${tmdb_id}`
    const subtitles = await withCache(
      cacheKey,
      24 * 60 * 60,
      () => searchSubtitles(
        tmdb_id,
        season_number != null ? Number(season_number) : undefined,
        episode_number != null ? Number(episode_number) : undefined
      )
    )
    res.json({ data: subtitles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 3: Manual test — verify episode subtitles are returned**

Start the backend (`cd server && npm start`) and call:
```
curl "http://localhost:5174/api/subtitles?tmdb_id=<show_tmdb_id>&season_number=1&episode_number=1"
```
Expected: JSON `{ data: [...] }` with subtitles. The `feature_details` on each subtitle should show `season_number` / `episode_number` matching the request.

Also verify existing show-level call still works:
```
curl "http://localhost:5174/api/subtitles?tmdb_id=<show_tmdb_id>"
```
Expected: JSON `{ data: [...] }` (no episode filtering).

- [ ] **Step 4: Commit**

```bash
git add server/routes/subtitles.js
git commit -m "feat(subtitles): support season/episode filtering in search endpoint"
```

---

### Task 2: Add `fetchEpisodeSubtitles` to API client

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Add the import for `Subtitle` type**

At the top of `src/services/api.ts`, update the subtitles import line from:

```ts
import { SubtitleDownloadResponse } from '@/services/types/subtitles'
```

to:

```ts
import { Subtitle, SubtitleDownloadResponse } from '@/services/types/subtitles'
```

- [ ] **Step 2: Add `fetchEpisodeSubtitles` method to the `API` class**

Add the following method inside the `API` class, after the `downloadSubtitles` method:

```ts
async fetchEpisodeSubtitles(tmdb_id: number, season_number: number, episode_number: number): Promise<Subtitle[]> {
  const res = await http.get<{ data: Subtitle[] }>(
    `/api/subtitles?tmdb_id=${tmdb_id}&season_number=${season_number}&episode_number=${episode_number}`
  )
  return res.data.data
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(api): add fetchEpisodeSubtitles method"
```

---

### Task 3: Remove SubtitlesGrid from tvshow page

**Files:**
- Modify: `src/pages/tvshow.tsx`

- [ ] **Step 1: Remove the SubtitlesGrid import and usage**

In `src/pages/tvshow.tsx`, remove the import line:

```ts
import SubtitlesGrid from "@/components/movie/subtitles-grid";
```

And remove the JSX element inside `<main>`:

```tsx
<SubtitlesGrid subtitles={show.subtitles} />
```

The `<main>` section should end up containing only `EpisodeList`.

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tvshow.tsx
git commit -m "refactor(tvshow): remove SubtitlesGrid from show overview page"
```

---

### Task 4: Refactor episode page to use tabs

**Files:**
- Modify: `src/pages/episode.tsx`

- [ ] **Step 1: Update imports**

Replace the current imports block in `src/pages/episode.tsx` with:

```tsx
import { useLoaderData, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import getAPI from "@/services/api";
import {
  TheMovieDbDetailsType,
  TvShowEpisode,
} from "@/services/types/themoviedb";
import { useSocketContext } from "@/context/sockets";
import SubtitlesGrid from "@/components/movie/subtitles-grid";
import TorrentsTable from "@/components/movie/torrents-table";
import DownloadsTab from "@/components/movie/downloads-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LuClock, LuStar } from "react-icons/lu";
```

- [ ] **Step 2: Update the component body**

Replace the full `EpisodePage` function body with the version below. The hero section is unchanged; only the main content area becomes tabs.

```tsx
function EpisodePage() {
  const { show, episode } = useLoaderData() as EpisodeLoaderData;

  const episodeCode = `S${zeroPad(episode.season_number)}E${zeroPad(episode.episode_number)}`;
  const searchQuery = `${show.original_title} ${episodeCode}`;

  const { data: downloadIds } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();

  const { data: episodeSubtitles } = useQuery({
    queryKey: ["episode-subtitles", show.id, episode.season_number, episode.episode_number],
    queryFn: () => getAPI().fetchEpisodeSubtitles(show.id, episode.season_number, episode.episode_number),
  });

  const activeForEpisode = activeDownloads.filter(
    (d) => d.itemId === String(episode.id),
  );
  const completedForEpisode = (downloadIds ?? []).filter(
    (d) => d.the_movie_db_id === episode.id && d.downloaded !== 0,
  );
  const downloadCount = activeForEpisode.length + completedForEpisode.length;

  const firstCompleted = completedForEpisode[0];
  const firstActive = activeForEpisode[0];
  const watchInfoHash =
    firstCompleted?.info_hash ?? firstActive?.infoHash ?? null;

  return (
    <div className="-mx-16">
      {/* Hero */}
      <div className="relative w-full min-h-[360px]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={episode.still_url ?? show.images.backdrop_paths.lg}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25" />
        </div>

        <div className="relative flex gap-8 px-16 py-10 items-end min-h-[360px] max-w-screen-lg mx-auto">
          {episode.still_url && (
            <img
              src={episode.still_url}
              alt={episode.name}
              className="w-52 h-32 object-cover rounded shadow-lg flex-shrink-0"
            />
          )}
          <div className="flex flex-col justify-end text-white max-w-2xl pb-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {episodeCode}
              </span>
              {episode.vote_average > 0 && (
                <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <LuStar size="0.75rem" />
                  {episode.vote_average.toFixed(1)}
                </span>
              )}
              {episode.runtime && (
                <span className="flex items-center gap-1 text-white/70 text-sm">
                  <LuClock size="0.75rem" />
                  {episode.runtime} min
                </span>
              )}
            </div>

            <p className="text-sm text-white/60 mb-1">{show.title}</p>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">
              {episode.name}
            </h1>
            <p className="text-white/80 text-sm leading-relaxed line-clamp-3 mb-5">
              {episode.overview}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="default">Baixar Torrent</Button>
              {watchInfoHash && (
                <Button asChild variant="secondary">
                  <Link
                    to={`/player/${watchInfoHash}?title=${encodeURIComponent(`${show.title} ${episodeCode}`)}`}
                  >
                    ▶ Assistir
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-16 py-8 max-w-screen-lg mx-auto">
        <Tabs defaultValue="torrents" className="mb-8">
          <TabsList>
            <TabsTrigger value="torrents">Torrents</TabsTrigger>
            <TabsTrigger value="downloads" className="relative">
              Meus Downloads
              {downloadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4">
                  {downloadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="subtitles">Legendas</TabsTrigger>
          </TabsList>

          <TabsContent value="torrents" className="mt-4">
            <TorrentsTable
              imdb_id={undefined}
              movieId={episode.id}
              searchQuery={searchQuery}
            />
          </TabsContent>

          <TabsContent value="downloads" className="mt-4">
            <DownloadsTab movieId={episode.id} title={episode.name} />
          </TabsContent>

          <TabsContent value="subtitles" className="mt-4">
            <SubtitlesGrid subtitles={episodeSubtitles} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 4: Manual smoke test**

Start both servers:
```bash
# Terminal 1
cd server && npm start

# Terminal 2
npm run dev
```

Navigate to a TV show → click an episode → verify:
- Three tabs appear: Torrents, Meus Downloads, Legendas
- Torrents tab loads torrent results for the episode
- Legendas tab shows subtitles specific to that episode (not the whole show)
- Meus Downloads tab shows existing downloads for that episode (or empty state message)
- Badge on Meus Downloads tab appears when a download is active or completed
- Hero "Baixar Torrent" button is still present

Navigate to `/tvshow/:id` and confirm SubtitlesGrid is gone from the show overview.

- [ ] **Step 5: Commit**

```bash
git add src/pages/episode.tsx
git commit -m "feat(episode): add tabs for torrents, downloads, and episode subtitles"
```
