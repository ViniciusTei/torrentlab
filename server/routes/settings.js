import express from 'express'
import db from '../db.js'
import { resetSubtitleToken } from './subtitles.js'

const router = express.Router()

const SETTINGS_KEYS = [
  'tmdb_token',
  'omdb_api_key',
  'jackett_url',
  'jackett_api_key',
  'subtitles_username',
  'subtitles_email',
  'subtitles_pass',
  'subtitles_key',
]

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) reject(err)
      else resolve(Object.fromEntries(rows.map(r => [r.key, r.value])))
    })
  })
}

function upsertSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
      err => err ? reject(err) : resolve()
    )
  })
}

// GET /api/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getAllSettings()
    const masked = { ...settings }
    if (masked.subtitles_pass) masked.subtitles_pass = '••••••••'
    res.json(masked)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/settings
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body
    const validKeys = Object.keys(updates).filter(k => SETTINGS_KEYS.includes(k))
    await Promise.all(validKeys.map(k => upsertSetting(k, updates[k])))
    resetSubtitleToken()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { getAllSettings, upsertSetting, SETTINGS_KEYS }
export default router
