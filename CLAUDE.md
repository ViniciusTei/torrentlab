# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TorrentLab v2 — a torrent aggregator for searching and downloading movies/TV shows, with subtitle and metadata integration.

## Development Commands

**Frontend** (root directory, port 5173):
```bash
npm run dev        # start Vite dev server
npm run build      # type-check + production build
npm run lint       # ESLint (zero warnings allowed)
npm run preview    # preview production build
```

**Backend** (`/server` directory, port 5174):
```bash
cd server && npm start   # start Express + Socket.IO server
```

Both must run simultaneously during development. No Docker — requires local Node.js.

## Architecture

**Frontend** (`/src`): React 18 + TypeScript + Vite. Routing via React Router v6 with loaders in `router.tsx`. Data fetching via TanStack React Query. Real-time via Socket.IO client. UI via shadcn/ui (Radix + Tailwind). Path alias `@/` maps to `src/`.

**Backend** (`/server/index.js`): Single-file Express server with Socket.IO and WebTorrent in-process. SQLite (`db.sql`) tracks downloads. Torrent metadata stored in `/server/metadata/`, files in `/server/downloads/` (both gitignored).

## Key Patterns

**External API Clients** (in `src/services/`):
- `movies.ts` — TheMovieDB (Bearer token auth, metadata + images)
- `torrents.ts` — Jackett (API key) + OMDB (IMDb ID resolution)
- `subtitles.ts` — OpenSubtitles (email/password from `.env`, returns session token)
- `api.ts` — singleton aggregating the above

**Data flow for downloads**:
1. Frontend emits `download` socket event with magnet link + `itemId`
2. Backend adds to WebTorrent, emits `downloaded` progress events
3. `useSockets.ts` hook handles incoming events, updates `SocketContext`
4. `SocketContext` (`src/context/sockets.tsx`) holds `DownloadItem[]` state for progress UI
5. On completion, backend writes to SQLite and emits `done`

**React hooks**:
- `useServices()` — React Query hooks wrapping API calls
- `useSockets()` — Socket.IO event listeners, updates context
- `useSocketContext()` — consume download state in components

## Environment Variables

Frontend env vars (prefix `VITE_`) in `.env`:
- `VITE_SUBTITLES_EMAIL`, `VITE_SUBTITLES_KEY`, `VITE_SUBTITLES_PASS` — OpenSubtitles credentials

API keys for TheMovieDB and Jackett are hardcoded in `src/services/movies.ts` and `src/services/torrents.ts` respectively.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query, Socket.IO client, Axios
- Backend: Node.js ESM, Express, Socket.IO, WebTorrent, SQLite3
- External: TheMovieDB, Jackett, OMDB, OpenSubtitles
