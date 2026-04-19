import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { toTorrentFile } from 'parse-torrent'

import db from './db.js'
import { extractQuality } from './utils.js'
import { staticConfig as config, seedSettings } from './config.js'
import moviesRouter from './routes/movies.js'
import subtitlesRouter from './routes/subtitles.js'
import torrentsRouter from './routes/torrents.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import createStreamRouter from './routes/stream.js'
import requireAuth from './middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
})

export const client = new WebTorrent()
let _socket = null

function clientAdd(info, id, theMovieDbId) {
  client.add(info, { path: config.downloadsPath }, (torrent) => {
    torrent.on('download', () => {
      const downloadData = {
        itemId: id,
        infoHash: torrent.infoHash,
        theMovieDbId,
        peers: torrent.numPeers,
        downloaded: torrent.downloaded,
        timeRemaining: torrent.timeRemaining,
        progress: torrent.progress,
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

// Serve built frontend (only when dist/ exists — i.e., in Docker)
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

io.on('connection', (socket) => {
  _socket = socket
  socket.on('download', (arg) => {
    client.add(arg.magnet, { path: config.downloadsPath }, (torrent) => {
      const buf = toTorrentFile({ infoHash: torrent.infoHash })
      fs.mkdirSync(config.metadataPath, { recursive: true })
      fs.writeFileSync(path.join(config.metadataPath, `${torrent.infoHash}.torrent`), buf)
      const stmt = db.prepare('INSERT INTO downloads VALUES (?, ?, ?, ?, ?, ?, ?, ?);')
      stmt.run(
        arg.itemId,
        torrent.infoHash,
        arg.theMovieDbId,
        0,
        arg.title ?? null,
        torrent.length,
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
          })
        }
      })
      torrent.on('done', () => {
        const stmt = db.prepare('UPDATE downloads SET downloaded = 1 WHERE download_id = ?')
        stmt.run([arg.itemId], (_, err) => { if (err) console.log(err) })
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
        if (torrent) torrent.destroy()
        db.run('DELETE FROM downloads WHERE download_id = ?', [itemId], (err) => {
          if (err) console.log(err)
        })
      }
      if (_socket) _socket.emit('done', { itemId })
    })
  })

  socket.on('ready', () => console.log('Client ready'))
})

server.listen(config.port, async () => {
  await seedSettings()
  db.each('SELECT * FROM downloads WHERE downloaded = 0', (err, row) => {
    if (err) console.log(err)
    if (row) clientAdd(row.info_hash, row.download_id, row.the_movie_db_id)
  })
  console.log(`Server running on port ${config.port}`)
})

server.on('close', () => {
  _socket = null
  client.destroy()
  db.close()
})
