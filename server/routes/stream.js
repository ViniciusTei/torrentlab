import express from 'express'
import path from 'path'
import { client } from '../index.js'
import requireAuth from '../middleware/auth.js'

const router = express.Router()

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'])
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

router.get('/stream/:infoHash', requireAuth, (req, res) => {
  const { infoHash } = req.params
  const torrent = client.torrents.find(
    t => t.infoHash.toLowerCase() === infoHash.toLowerCase()
  )
  if (!torrent) return res.status(404).json({ error: 'Torrent not found' })

  const file = torrent.files
    .filter(f => VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]

  if (!file) return res.status(404).json({ error: 'No video file found in torrent' })

  const ext = path.extname(file.name).toLowerCase()
  const contentType = MIME_TYPES[ext] ?? 'video/mp4'
  const fileSize = file.length
  const range = req.headers.range

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })
    file.createReadStream({ start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    file.createReadStream().pipe(res)
  }
})

export default router
