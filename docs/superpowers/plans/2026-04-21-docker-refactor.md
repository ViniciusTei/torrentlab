# Docker Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Docker build fully self-contained — no local Node.js or pre-run `npm install` required — using a proper multi-stage Dockerfile with BuildKit npm cache mounts for fast incremental rebuilds.

**Architecture:** Three Dockerfile stages: `server-deps` compiles native modules, `frontend-build` runs the Vite build, `production` assembles only the runtime artifacts. BuildKit cache mounts on all `npm ci` calls so only changed layers re-run. The `.dockerignore` excludes host `node_modules` to prevent accidental context pollution.

**Tech Stack:** Docker BuildKit, node:24-slim, npm ci, Vite, node-gyp (sqlite3/bcrypt/webtorrent native compilation)

---

### Task 1: Update .dockerignore

**Files:**
- Modify: `.dockerignore`

- [ ] **Step 1: Add node_modules exclusions**

Replace the contents of `.dockerignore` with:

```
node_modules
server/node_modules
dist
.env
data/
*.log
.git
docs/
```

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: exclude node_modules from docker build context"
```

---

### Task 2: Rewrite Dockerfile with multi-stage BuildKit build

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Replace Dockerfile contents**

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Install and compile backend dependencies (native modules: sqlite3, bcrypt, webtorrent)
FROM node:24-slim AS server-deps
WORKDIR /app/server
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build frontend
FROM node:24-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:24-slim AS production
WORKDIR /app

COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=frontend-build /app/dist ./dist

RUN mkdir -p downloads db metadata

WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3000 \
    DOWNLOADS_PATH=/app/downloads \
    METADATA_PATH=/app/metadata \
    DB_PATH=/app/db/db.sql

EXPOSE 3000
CMD ["node", "index.js"]
```

- [ ] **Step 2: Verify the build succeeds**

Run from the project root:

```bash
docker build -t torrentlab:test .
```

Expected: build completes through all three stages with no errors. On first run, native module compilation in `server-deps` will take a few minutes. Subsequent runs with only source changes should be fast due to cache mounts.

If you see an error like `Error response from daemon: dockerfile parse error: unknown instruction: --mount`, your Docker version is older than 23 — run `DOCKER_BUILDKIT=1 docker build -t torrentlab:test .` instead.

- [ ] **Step 3: Verify the image runs**

```bash
docker run --rm -e NODE_ENV=production -p 3000:3000 torrentlab:test
```

Expected: server starts, logs show Express listening on port 3000. Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "feat: self-contained multi-stage Dockerfile with BuildKit cache mounts"
```

---

### Task 3: Add env_file to docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add env_file directive to app service**

In `docker-compose.yml`, add `env_file: .env` to the `app` service, directly above the `environment:` block:

```yaml
version: '3.9'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data/downloads:/app/downloads
      - ./data/db:/app/db
      - ./data/metadata:/app/metadata
    env_file: .env
    environment:
      - TMDB_TOKEN=${TMDB_TOKEN}
      - OMDB_API_KEY=${OMDB_API_KEY}
      - JACKETT_URL=http://jackett:9117
      - JACKETT_API_KEY=${JACKETT_API_KEY}
      - SUBTITLES_USERNAME=${SUBTITLES_USERNAME}
      - SUBTITLES_EMAIL=${SUBTITLES_EMAIL}
      - SUBTITLES_PASS=${SUBTITLES_PASS}
      - SUBTITLES_KEY=${SUBTITLES_KEY}
      - CORS_ORIGIN=*
    depends_on:
      - jackett
    restart: unless-stopped

  jackett:
    image: lscr.io/linuxserver/jackett:latest
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Sao_Paulo
      - AUTO_UPDATE=true
    volumes:
      - ./data/jackett:/config
      - ./data/downloads:/downloads
    ports:
      - "9117:9117"
    restart: unless-stopped
```

Note: `env_file` loads the `.env` file into the container. The `environment:` block still takes precedence for any keys defined in both places, so `JACKETT_URL` and `CORS_ORIGIN` (which are set explicitly) will always win.

- [ ] **Step 2: Verify compose config is valid**

```bash
docker compose config
```

Expected: prints the fully resolved compose config with no errors. Confirm env vars from `.env` appear under the `app` service's environment section.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: load .env file automatically in docker compose"
```

---

### Task 4: End-to-end smoke test

- [ ] **Step 1: Run full compose build and up**

```bash
docker compose up --build
```

Expected: both `app` and `jackett` services start. The `app` service logs show the Express server listening on port 3000. Jackett starts on port 9117.

- [ ] **Step 2: Confirm the app serves the frontend**

Open `http://localhost:3000` in a browser. Expected: the TorrentLab UI loads.

- [ ] **Step 3: Stop and clean up test image**

```bash
docker compose down
docker rmi torrentlab:test
```
