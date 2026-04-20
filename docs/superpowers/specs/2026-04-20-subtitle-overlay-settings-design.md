# Subtitle Overlay & Settings Design

**Date:** 2026-04-20  
**Status:** Approved

## Problem

Subtitles are selected in the player but never rendered. The current implementation attaches an `.srt` file via a `<track>` element, but browsers require WebVTT format — `.srt` files are silently ignored. Additionally, the Settings button exists in the controls bar but does nothing.

## Approach

Parse SRT files in the frontend and render a custom `<div>` overlay on top of the video. This gives full control over subtitle styling. The Settings button opens a popover for users to configure subtitle appearance. Settings are persisted to localStorage.

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/lib/parseSrt.ts` | Pure function: `parseSrt(text: string) → CueEntry[]` |
| `src/hooks/useSubtitleSettings.ts` | Settings state + localStorage persistence |
| `src/components/player/SubtitleOverlay.tsx` | Overlay div rendering the active cue |
| `src/components/player/SettingsPanel.tsx` | Settings popover opened from the Settings button |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/player.tsx` | Fetch SRT text on subtitle select, parse it, pass cues + settings down |
| `src/components/player/PlayerControls.tsx` | Wire Settings button, receive cues + currentTime, render overlay and settings panel |

### Data Flow

1. User selects a subtitle → `activeSubtitleUrl` set (existing behavior)
2. `player.tsx` fetches the SRT text, calls `parseSrt()`, stores `CueEntry[]` in state
3. `PlayerControls` receives `cues` and `currentTime` (already tracked via `timeupdate`)
4. `SubtitleOverlay` finds the active cue: `cues.find(c => currentTime >= c.start && currentTime <= c.end)`
5. Renders the cue text with styles derived from `SubtitleSettings`
6. Settings button toggles `SettingsPanel` popover; changes update `useSubtitleSettings` and write to localStorage

---

## Data Shapes

### CueEntry

```ts
type CueEntry = {
  start: number   // seconds
  end: number     // seconds
  text: string    // plain text, multi-line joined with \n
}
```

### SubtitleSettings

```ts
type SubtitleSettings = {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'  // 16 / 20 / 26 / 32px
  color: string        // hex color, default '#ffffff'
  bgOpacity: number    // 0–1, default 0.6
  position: 'bottom' | 'middle' | 'top'
}
```

Default: `{ fontSize: 'medium', color: '#ffffff', bgOpacity: 0.6, position: 'bottom' }`  
localStorage key: `subtitle-settings`

---

## Components

### `parseSrt.ts`

Pure utility. Handles:
- Windows (`\r\n`) and Unix (`\n`) line endings
- Multi-line cue text (joined with `\n`)
- HTML tags in cue text (stripped)
- Malformed blocks (silently skipped)
- Timestamps in `HH:MM:SS,mmm` format, converted to seconds

### `useSubtitleSettings`

Custom hook. Reads initial state from localStorage on mount, writes on every change. Exports `[settings, updateSettings]`.

### `SubtitleOverlay`

- Absolutely positioned over the video, `pointer-events-none`
- Vertical placement: `bottom: 10%` (bottom), `top: 50% translateY(-50%)` (middle), `top: 10%` (top)
- Text wrapped in a semi-transparent pill with `background: rgba(0,0,0,{bgOpacity})`
- Text style: `fontSize` mapped to px, `color` from settings
- Renders nothing when no active cue

### `SettingsPanel`

Floating card anchored above the Settings button (bottom-right). Closes on outside click or Settings button re-click. Closes automatically if the subtitle panel opens (they share the same corner area).

Controls:
- **Font size** — 4-button toggle: S / M / L / XL
- **Text color** — swatches: white, yellow, cyan, green + native `<input type="color">` for custom
- **Background opacity** — range slider 0–100%
- **Position** — 3-button toggle: Top / Middle / Bottom

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| SRT fetch fails after subtitle select | Overlay stays empty; no error shown (selection handles state) |
| currentTime between cues | Overlay renders nothing |
| currentTime after last cue | Overlay renders nothing |
| Fullscreen | Overlay and settings panel are inside the container — work naturally |
| No subtitle selected | `cues` is empty array; overlay renders nothing |
| Malformed SRT blocks | Silently skipped by parser |
