import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import WebTorrent from 'webtorrent'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173'
  }
})

const client = new WebTorrent()
const conn = []

app.get('/', (req, res) => res.send('Hello world'))

io.on('connection', (socket) => {
  socket.on('download', (arg, callback) => {
    console.log({ arg })
    client.add(arg.magnet, { path: 'downloads' }, (torrent) => {
      torrent.on('download', bytes => {
        const downloadData = {
          itemId: arg.itemId,
          peers: torrent.numPeers,
          downloaded: torrent.downloaded,
          timeRemaining: torrent.timeRemaining,
          progress: torrent.progress,
        }

        if (downloadData.progress < 1) {
          socket.emit('downloaded', downloadData)
        }
      })
      torrent.on('done', function() {
        console.log('Torrent done')
        socket.emit('done', 'Download finished')
      })
      torrent.on('error', function(err) {
        console.log('Torrent error', err)
        socket.emit('error', err)
      })
    })

  })

})

server.listen(5174, () => {
  console.log('Server running on port 5174')
})
