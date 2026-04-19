import getAPI from './api'

export type JackettItem = {
  title: string
  guid: string
  link: string | string[]
  size: number
  magneturl?: string
  seeders?: string
  leechers?: string
}

interface TorrentProps {
  type: "movie" | "series"
  search?: string
  imdb_id?: string
}

export default async function Torrents(params: TorrentProps): Promise<JackettItem[]> {
  const api = getAPI()
  if (params.imdb_id) return api.fetchTorrents(params.imdb_id)
  if (params.search) return api.searchTorrents(params.search, params.type)
  return []
}
