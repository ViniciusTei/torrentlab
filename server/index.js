import express from 'express'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'

import db from './db.js'
import { extractQuality } from './utils.js'
import { staticConfig as config, getConfig, seedSettings } from './config.js'
import moviesRouter from './routes/movies.js'
import subtitlesRouter from './routes/subtitles.js'
import torrentsRouter from './routes/torrents.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import createStreamRouter from './routes/stream.js'
import localSubtitlesRouter from './routes/local-subtitles.js'
import requireAuth from './middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
})

export const client = new WebTorrent()
client.on('error', (err) => console.error('[webtorrent] client error:', err.message))
let _socket = null

function fetchTorrentBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    const req = get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function clientAdd(info, id, theMovieDbId) {
  const cfg = await getConfig()
  client.add(info, { path: cfg.downloadsPath }, (torrent) => {
    torrent.on('download', () => {
      const downloadData = {
        itemId: id,
        infoHash: torrent.infoHash,
        theMovieDbId,
        peers: torrent.numPeers,
        downloaded: torrent.downloaded,
        timeRemaining: torrent.timeRemaining,
        progress: torrent.progress,
        downloadSpeed: torrent.downloadSpeed,
      }
      if (downloadData.progress < 1 && _socket) {
        _socket.emit('downloaded', downloadData)
      }
    })

    torrent.on('done', () => {
      const stmt = db.prepare(`UPDATE downloads SET downloaded = 1 WHERE download_id = ?`)
      stmt.run([id], (_, err) => { if (err) console.log(err) })
      if (_socket) _socket.emit('done', { itemId: id })
    })

    torrent.on('error', (err) => {
      console.log('Torrent error', err)
      if (_socket) _socket.emit('error', err)
    })
  })
}

app.use(express.json())
app.use('/api', authRouter)
app.use('/api', requireAuth, settingsRouter)
app.use('/api', requireAuth, moviesRouter)
app.use('/api', requireAuth, subtitlesRouter)
app.use('/api', requireAuth, localSubtitlesRouter)
app.use('/api', requireAuth, torrentsRouter)
app.use('/api', requireAuth, createStreamRouter(client))

app.get('/api/downloads', requireAuth, (req, res) => {
  db.all('SELECT * FROM downloads WHERE downloaded = 1', (err, rows) => {
    if (err) return res.status(500).send(err)
    res.send(rows)
  })
})

app.get('/api/downloads/ids', requireAuth, (req, res) => {
  db.all('SELECT * FROM downloads', (err, rows) => {
    if (err) return res.status(500).send(err)
    res.send(rows)
  })
})

app.delete('/api/downloads/:infoHash', requireAuth, async (req, res) => {
  const { infoHash } = req.params
  const cfg = await getConfig()
  db.get('SELECT torrent_name FROM downloads WHERE info_hash = ?', [infoHash], (err, row) => {
    if (err) return res.status(500).send(err)
    if (!row) return res.status(404).json({ error: 'Not found' })

    function deleteRecord() {
      db.run('DELETE FROM downloads WHERE info_hash = ?', [infoHash], (err) => {
        if (err) return res.status(500).send(err)
        res.sendStatus(204)
      })
    }

    const torrent = client.get(infoHash)
    if (torrent) {
      torrent.destroy({ destroyStore: true }, deleteRecord)
    } else if (row.torrent_name) {
      const folderPath = path.join(cfg.downloadsPath, row.torrent_name)
      fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) console.log('Failed to delete files:', err)
        deleteRecord()
      })
    } else {
      deleteRecord()
    }
  })
})

// Serve built frontend (only when dist/ exists — i.e., in Docker)
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

