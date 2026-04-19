import express from "express";
import axios from "axios";
import { getConfig } from "../config.js";
import { searchSubtitles } from "./subtitles.js";
import { withCache } from "../cache.js";

const router = express.Router();
const TMDB_BASE = "https://api.themoviedb.org";
let tmdbImageConfig = null;

const TTL = {
  MOVIE: 7 * 24 * 60 * 60, // 7 days
  TRENDING: 6 * 60 * 60, // 6 hours
  SEARCH: 1 * 60 * 60, // 1 hour
  CONFIG: 24 * 60 * 60, // 24 hours
  SUBS: 24 * 60 * 60, // 24 hours
};

async function fetchTmdb(path) {
  const config = await getConfig();
  const res = await axios.get(`${TMDB_BASE}${path}`, {
    headers: { accept: "application/json", Authorization: config.tmdbToken },
  });
  return res.data;
}

async function getImageConfig() {
  if (tmdbImageConfig) return tmdbImageConfig;
  const data = await withCache("tmdb:configuration", TTL.CONFIG, () =>
    fetchTmdb("/3/configuration"),
  );
  const { base_url, backdrop_sizes, poster_sizes, profile_sizes, still_sizes } =
    data.images;
  tmdbImageConfig = {
    base_url,
    backdrop_sizes,
    poster_sizes,
    profile_sizes,
    still_sizes,
  };
  return tmdbImageConfig;
}

function buildImages(cfg, backdrop_path, poster_path) {
  return {
    backdrop_paths: {
      sm: `${cfg.base_url}${cfg.backdrop_sizes.find((s) => s === "w300") ?? "original"}${backdrop_path}`,
      md: `${cfg.base_url}${cfg.backdrop_sizes.find((s) => s === "w700") ?? "original"}${backdrop_path}`,
      lg: `${cfg.base_url}${cfg.backdrop_sizes.find((s) => s === "w1280") ?? "original"}${backdrop_path}`,
    },
    poster_paths: {
      sm: `${cfg.base_url}${cfg.poster_sizes.find((s) => s === "w92") ?? "original"}${poster_path}`,
      md: `${cfg.base_url}${cfg.poster_sizes.find((s) => s === "w185") ?? "original"}${poster_path}`,
      lg: `${cfg.base_url}${cfg.poster_sizes.find((s) => s === "w780") ?? "original"}${poster_path}`,
    },
  };
}

function buildProfileUrl(cfg, profile_path) {
  if (!profile_path) return null;
  const size = cfg.profile_sizes?.find((s) => s === "w185") ?? "original";
  return `${cfg.base_url}${size}${profile_path}`;
}

function buildStillUrl(cfg, still_path) {
  if (!still_path) return null;
  const size = cfg.still_sizes?.find((s) => s === "w300") ?? "original";
  return `${cfg.base_url}${size}${still_path}`;
}

async function buildTrendingList(results) {
  const [cfg, genresData] = await Promise.all([
    getImageConfig(),
    withCache("tmdb:genres:movie", TTL.CONFIG, () =>
      fetchTmdb("/3/genre/movie/list"),
    ),
  ]);
  return results.filter(e => e.media_type !== 'person').map((entry) => ({
    id: entry.id,
    title: entry.title || entry.original_name || entry.original_title || "",
    overview: entry.overview,
    popularity: entry.popularity,
    release_date: new Date(
      entry.release_date || entry.first_air_date || "",
    ).toISOString(),
    images: buildImages(cfg, entry.backdrop_path, entry.poster_path),
    genres: entry.genre_ids?.map(
      (id) => genresData.genres.find((x) => x.id === id)?.name ?? "Outros",
    ),
    is_movie: entry.media_type === "movie",
  }));
}

