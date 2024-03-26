import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'
import fs from 'node:fs'
import path from 'path'
import { toTorrentFile } from 'parse-torrent'
import sqlite3 from 'sqlite3'

const sql = sqlite3.verbose()
const db = new sql.Database('db.sql')

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS downloads (
      download_id TEXT PRIMARY KEY,
      info_hash TEXT NOT NULL,
      the_movie_db_id INTEGER NOT NULL,
      downloaded INTEGER NOT NULL CHECK (downloaded IN (0, 1))
    );
  `)
})

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173'
  },
})

const client = new WebTorrent()
let _socket = null

const clientAdd = (info, id, cb) => {
  client.add(info, { path: 'downloads' }, (torrent) => {
    torrent.on('download', bytes => {
      const downloadData = {
        itemId: id,
        peers: torrent.numPeers,
        downloaded: torrent.downloaded,
        timeRemaining: torrent.timeRemaining,
        progress: torrent.progress,
      }

      if (downloadData.progress < 1) {
        _socket.emit('downloaded', downloadData)
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
      _socket.emit('done', 'Download finished')
    })

    torrent.on('error', function(err) {
      console.log('Torrent error', err)
      _socket.emit('error', err)
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
    fs.writeFileSync(path.join('metadata', `${torrent.infoHash}.torrent`), buf)
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

server.listen(5174, () => {
  db.each("SELECT * FROM downloads WHERE downloaded = 0", (err, row) => {
    if (err) console.log(err)

    console.log('Add unfinished', row)
    clientAdd(row.info_hash, row.download_id)
  })

  console.log('Server running on port 5174')
})

server.on('close', () => {
  _socket = null
  client.destroy()
  db.close()
})
