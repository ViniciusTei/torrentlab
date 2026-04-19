# Player UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the player page into a premium "Cinematic Archive" experience with custom video controls, a glassmorphism download status panel, and a functional subtitle picker for locally downloaded subtitle files.

**Architecture:** `player.tsx` becomes a thin orchestrator holding a `videoRef` and two lifted state values (`showDownloadPanel`, `activeSubtitleUrl`). Three focused sub-components handle custom controls (`PlayerControls`), download status (`DownloadStatusPanel`), and subtitle selection (`SubtitlePanel`). Two new Express routes expose locally downloaded subtitle files.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react, React Router v6, Socket.IO context, Express (Node.js ESM)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `index.html` | Add Manrope + Inter Google Fonts |
| Modify | `server/index.js` | Add `downloadSpeed` to socket event payload; register new route |
| Modify | `src/context/sockets.tsx` | Add `downloadSpeed: number` to `DownloadItem` type |
| Create | `server/routes/local-subtitles.js` | `GET /local-subtitles/:infoHash` + `GET /subtitle-file/:infoHash/:filename` |
| Modify | `src/components/movie/movie-hero.tsx` | Add `itemId` search param to player navigation |
| Modify | `src/components/movie/downloads-tab.tsx` | Add `itemId` search param to player navigation |
| Modify | `src/pages/downloads.tsx` | Add `itemId` search param to player navigation |
| Create | `src/components/player/DownloadStatusPanel.tsx` | Glassmorphism floating panel with download stats |
| Create | `src/components/player/SubtitlePanel.tsx` | Subtitle picker — lists local subs, fallback CTA |
| Create | `src/components/player/PlayerControls.tsx` | All custom video controls and playback state |
| Modify | `src/pages/player.tsx` | Orchestrator: layout, videoRef, lifted state, sub-components |

---

## Task 1: Add Google Fonts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add font links to `<head>`**

In `index.html`, add after `<meta name="viewport"...>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(player): add Manrope and Inter fonts"
```

---

## Task 2: Add `downloadSpeed` to socket event

**Files:**
- Modify: `server/index.js` (two locations, both `clientAdd` and the `resume` loop)
- Modify: `src/context/sockets.tsx`

- [ ] **Step 1: Add `downloadSpeed` to `DownloadItem` type**

In `src/context/sockets.tsx`, update the `DownloadItem` type:

```ts
export type DownloadItem = {
  itemId: string
  infoHash: string
  theMovieDbId: number
  title: string
  size: number
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
  downloadSpeed: number
}
```

- [ ] **Step 2: Add `downloadSpeed` to the first socket emit in `server/index.js`**

Find the `clientAdd` function (~line 47). Update the `downloadData` object:

```js
const downloadData = {
  itemId: id,
  infoHash: torrent.infoHash,
  theMovieDbId,
  peers: torrent.numPeers,
  downloaded: torrent.downloaded,
  timeRemaining: torrent.timeRemaining,
  progress: torrent.progress,
  downloadSpeed: torrent.downloadSpeed,
}
```

- [ ] **Step 3: Add `downloadSpeed` to the second socket emit (resume loop)**

Find the second `torrent.on('download', ...)` block (~line 154). Update its emit payload the same way:

```js
_socket.emit('downloaded', {
  itemId: arg.itemId,
  infoHash: torrent.infoHash,
  theMovieDbId: arg.theMovieDbId,
  peers: torrent.numPeers,
  downloaded: torrent.downloaded,
  timeRemaining: torrent.timeRemaining,
  progress: torrent.progress,
  downloadSpeed: torrent.downloadSpeed,
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/sockets.tsx server/index.js
git commit -m "feat(player): add downloadSpeed to socket download event"
```

---

## Task 3: Create local subtitle routes

**Files:**
- Create: `server/routes/local-subtitles.js`

- [ ] **Step 1: Create the route file**

Create `server/routes/local-subtitles.js`:

```js
import express from 'express'
import fs from 'fs'
import path from 'path'
import { staticConfig } from '../config.js'

const router = express.Router()
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass'])

router.get('/local-subtitles/:infoHash', (req, res) => {
  const { infoHash } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const dir = path.join(staticConfig.downloadsPath, infoHash)
  if (!fs.existsSync(dir)) return res.json([])

  try {
    const files = fs.readdirSync(dir)
    const subtitles = files
      .filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(filename => ({
        filename,
        url: `/api/subtitle-file/${infoHash}/${encodeURIComponent(filename)}`,
      }))
    res.json(subtitles)
  } catch {
    res.json([])
  }
})

router.get('/subtitle-file/:infoHash/:filename', (req, res) => {
  const { infoHash, filename } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const decoded = decodeURIComponent(filename)
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filePath = path.resolve(staticConfig.downloadsPath, infoHash, decoded)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  res.sendFile(filePath)
})

export default router
```

