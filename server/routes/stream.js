import express from 'express'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db.js'
import { staticConfig } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'])
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

/** Recursively find all video files under a directory or return the path itself if it's a video file. */
function findVideoFiles(torrentPath) {
  const results = []

  // Single-file torrent: the torrent_name IS the video file
  const ext = path.extname(torrentPath).toLowerCase()
  if (VIDEO_EXTENSIONS.has(ext)) {
    try {
      const stat = fs.statSync(torrentPath)
      if (stat.isFile()) return [{ filePath: torrentPath, size: stat.size }]
    } catch { return [] }
  }

  // Multi-file torrent: walk the directory
  function walk(current) {
    let entries
    try { entries = fs.readdirSync(current, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        try { results.push({ filePath: full, size: fs.statSync(full).size }) } catch { /* skip */ }
      }
    }
  }
  walk(torrentPath)
  return results.sort((a, b) => b.size - a.size)
}

function streamFromDisk(filePath, fileSize, contentType, req, res) {
  const range = req.headers.range
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = Math.min(endStr ? parseInt(endStr, 10) : fileSize - 1, fileSize - 1)

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end()
      return
    }

    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })
    const stream = fs.createReadStream(filePath, { start, end })
    stream.on('error', (err) => {
      console.error('[stream] disk read error:', err.message)
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' })
      else res.destroy()
    })
    stream.pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })
    const stream = fs.createReadStream(filePath)
    stream.on('error', (err) => {
      console.error('[stream] disk read error:', err.message)
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' })
      else res.destroy()
    })
    stream.pipe(res)
  }
}

/** Wait for a torrent to have its file metadata, with a timeout. */
function waitForTorrentReady(torrent, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (torrent.files.length > 0) return resolve(torrent)
    const timer = setTimeout(() => reject(new Error('Timeout waiting for torrent metadata')), timeoutMs)
    torrent.once('ready', () => { clearTimeout(timer); resolve(torrent) })
    torrent.once('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

export default function createStreamRouter(client) {
  const router = express.Router()

  router.get('/stream/:infoHash', async (req, res) => {
    const { infoHash } = req.params

    // Find torrent in WebTorrent — either actively downloading or re-added on startup
    let torrent = client.torrents.find(
      t => t.infoHash.toLowerCase() === infoHash.toLowerCase()
    )

    // If in WebTorrent but metadata not yet available, wait for it (DHT fetch)
    if (torrent && torrent.files.length === 0) {
      try {
        torrent = await waitForTorrentReady(torrent)
      } catch (err) {
        console.error('[stream] waiting for metadata failed:', err.message)
        torrent = null // fall through to disk fallback
      }
    }

    if (torrent && torrent.files.length > 0) {
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
        const end = Math.min(endStr ? parseInt(endStr, 10) : fileSize - 1, fileSize - 1)

        if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end()
          return
        }

        const chunkSize = end - start + 1
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        })
        const stream = file.createReadStream({ start, end })
        stream.on('error', (err) => {
          console.error('[stream] read error:', err.message)
          if (!res.headersSent) res.status(500).json({ error: 'Stream error' })
          else res.destroy()
        })
        stream.pipe(res)
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        })
        const stream = file.createReadStream()
        stream.on('error', (err) => {
          console.error('[stream] read error:', err.message)
          if (!res.headersSent) res.status(500).json({ error: 'Stream error' })
          else res.destroy()
        })
        stream.pipe(res)
      }
      return
    }

    // Torrent not in memory — try adding by infoHash (DHT) or fall back to disk
    try {
      const downloadsPath = path.resolve(__dirname, '..', staticConfig.downloadsPath)
      const row = await new Promise((resolve, reject) =>
        db.get(
          'SELECT torrent_name FROM downloads WHERE LOWER(info_hash) = LOWER(?) AND downloaded = 1',
          [infoHash],
          (err, r) => err ? reject(err) : resolve(r)
        )
      )

      if (!row) {
        return res.status(404).json({ error: 'Torrent not found' })
      }

      // If we have torrent_name, stream from disk directly
      if (row.torrent_name) {
        const torrentPath = path.join(downloadsPath, row.torrent_name)
        const videos = findVideoFiles(torrentPath)
        if (videos.length === 0) return res.status(404).json({ error: 'No video file found on disk' })
        const { filePath, size } = videos[0]
        const ext = path.extname(filePath).toLowerCase()
        return streamFromDisk(filePath, size, MIME_TYPES[ext] ?? 'video/mp4', req, res)
      }

      // torrent_name is null: add by infoHash and wait for DHT metadata
      const freshTorrent = await new Promise((resolve, reject) => {
        const existing = client.torrents.find(t => t.infoHash.toLowerCase() === infoHash.toLowerCase())
        if (existing) return resolve(existing)
        client.add(infoHash, { path: downloadsPath }, (t) => resolve(t))
      })

      let readyTorrent
      try {
        readyTorrent = await waitForTorrentReady(freshTorrent, 30000)
      } catch {
        return res.status(503).json({ error: 'Torrent metadata not yet available. Try again shortly.' })
      }

      const file = readyTorrent.files
        .filter(f => VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()))
        .sort((a, b) => b.length - a.length)[0]

      if (!file) return res.status(404).json({ error: 'No video file found in torrent' })

      // Update torrent_name in DB now that we have it
      if (readyTorrent.name) {
        db.run('UPDATE downloads SET torrent_name = ? WHERE LOWER(info_hash) = LOWER(?)',
          [readyTorrent.name, infoHash], (err) => { if (err) console.error('[stream] update torrent_name:', err) })
      }

      const ext = path.extname(file.name).toLowerCase()
      const contentType = MIME_TYPES[ext] ?? 'video/mp4'
      const fileSize = file.length
      const range = req.headers.range

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
        const start = parseInt(startStr, 10)
        const end = Math.min(endStr ? parseInt(endStr, 10) : fileSize - 1, fileSize - 1)
        if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
          return res.status(416).set('Content-Range', `bytes */${fileSize}`).end()
        }
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': contentType })
        file.createReadStream({ start, end }).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' })
        file.createReadStream().pipe(res)
      }
    } catch (err) {
      console.error('[stream] fallback error:', err.message)
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' })
    }
  })

  return router
}
