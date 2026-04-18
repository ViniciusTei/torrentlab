import express from 'express'
import axios from 'axios'
import xml from 'xml2js'
import { getConfig } from '../config.js'
import db from '../db.js'

const router = express.Router()

function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
}

const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds

async function fetchJackettCached(cacheKey, title) {
  const now = Math.floor(Date.now() / 1000)
  const cached = await dbGet('SELECT * FROM torrent_cache WHERE cache_key = ?', [cacheKey])
  if (cached && (now - cached.cached_at) < CACHE_TTL) return JSON.parse(cached.results)
  const results = await fetchJackett(title)
  db.run(
    'INSERT OR REPLACE INTO torrent_cache (cache_key, results, cached_at) VALUES (?, ?, ?)',
    [cacheKey, JSON.stringify(results), now]
  )
  return results
}

async function omdbTitleById(imdbId) {
  const config = await getConfig()
  const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${encodeURIComponent(imdbId)}`)
  return res.data.Title || null
}

async function omdbTitleBySearch(searchName, type) {
  const config = await getConfig()
  const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(searchName)}&type=${type}`)
  const results = res.data.Search || []
  const match = results.find(f => f.Title === searchName)
  return match?.Title || null
}

async function fetchJackett(title) {
  const config = await getConfig()
  const url = `${config.jackettUrl}/api/v2.0/indexers/all/results/torznab`
  const res = await axios.get(`${url}?apikey=${config.jackettApiKey}&t=search&q=${encodeURIComponent(title)}`, {
    responseType: 'text'
  })

  const data = await xml.parseStringPromise(res.data)
  if (data.error) throw new Error(`Jackett error: ${data.error['$'].description}`)
  if (!data.rss?.channel) return []

  const channels = Array.isArray(data.rss.channel) ? data.rss.channel : [data.rss.channel]
  const items = channels
    .filter(c => !!c.item)
    .reduce((acc, chan) => { chan.item.forEach(i => acc.push(i)); return acc }, [])

  return items.map(obj => {
    const flat = {}
    for (const key in obj) {
      flat[key] = Array.isArray(obj[key]) && obj[key].length > 0 ? obj[key][0] : obj[key]
    }
    for (const attr of (obj['torznab:attr'] || [])) {
      const name = attr?.['$']?.name
      const value = attr?.['$']?.value
      if (name && value) flat[name] = value
    }
    return flat
  })
}

// GET /api/torrents?imdb_id=tt1234567
// GET /api/torrents?search=Movie+Title&type=movie|series
router.get('/torrents', async (req, res) => {
  try {
    const { imdb_id, search, type } = req.query

    if (imdb_id) {
      const title = await omdbTitleById(imdb_id)
      if (!title) return res.json([])
      return res.json(await fetchJackettCached(`imdb:${imdb_id}`, title))
    }

    if (search) {
      const omdbType = type === 'series' ? 'series' : 'movie'
      const title = await omdbTitleBySearch(search, omdbType)
      if (!title) return res.json([])
      return res.json(await fetchJackettCached(`search:${omdbType}:${search}`, title))
    }

    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
