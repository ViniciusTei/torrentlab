import express from 'express'
import fs from 'fs'
import path from 'path'
import { staticConfig } from '../config.js'

const router = express.Router()
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass'])

router.get('/local-subtitles/:infoHash', (req, res) => {
  const { infoHash } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const dir = path.join(staticConfig.downloadsPath, infoHash)
  if (!fs.existsSync(dir)) return res.json([])

  try {
    const files = fs.readdirSync(dir)
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

router.get('/subtitle-file/:infoHash/:filename', (req, res) => {
  const { infoHash, filename } = req.params
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return res.status(400).json({ error: 'Invalid infoHash' })
  }

  const decoded = decodeURIComponent(filename)
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filePath = path.resolve(staticConfig.downloadsPath, infoHash, decoded)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  res.sendFile(filePath)
})

export default router
