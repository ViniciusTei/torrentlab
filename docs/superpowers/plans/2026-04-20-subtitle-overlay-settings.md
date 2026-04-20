# Subtitle Overlay & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render SRT subtitles as a custom overlay on the video player and add a Settings popover for configuring font size, text color, background opacity, and vertical position.

**Architecture:** Parse SRT text into `CueEntry[]` in the frontend using a pure utility function; render the active cue as an absolutely-positioned `<div>` overlay on the video. A `useSubtitleSettings` hook manages style preferences persisted to localStorage. The existing Settings button opens a `SettingsPanel` popover.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, localStorage

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/parseSrt.ts` | Pure SRT parser → `CueEntry[]` |
| Create | `src/hooks/useSubtitleSettings.ts` | Settings state + localStorage |
| Create | `src/components/player/SubtitleOverlay.tsx` | Overlay div showing active cue |
| Create | `src/components/player/SettingsPanel.tsx` | Settings popover UI |
| Modify | `src/pages/player.tsx` | Fetch SRT, parse, pass cues + settings down |
| Modify | `src/components/player/PlayerControls.tsx` | Wire settings button, receive cues, render overlay + panel |

---

## Task 1: SRT Parser

**Files:**
- Create: `src/lib/parseSrt.ts`

- [ ] **Step 1: Create the parser**

Create `src/lib/parseSrt.ts` with the following content:

```ts
export type CueEntry = {
  start: number // seconds
  end: number   // seconds
  text: string
}

function timeToSeconds(time: string): number {
  // Accepts HH:MM:SS,mmm or HH:MM:SS.mmm
  const [hms, ms] = time.replace('.', ',').split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + Number(ms ?? 0) / 1000
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

export function parseSrt(raw: string): CueEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split(/\n{2,}/)
  const cues: CueEntry[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // First line is the cue index (number) — skip it
    const timeLine = lines[1]
    const textLines = lines.slice(2)

    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    )
    if (!timeMatch) continue

    const start = timeToSeconds(timeMatch[1])
    const end = timeToSeconds(timeMatch[2])
    const text = textLines.map(stripHtml).join('\n').trim()

    if (text) {
      cues.push({ start, end, text })
    }
  }

  return cues
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/parseSrt.ts
git commit -m "feat: add SRT parser utility"
```

---

## Task 2: useSubtitleSettings Hook

**Files:**
- Create: `src/hooks/useSubtitleSettings.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSubtitleSettings.ts`:

```ts
import { useCallback, useState } from 'react'

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'
export type SubtitlePosition = 'bottom' | 'middle' | 'top'

export type SubtitleSettings = {
  fontSize: FontSize
  color: string
  bgOpacity: number
  position: SubtitlePosition
}

const STORAGE_KEY = 'subtitle-settings'

const DEFAULTS: SubtitleSettings = {
  fontSize: 'medium',
  color: '#ffffff',
  bgOpacity: 0.6,
  position: 'bottom',
}

function loadFromStorage(): SubtitleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function useSubtitleSettings(): [SubtitleSettings, (patch: Partial<SubtitleSettings>) => void] {
  const [settings, setSettings] = useState<SubtitleSettings>(loadFromStorage)

  const updateSettings = useCallback((patch: Partial<SubtitleSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable — proceed without persisting
      }
      return next
    })
  }, [])

  return [settings, updateSettings]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSubtitleSettings.ts
git commit -m "feat: add useSubtitleSettings hook with localStorage persistence"
```

---

## Task 3: SubtitleOverlay Component

**Files:**
- Create: `src/components/player/SubtitleOverlay.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/player/SubtitleOverlay.tsx`:

```tsx
import type { CueEntry } from '@/lib/parseSrt'
import type { SubtitleSettings } from '@/hooks/useSubtitleSettings'

const FONT_SIZE_MAP: Record<SubtitleSettings['fontSize'], number> = {
  small: 16,
  medium: 20,
  large: 26,
  xlarge: 32,
}

type Props = {
  cues: CueEntry[]
  currentTime: number
  settings: SubtitleSettings
}

