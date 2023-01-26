// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import magnetToTorrent from 'magnet2torrent-js'
import fs from 'fs'

export default async function handler(req, res) {
  const { magnet } = req.body

  const trackers = [
    'udp%3A%2F%2Fopen.demonii.com%3A1337',
    'udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969',
    'udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969',
    'udp%3A%2F%2Ftracker.pomf.se%3A80',
    'udp%3A%2F%2Ftracker.publicbt.com%3A80',
    'udp%3A%2F%2Ftracker.openbittorrent.com%3A80',
    'udp%3A%2F%2Ftracker.istole.it%3A80',
  ]
  
  try {
    const toTorrent = new magnetToTorrent({
      trackers,
      addTrackersToTorrent: true
    })

    const torrent = await toTorrent.getTorrent(magnet)
    // const buff = torrent.toTorrentFile()
    res.setHeader('Content-Type', 'application/torrent')
    res.setHeader('Content-Disposition', `attachment; filename=${torrent.name}.torrent`)
    res.send(torrent.toTorrentFile())
  } catch (error) {
    res.status(500).send(error)
  }
  
}
