# syntax=docker/dockerfile:1

# Stage 1: Install and compile backend dependencies
# node-datachannel (webtorrent dep) fetches libdatachannel source via cmake during build,
# so cmake and git are required in addition to the standard node-gyp toolchain.
FROM node:24-slim AS server-deps
WORKDIR /app/server
RUN apt-get update && apt-get install -y python3 make g++ cmake git \
    && rm -rf /var/lib/apt/lists/*
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
