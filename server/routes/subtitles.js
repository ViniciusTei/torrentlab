import express from "express";
import axios from "axios";
import { getConfig } from "../config.js";
import { withCache } from "../cache.js";

const router = express.Router();
let subtitleToken = null;
let subsApiInstance = null;

async function getSubsApi() {
  const config = await getConfig();
  if (!subsApiInstance) {
    subsApiInstance = axios.create({
      baseURL: "https://api.opensubtitles.com/api/v1",
      headers: {
        "Api-Key": config.subtitlesKey,
        "User-Agent": "torrentlab",
      },
    });
    subsApiInstance.interceptors.request.use((cfg) => {
      console.log("[subtitles] →", cfg.method?.toUpperCase(), (cfg.baseURL ?? "") + (cfg.url ?? ""));
      return cfg;
    });
    subsApiInstance.interceptors.response.use(
      (res) => {
        console.log("[subtitles] ←", res.status, (res.config.baseURL ?? "") + (res.config.url ?? ""));
        return res;
      },
      (err) => {
        console.log("[subtitles] ← ERR", err.response?.status, (err.config?.baseURL ?? "") + (err.config?.url ?? ""));
        return Promise.reject(err);
      }
    );
  }
  return { subsApi: subsApiInstance, config };
}

export async function getSubtitleToken() {
  if (subtitleToken) return subtitleToken;
  const { subsApi, config } = await getSubsApi();
  const auth = await subsApi.post("/login", {
    username: config.subtitlesUsername || config.subtitlesEmail,
    password: config.subtitlesPass,
  });
  subtitleToken = auth.data.token;
  return subtitleToken;
}

export function resetSubtitleToken() {
  subtitleToken = null;
  subsApiInstance = null;
}

export async function searchSubtitles(tmdb_id, season_number, episode_number) {
  try {
    const bearer = await getSubtitleToken();
    const { subsApi } = await getSubsApi();
    const params = { tmdb_id, languages: "pt-br" };
    if (season_number != null) params.season_number = season_number;
    if (episode_number != null) params.episode_number = episode_number;
    const result = await subsApi.get("/subtitles", {
      params,
      headers: { Authorization: `Bearer ${bearer}` },
    });
    return result.data.data || [];
  } catch {
    subtitleToken = null;
    return [];
  }
}

// GET /api/subtitles?tmdb_id=12345
router.get("/subtitles", async (req, res) => {
  try {
    const { tmdb_id, season_number, episode_number } = req.query;
    let cacheKey = `subs:tmdb:${tmdb_id}`;
    if (season_number != null) cacheKey += `:s${season_number}`;
    if (episode_number != null) cacheKey += `:e${episode_number}`;
    const subtitles = await withCache(cacheKey, 24 * 60 * 60, () =>
      searchSubtitles(
        tmdb_id,
        season_number != null ? Number(season_number) : undefined,
        episode_number != null ? Number(episode_number) : undefined,
      ),
    );
    res.json({ data: subtitles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subtitles/download
router.post("/subtitles/download", async (req, res) => {
  try {
    const { file_id } = req.body;
    const bearer = await getSubtitleToken();
    const { subsApi } = await getSubsApi();
    const result = await subsApi.post(
      "/download",
      { file_id },
      {
        headers: { Authorization: `Bearer ${bearer}` },
      },
    );
    res.json(result.data);
  } catch (err) {
    subtitleToken = null;
    const detail = err.response?.data ?? err.message;
    const status = err.response?.status ?? 500;
    console.log("subtitle download error — url:", err.config?.url, "status:", status);
    console.log("subtitle download error — body:", JSON.stringify(detail));
    res.status(status).json({ error: detail });
  }
});

export default router;
