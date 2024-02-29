import { NextResponse } from "next/server"
import WebTorrent from 'webtorrent'

export async function POST(request: Request) {
  const body = await request.json()

  if (body && body.magnet) {
    const client = new WebTorrent()

    client.add(body.magnet, { path: '~/Downloads' }, torrent => {
      torrent.on('done', () => {
        console.log('torrent download finished')
      })
    })

    return NextResponse.json({ message: 'Downloading torrent ' }, { status: 200 })
  }

  return NextResponse.json({ error: 'Missing magnet or body' }, { status: 404 })
}