// GET /api/trending?type=all|movie|tv&page=1
router.get("/trending", async (req, res) => {
  try {
    const type = req.query.type || "all";
    const page = parseInt(req.query.page) || 1;
    const data = await withCache(
      `tmdb:trending:${type}:${page}`,
      TTL.TRENDING,
      () => fetchTmdb(`/3/trending/${type}/day?language=pt-BR&page=${page}`),
    );
    res.json({
      results: await buildTrendingList(data.results),
      total_pages: data.total_pages,
      total_results: data.total_results,
      page: data.page,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=query
router.get("/search", async (req, res) => {
  try {
    const q = encodeURIComponent(req.query.q || "");
    const data = await withCache(`tmdb:search:${q}`, TTL.SEARCH, () =>
      fetchTmdb(
        `/3/search/multi?query=${q}&include_adult=false&language=pt-BR&page=1`,
      ),
    );
    res.json(await buildTrendingList(data.results));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/movie/:id
router.get("/movie/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [data, cfg, credits, releaseDates, subtitles] = await Promise.all([
      withCache(`tmdb:movie:${id}`, TTL.MOVIE, () =>
        fetchTmdb(`/3/movie/${id}?language=pt-BR`),
      ),
      getImageConfig(),
      withCache(`tmdb:movie:${id}:credits`, TTL.MOVIE, () =>
        fetchTmdb(`/3/movie/${id}/credits`),
      ),
      withCache(`tmdb:movie:${id}:release_dates`, TTL.MOVIE, () =>
        fetchTmdb(`/3/movie/${id}/release_dates`),
      ),
      withCache(`subs:tmdb:${id}`, TTL.SUBS, () => searchSubtitles(id)),
    ]);

    const usRelease = releaseDates.results?.find((r) => r.iso_3166_1 === "US");
    const content_rating = usRelease?.release_dates?.[0]?.certification || null;

    const cast = (credits.cast || []).slice(0, 6).map((c) => ({
      name: c.name,
      character: c.character,
      profile_path: buildProfileUrl(cfg, c.profile_path),
    }));

    res.json({
      id: data.id,
      title: data.title || data.original_title || "",
      overview: data.overview,
      popularity: data.popularity,
      vote_average: data.vote_average ?? 0,
      runtime: data.runtime ?? null,
      release_date: new Date(data.release_date || "").toISOString(),
      original_title: data.original_title,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map((g) => g.name),
      imdb_id: data.imdb_id,
      content_rating,
      production_companies: data.production_companies?.map((c) => c.name) ?? [],
      production_countries: data.production_countries?.map((c) => c.name) ?? [],
      cast,
      is_movie: true,
      is_tv_show: false,
      subtitles,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tvshow/:id
router.get("/tvshow/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [data, cfg, credits, subtitles] = await Promise.all([
      withCache(`tmdb:tvshow:${id}`, TTL.MOVIE, () =>
        fetchTmdb(`/3/tv/${id}?language=pt-BR`),
      ),
      getImageConfig(),
      withCache(`tmdb:tvshow:${id}:credits`, TTL.MOVIE, () =>
        fetchTmdb(`/3/tv/${id}/credits`),
      ),
      withCache(`subs:tmdb:${id}`, TTL.SUBS, () => searchSubtitles(id)),
    ]);

    const cast = (credits.cast || []).slice(0, 6).map((c) => ({
      name: c.name,
      character: c.character,
      profile_path: buildProfileUrl(cfg, c.profile_path),
    }));

    res.json({
      id: data.id,
      title: data.name || data.original_name || "",
      overview: data.overview,
      popularity: data.popularity,
      vote_average: data.vote_average ?? 0,
      runtime: null,
      release_date: new Date(data.first_air_date || "").toISOString(),
      original_title: data.original_name,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map((g) => g.name),
      imdb_id: null,
      content_rating: null,
      production_companies: data.production_companies?.map((c) => c.name) ?? [],
      production_countries: data.production_countries?.map((c) => c.name) ?? [],
      cast,
      is_movie: false,
      is_tv_show: true,
      subtitles,
      seasons: data.seasons || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tvshow/:id/season/:season_number
router.get("/tvshow/:id/season/:season_number", async (req, res) => {
  try {
    const { id, season_number } = req.params;
    const [data, cfg] = await Promise.all([
      withCache(`tmdb:tvshow:${id}:season:${season_number}`, TTL.MOVIE, () =>
        fetchTmdb(`/3/tv/${id}/season/${season_number}?language=pt-BR`),
      ),
      getImageConfig(),
    ]);

    const episodes = (data.episodes || []).map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      season_number: ep.season_number,
      name: ep.name,
      overview: ep.overview,
      air_date: ep.air_date,
      runtime: ep.runtime ?? null,
      vote_average: ep.vote_average ?? 0,
      still_url: buildStillUrl(cfg, ep.still_path),
    }));

    res.json({
      id: data.id,
      name: data.name,
      overview: data.overview,
      season_number: data.season_number,
      air_date: data.air_date,
      episodes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { buildImages, getImageConfig, fetchTmdb };
export default router;