- [ ] **Step 2: Register route in `server/index.js`**

Add import near the other route imports at the top of `server/index.js`:

```js
import localSubtitlesRouter from './routes/local-subtitles.js'
```

Add route registration after the existing `app.use('/api', requireAuth, subtitlesRouter)` line:

```js
app.use('/api', requireAuth, localSubtitlesRouter)
```

- [ ] **Step 3: Restart the server and verify endpoints respond**

```bash
cd server && npm start
```

In another terminal (replace `<TOKEN>` with a valid JWT from `localStorage.getItem('token')` in the browser):

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5174/api/local-subtitles/0000000000000000000000000000000000000000
```
Expected: `[]` (empty array, not a 404 or 500).

- [ ] **Step 4: Commit**

```bash
git add server/routes/local-subtitles.js server/index.js
git commit -m "feat(player): add local subtitle discovery and file serving routes"
```

---

## Task 4: Add `itemId` to player navigation links

**Files:**
- Modify: `src/components/movie/movie-hero.tsx`
- Modify: `src/components/movie/downloads-tab.tsx`
- Modify: `src/pages/downloads.tsx`

The subtitle panel needs a TMDB ID to link back to the movie detail page. We add it as an optional `itemId` search param.

- [ ] **Step 1: Update `movie-hero.tsx`**

Find the `Link` to the player (~line 79). The component already has `movie.id` (TMDB ID). Update:

```tsx
to={`/player/${watchInfoHash}?title=${encodeURIComponent(movie.title ?? "")}&itemId=${movie.id}`}
```

- [ ] **Step 2: Update `downloads-tab.tsx` active downloads row**

Find the active download `Link` to the player (~line 77). The `item` object has `theMovieDbId`. Update:

```tsx
to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}&itemId=${item.theMovieDbId}`}
```

- [ ] **Step 3: Update `downloads-tab.tsx` completed downloads row**

`CompletedDownloadRow` is at ~line 101. Add `theMovieDbId` to its props:

```tsx
function CompletedDownloadRow({
  row,
  title,
  theMovieDbId,
}: {
  row: CompletedRow;
  title: string;
  theMovieDbId: number;
}) {
```

Update the `Link` inside (`to=` ~line 147):

```tsx
to={`/player/${row.info_hash}?title=${encodeURIComponent(row.title ?? title)}&itemId=${theMovieDbId}`}
```

Find where `CompletedDownloadRow` is rendered (~line 232) and pass the `movieId` that is already in scope:

```tsx
<CompletedDownloadRow
  key={row.info_hash}
  row={row}
  title={title}
  theMovieDbId={movieId}
/>
```

- [ ] **Step 4: Update `src/pages/downloads.tsx`**

For active downloads (~line 68), `item` is a `DownloadItem` which has `theMovieDbId`:

```tsx
to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}&itemId=${item.theMovieDbId}`}
```

For completed downloads (~line 137), the link is inside a `data.map((movie) => ...)` block where `movie.id` is the TMDB ID:

```tsx
to={`/player/${row.info_hash}?title=${encodeURIComponent(movie.title ?? "")}&itemId=${movie.id}`}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/movie/movie-hero.tsx src/components/movie/downloads-tab.tsx src/pages/downloads.tsx
git commit -m "feat(player): pass itemId to player navigation for subtitle link"
```

---

## Task 5: Create `DownloadStatusPanel`

**Files:**
- Create: `src/components/player/DownloadStatusPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/player/DownloadStatusPanel.tsx`:

```tsx
import { X } from 'lucide-react'
import { useSocketContext } from '@/context/sockets'
import { formatBytes, formatDuration } from '@/utils/format'

type Props = {
  infoHash: string
  onClose: () => void
}

