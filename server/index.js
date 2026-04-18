import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'
import fs from 'node:fs'
import path from 'path'
import { toTorrentFile } from 'parse-torrent'
import db from './db.js'
import config from './config.js'
import moviesRouter from './routes/movies.js'


const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: config.corsOrigin },
})

const client = new WebTorrent()
let _socket = null

const clientAdd = (info, id, cb) => {
  client.add(info, { path: config.downloadsPath }, (torrent) => {
    torrent.on('download', bytes => {
      const downloadData = {
        itemId: id,
        peers: torrent.numPeers,
        downloaded: torrent.downloaded,
        timeRemaining: torrent.timeRemaining,
        progress: torrent.progress,
      }

      if (downloadData.progress < 1) {
        if (_socket) {
          _socket.emit('downloaded', downloadData)
        }
      }
    })

    torrent.on('done', function() {
      const stmt = db.prepare(`
        UPDATE downloads
        SET downloaded = 1
        WHERE download_id = '${id}';
        `)
      stmt.run((_, err) => {
        if (err) console.log(err)
      })
      if (_socket) {
        _socket.emit('done', 'Download finished')
      }
    })

    torrent.on('error', function(err) {
      console.log('Torrent error', err)
      if (_socket) {
        _socket.emit('error', err)
      }
    })

    if (cb) cb(torrent)
  })

}

const downloadEvent = (arg, callback) => {
  clientAdd(arg.magnet, arg.itemId, function(torrent) {
    // save torrent metadata to restore later
    const buf = toTorrentFile({
      infoHash: torrent.infoHash,
    })
    fs.writeFileSync(path.join(config.metadataPath, `${torrent.infoHash}.torrent`), buf)
    const stmt = db.prepare("INSERT INTO downloads VALUES (?, ?, ?, ?);")
    stmt.run(arg.itemId, torrent.infoHash, arg.theMovieDbId, 0, (_, err) => {
      if (err) console.log(err)
    })
    console.log('Inserting newdownload')
  })

}

const connectionEvent = (arg, cb) => {
  console.log('Client ready')
}

app.get('/', (req, res) => res.send('Hello world'))
app.use('/api', moviesRouter)
app.get('/downloads', (req, res) => {
  db.all("SELECT * FROM downloads WHERE downloaded = 1", (err, rows) => {
    if (err) res.status(500).send(err)
    res.send(rows)
  })
})

io.on('connection', (socket) => {
  _socket = socket
  socket.on('download', downloadEvent)
  socket.on('ready', connectionEvent)
})

server.listen(config.port, () => {
  db.each("SELECT * FROM downloads WHERE downloaded = 0", (err, row) => {
    if (err) console.log(err)

    console.log('Add unfinished', row)
    clientAdd(row.info_hash, row.download_id)
  })

  console.log(`Server running on port ${config.port}`)
})

server.on('close', () => {
  _socket = null
  client.destroy()
  db.close()
})
