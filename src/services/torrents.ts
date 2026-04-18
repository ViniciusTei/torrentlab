import axios from 'axios'

export type JackettItem = {
  title: string
  guid: string
  link: string | string[]
  size: number
}

interface TorrentProps {
  type: "movie" | "series"
  search?: string
  imdb_id?: string
}

export default async function Torrents(params: TorrentProps): Promise<JackettItem[]> {
  if (params.imdb_id) {
    const res = await axios.get<JackettItem[]>(`/api/torrents?imdb_id=${encodeURIComponent(params.imdb_id)}`)
    return res.data
  }

  if (params.search) {
    const res = await axios.get<JackettItem[]>(`/api/torrents?search=${encodeURIComponent(params.search)}&type=${params.type}`)
    return res.data
  }

  return []
}
