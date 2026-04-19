import db from "./db.js";

const ENV_DEFAULTS = {
  tmdb_token: process.env.TMDB_TOKEN || "",
  omdb_api_key: process.env.OMDB_API_KEY || "",
  jackett_url: process.env.JACKETT_URL || "http://localhost:9117",
  jackett_api_key: process.env.JACKETT_API_KEY || "",
  subtitles_username: process.env.SUBTITLES_USERNAME || "",
  subtitles_email: process.env.SUBTITLES_EMAIL || "",
  subtitles_pass: process.env.SUBTITLES_PASS || "",
  subtitles_key: process.env.SUBTITLES_KEY || "",
  downloads_path: process.env.DOWNLOADS_PATH || "downloads",
  metadata_path: process.env.METADATA_PATH || "metadata",
};

export async function seedSettings() {
  for (const [key, value] of Object.entries(ENV_DEFAULTS)) {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
        [key, value],
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
}

export async function getConfig() {
  const rows = await new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM settings", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  const dbSettings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return {
    tmdbToken: dbSettings.tmdb_token || ENV_DEFAULTS.tmdb_token,
    omdbApiKey: dbSettings.omdb_api_key || ENV_DEFAULTS.omdb_api_key,
    jackettUrl: dbSettings.jackett_url || ENV_DEFAULTS.jackett_url,
    jackettApiKey: dbSettings.jackett_api_key || ENV_DEFAULTS.jackett_api_key,
    subtitlesUsername:
      dbSettings.subtitles_username || ENV_DEFAULTS.subtitles_username,
    subtitlesEmail: dbSettings.subtitles_email || ENV_DEFAULTS.subtitles_email,
    subtitlesPass: dbSettings.subtitles_pass || ENV_DEFAULTS.subtitles_pass,
    subtitlesKey: dbSettings.subtitles_key || ENV_DEFAULTS.subtitles_key,
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    port: parseInt(process.env.PORT || "5174"),
    downloadsPath: dbSettings.downloads_path || ENV_DEFAULTS.downloads_path,
    metadataPath: dbSettings.metadata_path || ENV_DEFAULTS.metadata_path,
  };
}

// Synchronous config for values that never come from DB
export const staticConfig = {
  corsOrigin: process.env.CORS_ORIGIN || "*",
  port: parseInt(process.env.PORT || "5174"),
  downloadsPath: process.env.DOWNLOADS_PATH || "downloads",
  metadataPath: process.env.METADATA_PATH || "metadata",
};
