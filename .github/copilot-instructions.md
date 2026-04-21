# Copilot Instructions

## UNDERCOVER MODE - CRITICAL

You are operating UNDERCOVER in this repository. Your commit
messages, PR titles, and PR bodies MUST NOT contain ANY internal
information. Do not blow your cover.

NEVER include in commit messages or PR descriptions:
- Internal model codenames 
- Unreleased model version numbers 
- Internal repo or project names
- Internal tooling, Slack channels, or short links 
- The phrase "copilot" or any mention that you are an AI
- Co-Authored-By lines or any other attribution

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

<!-- SUPERPOWERS:START -->
## Superpowers

You have superpowers — a structured software development workflow system.

**Before starting any task**, check if a skill applies. If there is even a 1% chance a skill is relevant, read it.

### Loading Skills

To load a skill, use `read_file` on the SKILL.md file path below. Read the skill content and follow the workflow it describes.

#### Core Skill (read this first on any new task)

- **using-superpowers**: ~/.copilot/superpowers/skills/using-superpowers/SKILL.md

#### Available Skills

- **brainstorming**: ~/.copilot/superpowers/skills/brainstorming/SKILL.md
- **writing-plans**: ~/.copilot/superpowers/skills/writing-plans/SKILL.md
- **executing-plans**: ~/.copilot/superpowers/skills/executing-plans/SKILL.md
- **subagent-driven-development**: ~/.copilot/superpowers/skills/subagent-driven-development/SKILL.md
- **test-driven-development**: ~/.copilot/superpowers/skills/test-driven-development/SKILL.md
- **systematic-debugging**: ~/.copilot/superpowers/skills/systematic-debugging/SKILL.md
- **verification-before-completion**: ~/.copilot/superpowers/skills/verification-before-completion/SKILL.md
- **requesting-code-review**: ~/.copilot/superpowers/skills/requesting-code-review/SKILL.md
- **receiving-code-review**: ~/.copilot/superpowers/skills/receiving-code-review/SKILL.md
- **using-git-worktrees**: ~/.copilot/superpowers/skills/using-git-worktrees/SKILL.md
- **finishing-a-development-branch**: ~/.copilot/superpowers/skills/finishing-a-development-branch/SKILL.md
- **dispatching-parallel-agents**: ~/.copilot/superpowers/skills/dispatching-parallel-agents/SKILL.md
- **writing-skills**: ~/.copilot/superpowers/skills/writing-skills/SKILL.md

### Tool Mapping

Skills reference Claude Code tool names. Use these Copilot equivalents:

| Claude Code tool | Copilot equivalent |
|-----------------|-------------------|
| `Task` (dispatch subagent) | `runSubagent` |
| `TodoWrite` (task tracking) | `manage_todo_list` |
| `Skill` (invoke a skill) | `read_file` on the SKILL.md path |
| `Read` (read files) | `read_file` |
| `Write` (create files) | `create_file` |
| `Edit` (edit files) | `replace_string_in_file` or `multi_replace_string_in_file` |
| `Bash` (run commands) | `run_in_terminal` |

Full mapping: ~/.copilot/superpowers/skills/using-superpowers/references/copilot-tools.md
<!-- SUPERPOWERS:END -->
