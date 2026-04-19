import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getConfig } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function resolveDownloadsPath() {
  const { downloadsPath } = await getConfig()
  return path.isAbsolute(downloadsPath) ? downloadsPath : path.resolve(__dirname, '..', downloadsPath)
}

const router = express.Router()
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass'])
const SUBTITLE_MIME = {
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.ass': 'text/plain; charset=utf-8',
}

router.get('/local-subtitles/:infoHash', async (req, res) => {
  const { infoHash } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const DOWNLOADS_PATH = await resolveDownloadsPath()
  const dir = path.join(DOWNLOADS_PATH, infoHash)

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = entries.filter(e => e.isFile()).map(e => e.name)
    const subtitles = files
      .filter(f => SUBTITLE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(filename => ({
        filename,
        url: `/api/subtitle-file/${infoHash}/${encodeURIComponent(filename)}`,
      }))
    res.json(subtitles)
  } catch {
    res.json([])
  }
})

router.get('/subtitle-file/:infoHash/:filename', async (req, res) => {
  const { infoHash, filename } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const decoded = decodeURIComponent(filename)
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const DOWNLOADS_PATH = await resolveDownloadsPath()
  const filePath = path.resolve(DOWNLOADS_PATH, infoHash, decoded)
  if (!filePath.startsWith(DOWNLOADS_PATH + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const ext = path.extname(decoded).toLowerCase()
  if (!SUBTITLE_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'Invalid file type' })
  }
  res.setHeader('Content-Type', SUBTITLE_MIME[ext])
  res.sendFile(filePath, err => {
    if (err && !res.headersSent) res.status(404).json({ error: 'File not found' })
  })
})

export default router
