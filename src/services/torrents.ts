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
    const items = data.rss.channel.reduce(
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
  search?: string
  imdb_id?: string
}

async function createTorrentWithSearchTerm(search: string) {
  const response = await fetchOMBDApi(search)
  const movie = response?.find(f => f.Title === search && f.Type === "movie")

  if (!movie) {
    //    throw new Error("Could not find a correspondenting imdb movie");
    return []
  }

  const data = await fetchJackettApi(movie.imdbID)

  if (!data) {
    //throw new Error("Could not find a torrent for your movie")
    return []
  }

  return data
}

export async function torrentFactory(params: TorrentProps) {
  if (params.search) {
    return await createTorrentWithSearchTerm(params.search)
  }

  if (params.imdb_id) {
    return await fetchJackettApi(params.imdb_id)
  }

  return []
}
