# Docker Refactor Design

**Date:** 2026-04-21  
**Status:** Approved

## Problem

The current `Dockerfile` copies `node_modules` from the host build context instead of installing them inside Docker. This requires Node.js installed locally, `npm install` run in both root and `server/` before every build, and risks native module ABI mismatches if host and container Node versions differ.

## Goal

A fully self-contained Docker build that requires no local Node.js or pre-installed dependencies, with fast incremental rebuilds via BuildKit npm cache mounts.

## Approach

Multi-stage Dockerfile with BuildKit cache mounts (Option C). All three stages use `node:24-slim` so native modules (`sqlite3`, `bcrypt`, `webtorrent`) compile against the same libc and Node ABI as the production runtime.

## Dockerfile Stages

### Stage 1: `server-deps`
- Base: `node:24-slim`
- Copies `server/package.json` and `server/package-lock.json`
- Runs `npm ci` with `--mount=type=cache,target=/root/.npm`
- Installs build tools (`python3`, `make`, `g++`) needed for native module compilation via node-gyp
- Output: compiled `server/node_modules`

### Stage 2: `frontend-build`
- Base: `node:24-slim`
- Copies root `package.json` and `package-lock.json`
- Runs `npm ci` with `--mount=type=cache,target=/root/.npm`
- Copies all frontend source files
- Runs `npm run build` (tsc + vite build)
- Output: `/app/dist`

### Stage 3: `production`
- Base: `node:24-slim`
- Copies `server/` source files
- Copies `server/node_modules` from `server-deps`
- Copies `/app/dist` from `frontend-build`
- Creates `downloads`, `db`, `metadata` directories
- Sets `NODE_ENV=production` and path env vars
- Exposes port 3000
- CMD: `node index.js`

## docker-compose.yml Changes

- Add `env_file: .env` to the `app` service so API keys are picked up automatically without manual shell exports
- The existing `environment:` block is kept for compose-network-derived values (e.g. `JACKETT_URL`, `CORS_ORIGIN`) which take precedence over `.env`

## .dockerignore Changes

Add the following entries so host-installed modules are never sent as build context:

```
node_modules
server/node_modules
```

Existing entries (`dist`, `.env`, `data/`, `*.log`, `.git`, `docs/`) are retained.

## What Changes for the Developer

- No need to run `npm install` locally before `docker compose build`
- No need for Node.js installed on the deployment server
- `docker compose build` is slow on first run (native compilation), fast on subsequent runs when only source files change
- `docker compose up --build` is the full production workflow
