import express from 'express'
import axios from 'axios'
import config from '../config.js'

const router = express.Router()
const TMDB_BASE = 'https://api.themoviedb.org'
let tmdbImageConfig = null

async function fetchTmdb(path) {
  const res = await axios.get(`${TMDB_BASE}${path}`, {
    headers: { accept: 'application/json', Authorization: config.tmdbToken }
  })
  return res.data
}

async function getImageConfig() {
  if (tmdbImageConfig) return tmdbImageConfig
  const data = await fetchTmdb('/3/configuration')
  const { base_url, backdrop_sizes, poster_sizes } = data.images
  tmdbImageConfig = { base_url, backdrop_sizes, poster_sizes }
  return tmdbImageConfig
}

function buildImages(cfg, backdrop_path, poster_path) {
  return {
    backdrop_paths: {
      sm: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w300') ?? 'original'}${backdrop_path}`,
      md: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w700') ?? 'original'}${backdrop_path}`,
      lg: `${cfg.base_url}/${cfg.backdrop_sizes.find(s => s === 'w1280') ?? 'original'}${backdrop_path}`,
    },
    poster_paths: {
      sm: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w92') ?? 'original'}${poster_path}`,
      md: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w185') ?? 'original'}${poster_path}`,
      lg: `${cfg.base_url}/${cfg.poster_sizes.find(s => s === 'w780') ?? 'original'}${poster_path}`,
    }
  }
}

async function buildTrendingList(results) {
  const [cfg, genresData] = await Promise.all([
    getImageConfig(),
    fetchTmdb('/3/genre/movie/list'),
  ])
  return results.map(entry => ({
    id: entry.id,
    title: entry.title || entry.original_name || entry.original_title || '',
    overview: entry.overview,
    popularity: entry.popularity,
    release_date: new Date(entry.release_date || entry.first_air_date || '').toLocaleDateString('pt-BR'),
    images: buildImages(cfg, entry.backdrop_path, entry.poster_path),
    genres: entry.genre_ids?.map(id => genresData.genres.find(x => x.id === id)?.name ?? 'Outros'),
    is_movie: entry.media_type === 'movie',
  }))
}

// GET /api/trending?type=all|movie|tv
router.get('/trending', async (req, res) => {
  try {
    const type = req.query.type || 'all'
    const data = await fetchTmdb(`/3/trending/${type}/day?language=pt-BR`)
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/search?q=query
router.get('/search', async (req, res) => {
  try {
    const q = encodeURIComponent(req.query.q || '')
    const data = await fetchTmdb(`/3/search/multi?query=${q}&include_adult=false&language=pt-BR&page=1`)
    res.json(await buildTrendingList(data.results))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/movie/:id  (subtitles added in Task 5)
router.get('/movie/:id', async (req, res) => {
  try {
    const [data, cfg] = await Promise.all([
      fetchTmdb(`/3/movie/${req.params.id}?language=pt-BR`),
      getImageConfig(),
    ])
    res.json({
      id: data.id,
      title: data.title || data.original_title || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.release_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_title,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: data.imdb_id,
      is_movie: true,
      is_tv_show: false,
      subtitles: [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tvshow/:id  (subtitles added in Task 5)
router.get('/tvshow/:id', async (req, res) => {
  try {
    const [data, cfg] = await Promise.all([
      fetchTmdb(`/3/tv/${req.params.id}?language=pt-BR`),
      getImageConfig(),
    ])
    res.json({
      id: data.id,
      title: data.name || data.original_name || '',
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.first_air_date || '').toLocaleDateString('pt-BR'),
      original_title: data.original_name,
      original_language: data.original_language,
      images: buildImages(cfg, data.backdrop_path, data.poster_path),
      genres: data.genres?.map(g => g.name),
      imdb_id: null,
      is_movie: false,
      is_tv_show: true,
      subtitles: [],
      seasons: data.seasons || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { buildImages, getImageConfig, fetchTmdb }
export default router
