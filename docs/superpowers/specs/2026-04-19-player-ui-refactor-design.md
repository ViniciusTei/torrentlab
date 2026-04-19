# Player UI Refactor — Design Spec
**Date:** 2026-04-19

## Overview

Refactor `src/pages/player.tsx` from a minimal dark-theme page with native video controls into a premium "Cinematic Archive" experience matching the design in `docs/player-ui-refactor/`. The page is standalone (no shared app header), uses custom video controls built from scratch, a glassmorphism download status panel, and a functional subtitle picker backed by a new backend endpoint.

## Architecture

### New Files

| File | Role |
|---|---|
| `src/components/player/PlayerControls.tsx` | All custom video control UI and playback state |
| `src/components/player/DownloadStatusPanel.tsx` | Floating glassmorphism download status panel |
| `src/components/player/SubtitlePanel.tsx` | Subtitle picker — fetches local subs, fallback CTA |

### Modified Files

| File | Change |
|---|---|
| `src/pages/player.tsx` | Refactored to orchestrator: holds `videoRef`, renders layout + sub-components |
| `server/index.js` | Two new endpoints for subtitle discovery and file streaming |
| `index.html` | Add Manrope + Inter Google Fonts `<link>` |

---

## Component Design

### `src/pages/player.tsx`
- Reads `infoHash` from URL params, `title` and `itemId` from search params
- Creates `videoRef = useRef<HTMLVideoElement>(null)`
- Holds two lifted state values: `showDownloadPanel: boolean` (default `true`) and `activeSubtitleUrl: string | null` (default `null`)
- Renders: full-screen `bg-[#f7f9fe]` layout, `<video>` element (no native `controls`), `PlayerControls`, `DownloadStatusPanel`
- The `<video>` element renders a `<track kind="subtitles" src={activeSubtitleUrl} default>` child when `activeSubtitleUrl` is set
- The `<video>` element is `aspect-video w-full rounded-xl overflow-hidden` inside a padded container (`pt-16 pb-8 px-4 md:px-8`)

### `src/components/player/PlayerControls.tsx`
**Props:** `videoRef: RefObject<HTMLVideoElement>`, `infoHash: string`, `title: string`, `itemId: string`, `showDownloadPanel: boolean`, `onToggleDownloadPanel: () => void`, `onSubtitleSelect: (url: string) => void`

**Local state:**
- `playing: boolean`
- `currentTime: number`
- `duration: number`
- `volume: number`
- `muted: boolean`
- `isFullscreen: boolean`
- `showSubtitlePanel: boolean`

**Video event listeners** (attached on mount, removed on unmount):
- `timeupdate` → update `currentTime`
- `loadedmetadata` → set `duration`
- `play` / `pause` → sync `playing`
- `volumechange` → sync `volume` / `muted`

**Rendered structure:**
- Absolute overlay inside the video container
- Bottom gradient: `linear-gradient(0deg, rgba(24,28,32,0.9) 0%, transparent 100%)`
- Scrubber: `<input type="range">` styled to hide default thumb; custom thumb appears on hover
- Controls row: Play/Pause (lucide `Play`/`Pause`), SkipForward (`SkipForward`), Volume (`Volume2`/`VolumeX`) + range slider, time display `currentTime / duration` (formatted MM:SS)
- Right side: Download status toggle, Subtitles (`Captions`), Settings (`Settings`), Fullscreen (`Maximize2`/`Minimize2`)
- Floating back button: `absolute top-6 left-6`, pill shape, `bg-black/20 hover:bg-black/40 backdrop-blur-md`, uses lucide `ArrowLeft`, calls `navigate(-1)`

**SubtitlePanel integration:** Rendered inside the controls overlay when `showSubtitlePanel` is true. `onSelect(url)` calls `onSubtitleSelect(url)` (lifted to `player.tsx`) then closes the panel. `onClose` sets `showSubtitlePanel` to false.

### `src/components/player/DownloadStatusPanel.tsx`
**Props:** `infoHash: string`, `onClose: () => void`

- Reads `activeDownloads` from `useSocketContext()` directly
- Finds matching item by `infoHash`; renders nothing if not found
- Close button calls `onClose()` (visibility controlled by `player.tsx` via `showDownloadPanel`)
- Layout: `absolute top-6 right-6 w-72`, `backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl`
- Header: "LIVE ARCHIVE SYNC" label (Manrope, uppercase, primary color) + close `X` button
- Progress: percentage display + progress bar (`bg-[#3e56aa]`)
- 2×2 stats grid: Speed, ETA, Seeders, Peers (labels uppercase 10px, values bold 14px)
- Speed derived from `activeItem.downloadSpeed` if available on the socket event, otherwise omitted

### `src/components/player/SubtitlePanel.tsx`
**Props:** `infoHash: string`, `itemId: string`, `onClose: () => void`, `onSelect: (url: string) => void`

- Fetches `GET /api/subtitles/:infoHash` on mount
- Loading state: spinner
- If subtitles found: renders list of filenames as selectable rows (hover: `bg-surface-container-low`); clicking calls `onSelect(subtitle.url)` then `onClose()`
- If empty: message "No subtitles downloaded." + `<Link to={`/movie/${itemId}`}>Go to details page to download subtitles →</Link>`
- Layout: positioned above the controls bar, `backdrop-blur-xl bg-white/70 rounded-xl border border-white/30`

---

## Visual Design

### Color Tokens (applied via inline Tailwind hex classes)
| Token | Value | Usage |
|---|---|---|
| `surface` | `#f7f9fe` | Page background |
| `surface-container-low` | `#f2f4f9` | Hover rows |
| `surface-container-highest` | `#e0e2e7` | Progress bar track |
| `primary` | `#3e56aa` | Progress fill, brand labels |
| `on-surface` | `#181c20` | Body text |
| `on-surface-variant` | `#444651` | Secondary labels |

### Typography
- Add to `index.html`: `<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`
- Manrope: panel headers, "LIVE ARCHIVE SYNC" label, stat values
- Inter: all metadata, time display, subtitle filenames

### Icons
All icons from `lucide-react`: `Play`, `Pause`, `SkipForward`, `Volume2`, `VolumeX`, `Maximize2`, `Minimize2`, `ArrowLeft`, `Download`, `Captions`, `X`, `Settings`, `Loader2`.

### No-Line Rule
No `border` classes for structural separation. Depth through background color shifts. Ghost border only for the glassmorphism panels: `border border-white/30`.

---

## Backend

### `GET /api/subtitles/:infoHash`
Scans `./downloads/:infoHash/` for files with extensions `.srt`, `.vtt`, `.ass`. Returns:
```json
[{ "filename": "Movie.en.srt", "url": "/api/subtitle-file/:infoHash/Movie.en.srt" }]
```
Returns `[]` if directory doesn't exist or no subtitle files found.

### `GET /api/subtitle-file/:infoHash/:filename`
Streams the subtitle file from `./downloads/:infoHash/:filename`. Validates that `filename` contains no path traversal (`..`). Returns 404 if not found.

---

## Error Handling

- Backend subtitle endpoints: 404 on missing file/directory, 400 on path traversal attempt
- `SubtitlePanel` fetch error: show "Could not load subtitles" message with retry button
- Video stream error: existing behavior preserved (native video error state)

---

## Out of Scope

- Subtitle search/download from OpenSubtitles (done from details page, not player)
- Settings panel behind the settings button (button rendered but no-op)
- Skip-next button functionality (rendered but no-op — no playlist concept yet)
- Mobile bottom nav bar (shown in reference design but not part of this refactor)