io.on('connection', (socket) => {
  _socket = socket
  socket.on('download', async (arg) => {
    const cfg = await getConfig()
    client.add(arg.magnet, { path: cfg.downloadsPath }, (torrent) => {
      const buf = torrent.torrentFile
      fs.mkdirSync(cfg.metadataPath, { recursive: true })
      fs.writeFileSync(path.join(cfg.metadataPath, `${torrent.infoHash}.torrent`), buf)
      const stmt = db.prepare('INSERT INTO downloads VALUES (?, ?, ?, ?, ?, ?, ?, ?);')
      stmt.run(
        arg.itemId,
        torrent.infoHash,
        arg.theMovieDbId,
        0,
        arg.title ?? null,
        torrent.length || null,
        extractQuality(torrent.name),
        torrent.name,
        (_, err) => { if (err) console.log(err) }
      )

      torrent.on('download', () => {
        if (torrent.progress < 1 && _socket) {
          _socket.emit('downloaded', {
            itemId: arg.itemId,
            infoHash: torrent.infoHash,
            theMovieDbId: arg.theMovieDbId,
            peers: torrent.numPeers,
            downloaded: torrent.downloaded,
            timeRemaining: torrent.timeRemaining,
            progress: torrent.progress,
            downloadSpeed: torrent.downloadSpeed,
          })
        }
      })
      torrent.on('done', () => {
        const stmt = db.prepare('UPDATE downloads SET downloaded = 1, torrent_name = COALESCE(torrent_name, ?) WHERE download_id = ?')
        stmt.run([torrent.name ?? null, arg.itemId], (_, err) => { if (err) console.log(err) })
        if (_socket) _socket.emit('done', { itemId: arg.itemId })
      })
      torrent.on('error', (err) => {
        if (_socket) _socket.emit('error', err)
      })
    })
  })
  socket.on('cancel', ({ itemId }) => {
    db.get('SELECT info_hash FROM downloads WHERE download_id = ?', [itemId], (err, row) => {
      if (err) return console.log(err)
      if (row) {
        const torrent = client.get(row.info_hash)
        if (torrent) {
          torrent.destroy((destroyErr) => {
            if (destroyErr) console.log('torrent destroy error', destroyErr)
            db.run('DELETE FROM downloads WHERE download_id = ?', [itemId], (err) => {
              if (err) console.log(err)
            })
            if (_socket) _socket.emit('done', { itemId })
          })
        } else {
          db.run('DELETE FROM downloads WHERE download_id = ?', [itemId], (err) => {
            if (err) console.log(err)
          })
          if (_socket) _socket.emit('done', { itemId })
        }
      } else {
        if (_socket) _socket.emit('done', { itemId })
      }
    })
  })

  socket.on('ready', () => console.log('Client ready'))
})

server.listen(config.port, async () => {
  await seedSettings()

  // Resume in-progress downloads
  db.each('SELECT * FROM downloads WHERE downloaded = 0', (err, row) => {
    if (err) console.log(err)
    if (row) clientAdd(row.info_hash, row.download_id, row.the_movie_db_id)
  })

  // Re-add completed torrents so they can be streamed and torrent_name gets populated
  db.all('SELECT * FROM downloads WHERE downloaded = 1', async (err, rows) => {
    if (err) return console.log(err)
    if (!rows) return

    const cfg = await getConfig()
    for (const row of rows) {
      const torrentFilePath = path.join(cfg.metadataPath, `${row.info_hash}.torrent`)

      // If torrent_name is null and download_id is a URL, fetch the .torrent file to repair the record
      if (!row.torrent_name && row.download_id && row.download_id.startsWith('http')) {
        console.log(`[startup] Fetching .torrent for ${row.info_hash} from ${row.download_id}`)
        try {
          const buf = await fetchTorrentBuffer(row.download_id)
          if (buf.length > 100 && buf[0] === 0x64) {
            fs.writeFileSync(torrentFilePath, buf)
            console.log(`[startup] Saved .torrent for ${row.info_hash} (${buf.length} bytes)`)
          }
        } catch (e) {
          console.log(`[startup] Failed to fetch .torrent: ${e.message}`)
        }
      }

      let source = row.info_hash
      if (fs.existsSync(torrentFilePath)) {
        try {
          const buf = fs.readFileSync(torrentFilePath)
          if (buf.length > 100 && buf[0] === 0x64) source = torrentFilePath
        } catch { /* keep infoHash fallback */ }
      }

      client.add(source, { path: cfg.downloadsPath }, (torrent) => {
        if (!row.torrent_name && torrent.name) {
          db.run('UPDATE downloads SET torrent_name = ? WHERE info_hash = ?', [torrent.name, row.info_hash],
            (err) => { if (err) console.log('[startup] torrent_name update error:', err) })
          console.log(`[startup] Updated torrent_name="${torrent.name}" for ${row.info_hash}`)
        }
        torrent.on('error', (err) => console.log('[completed torrent] error:', err.message))
      })
    }
  })

  console.log(`Server running on port ${config.port}`)
})

server.on('close', () => {
  _socket = null
  client.destroy()
  db.close()
})
