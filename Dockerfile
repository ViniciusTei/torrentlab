# Stage 1: Build frontend (uses pre-installed node_modules from build context)
FROM node:24 AS frontend
WORKDIR /app
COPY . .
RUN node_modules/.bin/vite build

# Stage 2: Production runtime (node:24 to match host-compiled native modules)
FROM node:24-slim
WORKDIR /app

COPY server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=frontend /app/dist ./dist

RUN mkdir -p downloads db metadata

WORKDIR /app/server
ENV NODE_ENV=production \
    PORT=3000 \
    DOWNLOADS_PATH=/app/downloads \
    METADATA_PATH=/app/metadata \
    DB_PATH=/app/db/db.sql

EXPOSE 3000
CMD ["node", "index.js"]
