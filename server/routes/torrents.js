import express from 'express'
import axios from 'axios'
import xml from 'xml2js'
import config from '../config.js'

const router = express.Router()

async function fetchOmdb(searchName) {
  const res = await axios.get(`http://www.omdbapi.com/?apikey=${config.omdbApiKey}&s=${encodeURIComponent(searchName)}`)
  return res.data.Search || []
}

async function fetchJackett(imdbId) {
  const url = `${config.jackettUrl}/api/v2.0/indexers/all/results/torznab`
  const res = await axios.get(`${url}?apikey=${config.jackettApiKey}&imdbid=${imdbId}`, {
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
    return flat
  })
}

// GET /api/torrents?imdb_id=tt1234567
// GET /api/torrents?search=Movie+Title&type=movie|series
router.get('/torrents', async (req, res) => {
  try {
    const { imdb_id, search, type } = req.query

    if (imdb_id) {
      return res.json(await fetchJackett(imdb_id))
    }

    if (search) {
      const results = await fetchOmdb(search)
      const omdbType = type === 'series' ? 'series' : 'movie'
      const match = results.find(f => f.Title === search && f.Type === omdbType)
      if (!match) return res.json([])
      return res.json(await fetchJackett(match.imdbID))
    }

    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