export default function SubtitleOverlay({ cues, currentTime, settings }: Props) {
  const activeCue = cues.find(c => currentTime >= c.start && currentTime <= c.end)

  if (!activeCue) return null

  const positionStyle: React.CSSProperties =
    settings.position === 'bottom'
      ? { bottom: '10%', left: 0, right: 0 }
      : settings.position === 'top'
      ? { top: '10%', left: 0, right: 0 }
      : { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }

  return (
    <div
      className="absolute pointer-events-none flex justify-center px-4"
      style={positionStyle}
    >
      <span
        style={{
          display: 'inline-block',
          fontSize: FONT_SIZE_MAP[settings.fontSize],
          color: settings.color,
          background: `rgba(0,0,0,${settings.bgOpacity})`,
          padding: '4px 12px',
          borderRadius: 6,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.4,
        }}
      >
        {activeCue.text}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/SubtitleOverlay.tsx
git commit -m "feat: add SubtitleOverlay component"
```

---

## Task 4: SettingsPanel Component

**Files:**
- Create: `src/components/player/SettingsPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/player/SettingsPanel.tsx`:

```tsx
import type { SubtitleSettings } from '@/hooks/useSubtitleSettings'

const FONT_SIZES: { label: string; value: SubtitleSettings['fontSize'] }[] = [
  { label: 'S', value: 'small' },
  { label: 'M', value: 'medium' },
  { label: 'L', value: 'large' },
  { label: 'XL', value: 'xlarge' },
]

const POSITIONS: { label: string; value: SubtitleSettings['position'] }[] = [
  { label: 'Top', value: 'top' },
  { label: 'Middle', value: 'middle' },
  { label: 'Bottom', value: 'bottom' },
]

const COLOR_SWATCHES = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Green', value: '#4ade80' },
]

type Props = {
  settings: SubtitleSettings
  onUpdate: (patch: Partial<SubtitleSettings>) => void
}

export default function SettingsPanel({ settings, onUpdate }: Props) {
  return (
    <div
      className="absolute bottom-28 right-6 w-72 backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl z-20 overflow-hidden"
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}
      >
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Subtitle Settings
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">
        {/* Font Size */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Font Size
          </span>
          <div className="flex gap-1">
            {FONT_SIZES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onUpdate({ fontSize: value })}
                className="flex-1 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: settings.fontSize === value ? '#3e56aa' : 'rgba(62,86,170,0.08)',
                  color: settings.fontSize === value ? '#fff' : '#3e56aa',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Text Color
          </span>
          <div className="flex items-center gap-2">
            {COLOR_SWATCHES.map(({ label, value }) => (
              <button
                key={value}
                title={label}
                onClick={() => onUpdate({ color: value })}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{
                  background: value,
                  borderColor: settings.color === value ? '#3e56aa' : 'transparent',
                  boxShadow: settings.color === value ? '0 0 0 2px rgba(62,86,170,0.3)' : undefined,
                }}
              />
            ))}
            <label
              title="Custom color"
              className="w-7 h-7 rounded-full border-2 overflow-hidden cursor-pointer flex items-center justify-center transition-all"
              style={{
                borderColor: !COLOR_SWATCHES.some(s => s.value === settings.color) ? '#3e56aa' : 'rgba(0,0,0,0.15)',
                background: settings.color,
              }}
            >
              <input
                type="color"
                value={settings.color}
                onChange={e => onUpdate({ color: e.target.value })}
                className="opacity-0 absolute w-0 h-0"
              />
              {COLOR_SWATCHES.some(s => s.value === settings.color) && (
                <span className="text-[10px] text-black/40 select-none">+</span>
              )}
            </label>
          </div>
        </div>

        {/* Background Opacity */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Background Opacity — {Math.round(settings.bgOpacity * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.bgOpacity}
            onChange={e => onUpdate({ bgOpacity: Number(e.target.value) })}
            className="w-full cursor-pointer accent-[#3e56aa]"
          />
        </div>

        {/* Position */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Position
          </span>
          <div className="flex gap-1">
            {POSITIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onUpdate({ position: value })}
                className="flex-1 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: settings.position === value ? '#3e56aa' : 'rgba(62,86,170,0.08)',
                  color: settings.position === value ? '#fff' : '#3e56aa',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel component for subtitle configuration"
```

---

## Task 5: Wire player.tsx — Fetch & Parse SRT

**Files:**
- Modify: `src/pages/player.tsx`

- [ ] **Step 1: Update player.tsx**

Replace the entire content of `src/pages/player.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PlayerControls from '@/components/player/PlayerControls'
import DownloadStatusPanel from '@/components/player/DownloadStatusPanel'
import { parseSrt, type CueEntry } from '@/lib/parseSrt'
import { useSubtitleSettings } from '@/hooks/useSubtitleSettings'

export default function PlayerPage() {
  const { infoHash } = useParams<{ infoHash: string }>()
  const [searchParams] = useSearchParams()
  const itemId = searchParams.get('itemId') ?? ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDownloadPanel, setShowDownloadPanel] = useState(true)
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null)
  const [cues, setCues] = useState<CueEntry[]>([])
  const [settings, updateSettings] = useSubtitleSettings()

  useEffect(() => {
    if (!activeSubtitleUrl) {
      setCues([])
      return
    }
    fetch(activeSubtitleUrl)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.text()
      })
      .then(text => setCues(parseSrt(text)))
      .catch(() => setCues([]))
  }, [activeSubtitleUrl])

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
        />

        <PlayerControls
          videoRef={videoRef}
          infoHash={infoHash}
          itemId={itemId}
          showDownloadPanel={showDownloadPanel}
          onToggleDownloadPanel={() => setShowDownloadPanel(v => !v)}
          onSubtitleSelect={setActiveSubtitleUrl}
          cues={cues}
          settings={settings}
          onUpdateSettings={updateSettings}
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

Note: the `<video>` element no longer has a `<track>` child — subtitle rendering is handled entirely by the overlay.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/torrentlab && npm run build 2>&1 | head -40
```

Expected: TypeScript errors about `cues`, `settings`, `onUpdateSettings` not existing on `PlayerControls` props — this is expected; Task 6 fixes them.

- [ ] **Step 3: Commit**

```bash
git add src/pages/player.tsx
git commit -m "feat: fetch and parse SRT on subtitle select, pass cues and settings to controls"
```

---

## Task 6: Wire PlayerControls.tsx — Overlay & Settings Panel

**Files:**
- Modify: `src/components/player/PlayerControls.tsx`

- [ ] **Step 1: Update PlayerControls.tsx**

Replace the entire content of `src/components/player/PlayerControls.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
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
import SubtitleOverlay from './SubtitleOverlay'
import SettingsPanel from './SettingsPanel'
import type { CueEntry } from '@/lib/parseSrt'
import type { SubtitleSettings } from '@/hooks/useSubtitleSettings'

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
  itemId: string
  showDownloadPanel: boolean
  onToggleDownloadPanel: () => void
  onSubtitleSelect: (url: string) => void
  cues: CueEntry[]
  settings: SubtitleSettings
  onUpdateSettings: (patch: Partial<SubtitleSettings>) => void
}

export default function PlayerControls({
  videoRef,
  infoHash,
  itemId,
  showDownloadPanel,
  onToggleDownloadPanel,
  onSubtitleSelect,
  cues,
  settings,
  onUpdateSettings,
}: Props) {
  const navigate = useNavigate()
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

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

  // Close settings panel on outside click (but not when clicking the settings button itself)
  useEffect(() => {
    if (!showSettingsPanel) return
    function handleClick(e: MouseEvent) {
      if (settingsButtonRef.current?.contains(e.target as Node)) return
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setShowSettingsPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSettingsPanel])

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

  function handleSubtitleButtonClick() {
    setShowSubtitlePanel(v => !v)
    setShowSettingsPanel(false)
  }

  function handleSettingsButtonClick() {
    setShowSettingsPanel(v => !v)
    setShowSubtitlePanel(false)
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

      {/* Subtitle overlay */}
      <SubtitleOverlay cues={cues} currentTime={currentTime} settings={settings} />

      {/* Back button */}
      <button
        aria-label="Go back"
        className="absolute top-6 left-6 p-3 rounded-full text-white bg-black/20 hover:bg-black/40 backdrop-blur-md transition-all pointer-events-auto"
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

      {/* Settings panel */}
      {showSettingsPanel && (
        <div ref={settingsPanelRef} className="pointer-events-auto">
          <SettingsPanel settings={settings} onUpdate={onUpdateSettings} />
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
              onClick={handleSubtitleButtonClick}
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

            <button
              ref={settingsButtonRef}
              aria-label="Settings"
              onClick={handleSettingsButtonClick}
              className="transition-colors"
              style={{ color: showSettingsPanel ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
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

- [ ] **Step 2: Verify the build passes**

```bash
cd /path/to/torrentlab && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: No errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/player/PlayerControls.tsx
git commit -m "feat: wire subtitle overlay and settings panel into player controls"
```

---

## Task 7: Smoke Test

- [ ] **Step 1: Start both servers**

Terminal 1 (frontend):
```bash
npm run dev
```

Terminal 2 (backend):
```bash
cd server && npm start
```

- [ ] **Step 2: Verify subtitle rendering**

1. Open the player for any downloaded item
2. Click **Subtitles** → select an `.srt` subtitle file
3. Confirm subtitle text appears overlaid on the video in white, at the bottom

- [ ] **Step 3: Verify settings controls**

1. Click **Settings** (gear icon)
2. Confirm the SettingsPanel popover opens above the controls bar
3. Change **Font Size** to XL — confirm subtitle text grows
4. Change **Text Color** to yellow — confirm subtitle text turns yellow
5. Drag **Background Opacity** to 0% — confirm background disappears
6. Change **Position** to Top — confirm subtitles move to the top of the video
7. Reload the page — confirm settings are restored from localStorage

- [ ] **Step 4: Verify mutual exclusion**

1. Open the Subtitles panel
2. Click Settings — confirm Subtitles panel closes and Settings panel opens
3. Click outside the Settings panel — confirm it closes

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: subtitle overlay and settings panel complete"
```
