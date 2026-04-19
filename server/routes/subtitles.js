import express from 'express'
import axios from 'axios'
import { getConfig } from '../config.js'
import { withCache } from '../cache.js'

const router = express.Router()
let subtitleToken = null
let subsApiInstance = null

async function getSubsApi() {
  const config = await getConfig()
  if (!subsApiInstance) {
    subsApiInstance = axios.create({
      baseURL: 'https://api.opensubtitles.com/api/v1',
      headers: { 'Api-Key': config.subtitlesKey, 'User-Agent': 'torrentlab v0.0.1' }
    })
  }
  return { subsApi: subsApiInstance, config }
}

export async function getSubtitleToken() {
  if (subtitleToken) return subtitleToken
  const { subsApi, config } = await getSubsApi()
  const auth = await subsApi.post('/login', {
    username: config.subtitlesUsername || config.subtitlesEmail,
    password: config.subtitlesPass,
  })
  subtitleToken = auth.data.token
  return subtitleToken
}

export function resetSubtitleToken() {
  subtitleToken = null
  subsApiInstance = null
}

export async function searchSubtitles(tmdb_id) {
  try {
    const bearer = await getSubtitleToken()
    const { subsApi } = await getSubsApi()
    const result = await subsApi.get('/subtitles', {
      params: { tmdb_id, languages: 'pt-br' },
      headers: { Authorization: `Bearer ${bearer}` }
    })
    return result.data.data || []
  } catch {
    subtitleToken = null
    return []
  }
}

// GET /api/subtitles?tmdb_id=12345
router.get('/subtitles', async (req, res) => {
  try {
    const tmdb_id = req.query.tmdb_id
    const subtitles = await withCache(
      `subs:tmdb:${tmdb_id}`,
      24 * 60 * 60,
      () => searchSubtitles(tmdb_id)
    )
    res.json({ data: subtitles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/subtitles/download
router.post('/subtitles/download', async (req, res) => {
  try {
    const { file_id } = req.body
    const bearer = await getSubtitleToken()
    const { subsApi } = await getSubsApi()
    const result = await subsApi.post('/download', { file_id }, {
      headers: { Authorization: `Bearer ${bearer}` }
    })
    res.json(result.data)
  } catch (err) {
    subtitleToken = null
    const detail = err.response?.data ?? err.message
    console.log('subtitle download error:', JSON.stringify(detail))
    res.status(500).json({ error: detail })
  }
})

export default router