export default function DownloadStatusPanel({ infoHash, onClose }: Props) {
  const { activeDownloads } = useSocketContext()
  const item = activeDownloads.find(d => d.infoHash === infoHash)

  if (!item) return null

  return (
    <div className="absolute top-6 right-6 w-72 backdrop-blur-xl bg-white/70 p-5 rounded-xl border border-white/30 shadow-xl flex flex-col gap-4 z-20">
      <div className="flex items-center justify-between">
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Live Archive Sync
        </span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          style={{ color: '#444651' }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
            Downloading
          </span>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}
          >
            {Math.round(item.progress * 100)}%
          </span>
        </div>

        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e0e2e7' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${item.progress * 100}%`, background: '#3e56aa' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-y-4 pt-2">
          {item.downloadSpeed > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
                Speed
              </span>
              <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
                {formatBytes(item.downloadSpeed)}/s
              </span>
            </div>
          )}
          {item.timeRemaining > 0 && (
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
                ETA
              </span>
              <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
                {formatDuration(item.timeRemaining)}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
              Peers
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
              {item.peers}
            </span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
              Downloaded
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
              {formatBytes(item.downloaded)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/player/DownloadStatusPanel.tsx
git commit -m "feat(player): add DownloadStatusPanel component"
```

---

## Task 6: Create `SubtitlePanel`

**Files:**
- Create: `src/components/player/SubtitlePanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/player/SubtitlePanel.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type Subtitle = {
  filename: string
  url: string
}

type Props = {
  infoHash: string
  itemId: string
  onClose: () => void
  onSelect: (url: string) => void
}

export default function SubtitlePanel({ infoHash, itemId, onClose, onSelect }: Props) {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function fetchSubtitles() {
    const token = localStorage.getItem('token') ?? ''
    setLoading(true)
    setError(false)
    fetch(`/api/local-subtitles/${infoHash}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<Subtitle[]>
      })
      .then(data => {
        setSubtitles(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSubtitles()
  }, [infoHash])

  return (
    <div
      className="absolute bottom-28 right-6 w-80 backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl z-20 overflow-hidden"
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Subtitles
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-6">
          <Loader2 size={20} className="animate-spin" style={{ color: '#3e56aa' }} />
        </div>
      )}

      {error && (
        <div className="p-4 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
          Could not load subtitles.{' '}
          <button onClick={fetchSubtitles} className="underline" style={{ color: '#3e56aa' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && subtitles.length === 0 && (
        <div className="p-4 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
          No subtitles downloaded.{' '}
          {itemId && (
            <Link
              to={`/movie/${itemId}`}
              className="hover:underline"
              style={{ color: '#3e56aa' }}
              onClick={onClose}
            >
              Go to details page to download subtitles →
            </Link>
          )}
        </div>
      )}

      {!loading && !error && subtitles.length > 0 && (
        <ul>
          {subtitles.map(sub => (
            <li key={sub.filename}>
              <button
                className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#f2f4f9]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#181c20' }}
                onClick={() => {
                  const token = localStorage.getItem('token') ?? ''
                  onSelect(`${sub.url}?token=${encodeURIComponent(token)}`)
                }}
              >
                {sub.filename}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/player/SubtitlePanel.tsx
git commit -m "feat(player): add SubtitlePanel component"
```

---

## Task 7: Create `PlayerControls`

**Files:**
- Create: `src/components/player/PlayerControls.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/player/PlayerControls.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Captions,
  Download,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import SubtitlePanel from './SubtitlePanel'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>
  infoHash: string
  title: string
  itemId: string
  showDownloadPanel: boolean
  onToggleDownloadPanel: () => void
  onSubtitleSelect: (url: string) => void
}

export default function PlayerControls({
  videoRef,
  infoHash,
  title,
  itemId,
  showDownloadPanel,
  onToggleDownloadPanel,
  onSubtitleSelect,
}: Props) {
  const navigate = useNavigate()
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMetadata = () => setDuration(video.duration)
    const onVolumeChange = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [videoRef])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (playing) video.pause()
    else video.play()
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Number(e.target.value)
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    video.volume = Number(e.target.value)
    video.muted = false
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  function skipForward() {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(video.currentTime + 10, duration)
  }

  function toggleFullscreen() {
    const container = videoRef.current?.parentElement
    if (!container) return
    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(0deg, rgba(24,28,32,0.9) 0%, rgba(24,28,32,0.4) 30%, rgba(24,28,32,0) 100%)',
        }}
      />

      {/* Back button */}
      <button
        className="absolute top-6 left-6 p-3 rounded-full text-white transition-all pointer-events-auto"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Subtitle panel */}
      {showSubtitlePanel && (
        <div className="pointer-events-auto">
          <SubtitlePanel
            infoHash={infoHash}
            itemId={itemId}
            onClose={() => setShowSubtitlePanel(false)}
            onSelect={url => {
              onSubtitleSelect(url)
              setShowSubtitlePanel(false)
            }}
          />
        </div>
      )}

      {/* Controls bar */}
      <div className="relative z-10 flex flex-col gap-4 p-6 md:p-10 pointer-events-auto">
        {/* Scrubber */}
        <div className="relative w-full h-1.5 group cursor-pointer">
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div
            className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : '0%',
              background: '#5870c5',
            }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-[#dce1ff] transition-colors">
              {playing
                ? <Pause size={36} fill="white" strokeWidth={0} />
                : <Play size={36} fill="white" strokeWidth={0} />
              }
            </button>

            <button onClick={skipForward} className="text-white/80 hover:text-white transition-colors">
              <SkipForward size={22} fill="white" strokeWidth={0} />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                {muted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolume}
                className="w-20 cursor-pointer accent-white"
              />
            </div>

            <span
              className="text-sm tabular-nums"
              style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            <button
              onClick={onToggleDownloadPanel}
              className="flex items-center gap-2 transition-colors"
              style={{ color: showDownloadPanel ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              <Download size={18} />
              <span
                className="text-xs tracking-widest uppercase hidden md:block"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Status
              </span>
            </button>

            <button
              onClick={() => setShowSubtitlePanel(v => !v)}
              className="flex items-center gap-2 transition-colors"
              style={{ color: showSubtitlePanel ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              <Captions size={18} />
              <span
                className="text-xs tracking-widest uppercase hidden md:block"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Subtitles
              </span>
            </button>

            <button className="text-white/80 hover:text-white transition-colors">
              <Settings size={18} />
            </button>

            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint**

```bash
npm run build && npm run lint
```
Expected: no errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/player/PlayerControls.tsx
git commit -m "feat(player): add custom PlayerControls component"
```

---

## Task 8: Refactor `player.tsx`

**Files:**
- Modify: `src/pages/player.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the contents of `src/pages/player.tsx` with:

```tsx
import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PlayerControls from '@/components/player/PlayerControls'
import DownloadStatusPanel from '@/components/player/DownloadStatusPanel'

export default function PlayerPage() {
  const { infoHash } = useParams<{ infoHash: string }>()
  const [searchParams] = useSearchParams()
  const title = searchParams.get('title') ?? 'Sem título'
  const itemId = searchParams.get('itemId') ?? ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDownloadPanel, setShowDownloadPanel] = useState(true)
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null)

  if (!infoHash) return null

  const token = localStorage.getItem('token') ?? ''
  const streamUrl = `/api/stream/${infoHash}?token=${encodeURIComponent(token)}`

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#f7f9fe', padding: '4rem 1rem 2rem' }}
    >
      <div className="relative w-full max-w-screen-2xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          key={infoHash}
          src={streamUrl}
          autoPlay
          className="w-full h-full object-contain"
        >
          {activeSubtitleUrl && (
            <track kind="subtitles" src={activeSubtitleUrl} default />
          )}
        </video>

        <PlayerControls
          videoRef={videoRef}
          infoHash={infoHash}
          title={title}
          itemId={itemId}
          showDownloadPanel={showDownloadPanel}
          onToggleDownloadPanel={() => setShowDownloadPanel(v => !v)}
          onSubtitleSelect={setActiveSubtitleUrl}
        />

        {showDownloadPanel && (
          <DownloadStatusPanel
            infoHash={infoHash}
            onClose={() => setShowDownloadPanel(false)}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint**

```bash
npm run build && npm run lint
```
Expected: no errors or warnings.

- [ ] **Step 3: Start both servers and test manually**

In two terminals:

```bash
# Terminal 1
npm run dev

# Terminal 2
cd server && npm start
```

Navigate to a downloaded video's player page. Verify:
- [ ] Video plays with custom controls visible
- [ ] Play/pause button toggles correctly
- [ ] Scrubber moves as video plays; dragging it seeks
- [ ] Volume slider works; mute button toggles
- [ ] Time display updates (MM:SS / MM:SS format)
- [ ] Skip forward (+10s) works
- [ ] Fullscreen button works
- [ ] Back button navigates back
- [ ] Download status panel appears when a download is in progress (toggle with Status button)
- [ ] Subtitles button opens the panel; shows "No subtitles downloaded" if none; shows list if .srt/.vtt files exist in `server/downloads/:infoHash/`
- [ ] Selecting a subtitle activates it on the video
- [ ] Page background is `#f7f9fe` (light, not black)

- [ ] **Step 4: Commit**

```bash
git add src/pages/player.tsx
git commit -m "feat(player): refactor player page to Cinematic Archive design"
```
