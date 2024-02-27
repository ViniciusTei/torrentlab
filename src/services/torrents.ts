import xml from 'xml2js'
import axios from 'axios'

type OMDBSearch = {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

type OMDBResponse = {
  Search: OMDBSearch[],
  totalResults: number
  Response: string
}

type JackettChannel = {
  item: JackettItem[]
}

type JackettItem = {
  title: string
  guid: string
  link: string
  size: number
}

async function fetchOMBDApi(searchName: string): Promise<OMDBSearch[]> {
  const apiKey = '6c3ebf7c'
  const url = 'http://www.omdbapi.com/'

  const response = await axios.get<OMDBResponse>(`${url}?apikey=${apiKey}&s=${searchName}`)
  return response.data.Search
}

async function fetchJackettApi(imdbId: string): Promise<JackettItem[]> {
  const url = 'http://localhost:9117/api/v2.0/indexers/all/results/torznab'

  const response = await axios.get(`${url}?apikey=sopqxl8kcm4j0fe7atq4tevsc4kg9kgd&imdbid=${imdbId}`, {
    responseType: 'text'
  })

  const data = await xml.parseStringPromise(response.data)

  if (data.error) {
    throw new Error(`Fetching trackers: ${data.error['$'].description}`)
  }

  if (
    data.rss === undefined &&
    data.rss.channel === undefined &&
    data.rss.channel.item === undefined) {
    throw new Error('Missing items from trackers')
  }

  if (Array.isArray(data.rss.channel)) {
    const channelsWithItems = data.rss.channel.filter((chan: JackettChannel) => !!chan.item) as JackettChannel[]

    const items = channelsWithItems.reduce(
      (acc: JackettItem[], chan: JackettChannel) => {
        chan.item.forEach(i => acc.push(i))
        return acc
      },
      [] as JackettItem[]
    )

    return items
  }

  return data.rss.channel.item as JackettItem[]
}

interface TorrentProps {
  type: "movie" | "series"
  search?: string
  imdb_id?: string
}

async function createTorrentWithSearchTerm(search: string, type: "movie" | "series") {
  console.log(`[SERVER]: Quering ids for ${search}`)
  const response = await fetchOMBDApi(search)
  const movie = response?.find(f => f.Title === search && f.Type === type)

  if (!movie) {
    //    throw new Error("Could not find a correspondenting imdb movie");
    return []
  }

  console.log(`[SERVER]: Quering trackers for ${movie.imdbID}:${movie.Title}`)
  const data = await fetchJackettApi(movie.imdbID)

  if (!data) {
    //throw new Error("Could not find a torrent for your movie")
    return []
  }

  return data
}

export default async function Torrents(params: TorrentProps) {
  if (params.imdb_id) {
    return await fetchJackettApi(params.imdb_id)
  }

  if (params.search) {
    return await createTorrentWithSearchTerm(params.search, params.type)
  }

  return []
}
