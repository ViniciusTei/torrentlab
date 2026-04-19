# Self-Hosting TorrentLab

This guide covers deploying TorrentLab on your own server using Docker Compose — the recommended approach for self-hosting.

---

## Prerequisites

- A Linux server (VPS, home server, Raspberry Pi 4+)
- [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- Ports **3000** (app) and **9117** (Jackett) reachable, or a reverse proxy in front of them

---

## Step 1: Get Your API Keys

You will need credentials from three external services before starting.

### TheMovieDB (TMDB)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/)
2. Go to **Settings → API** and request an API key (choose "Developer")
3. Copy the **API Read Access Token** (the long JWT starting with `eyJ...`) — this is your `TMDB_TOKEN`

### OpenSubtitles

1. Create a free account at [opensubtitles.com](https://www.opensubtitles.com/)
2. Go to **Profile → API Access** and generate an API key
3. You will need: your **username**, **email**, **password**, and the generated **API key**

### OMDB

1. Register at [omdbapi.com](https://www.omdbapi.com/apikey.aspx) — the free tier (1,000 requests/day) is sufficient
2. Activate your key via the confirmation email
3. Copy the key into `OMDB_API_KEY`

---

## Step 2: Clone the Repository

```bash
git clone https://github.com/ViniciusTei/torrentlab.git
cd torrentlab
```

---

## Step 3: Create the Environment File

Copy the example below into a `.env` file at the project root and fill in your keys:

```bash
# Required
TMDB_TOKEN=Bearer eyJ...your_token_here
OMDB_API_KEY=your_omdb_api_key

# Jackett — leave blank for now, you will add it after Jackett starts (Step 5)
JACKETT_API_KEY=

# OpenSubtitles
SUBTITLES_USERNAME=your_username
SUBTITLES_EMAIL=your@email.com
SUBTITLES_PASS=your_password
SUBTITLES_KEY=your_api_key

# Optional — only needed if you expose the app publicly with a specific origin
# CORS_ORIGIN=https://yourdomain.com
```

---

## Step 4: Start the Stack

```bash
docker compose up -d
```

This starts two containers:

| Container | Description | Port |
|-----------|-------------|------|
| `app` | TorrentLab frontend + backend | `3000` |
| `jackett` | Torrent indexer proxy | `9117` |

Data is persisted in the `./data/` directory:

```
data/
  downloads/   ← downloaded torrent files
  metadata/    ← .torrent metadata cache
  db/          ← SQLite database
  jackett/     ← Jackett configuration
```

---

## Step 5: Configure Jackett

1. Open Jackett at `http://your-server-ip:9117`
2. Click **Add Indexer** and add the trackers you want (e.g. YTS, RARBG, 1337x)
3. Copy the **API Key** shown at the top of the Jackett dashboard
4. Open TorrentLab at `http://your-server-ip:3000`

---

## Step 6: Create Your Account

On the first visit, TorrentLab will prompt you to create an admin account. Enter a username and password — this is the only account for the instance.

---

## Step 7: Finish Configuration in Settings

1. Log in and go to **Settings** (top-right menu)
2. Under **Conexões API**, paste your Jackett API key and verify the Jackett URL matches (`http://jackett:9117` is correct when using Docker Compose)
3. Fill in your OpenSubtitles and TMDB credentials if you did not set them in `.env`
4. Click **Salvar Alterações**

---

## Step 8: (Optional) Expose Behind a Reverse Proxy

If you want to access TorrentLab from the internet, put it behind a reverse proxy like **Nginx** or **Caddy** with HTTPS.

### Caddy example (`Caddyfile`):

```
torrentlab.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Nginx example:

```nginx
server {
    listen 443 ssl;
    server_name torrentlab.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

The `Upgrade` / `Connection` headers are required for the Socket.IO real-time connection to work correctly.

Set `CORS_ORIGIN=https://torrentlab.yourdomain.com` in your `.env` and restart the stack after adding the proxy.

---

## Updating

```bash
git pull
docker compose up -d --build
```

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `TMDB_TOKEN` | Yes | bundled | TheMovieDB API read access token |
| `OMDB_API_KEY` | Yes | — | OMDB API key |
| `JACKETT_URL` | No | `http://jackett:9117` | Jackett base URL |
| `JACKETT_API_KEY` | Yes | — | Jackett API key |
| `SUBTITLES_USERNAME` | Yes* | — | OpenSubtitles username |
| `SUBTITLES_EMAIL` | Yes* | — | OpenSubtitles email |
| `SUBTITLES_PASS` | Yes* | — | OpenSubtitles password |
| `SUBTITLES_KEY` | Yes* | — | OpenSubtitles API key |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin (set to your domain in production) |
| `JWT_SECRET` | No | dev secret | Secret used to sign auth tokens — **change this in production** |
| `PORT` | No | `3000` | Port the server listens on |
| `DB_PATH` | No | `/app/db/db.sql` | Path to the SQLite database file |

*Required for subtitle download functionality.

---

## Troubleshooting

**App starts but shows no search results**
Jackett is not configured or the API key is wrong. Open `http://your-server-ip:9117`, verify your indexers are working, and re-check the key in Settings.

**Subtitles are not downloading**
Verify your OpenSubtitles credentials in Settings. The free tier has a daily download limit.

**Socket connection fails behind a reverse proxy**
Ensure your proxy forwards `Upgrade` and `Connection` headers (see Step 8).

**Torrent downloads are not persisting after a restart**
Confirm the `./data/downloads` volume is correctly mounted. Check with `docker compose ps` and `docker compose logs app`.
