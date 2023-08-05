import { XMLParser } from 'fast-xml-parser'

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

type JackettItem = {
  title: string
  guid: string
  link: string
  size: number
}

async function fetchOMBDApi(searchName: string): Promise<OMDBSearch[]> {
  const apiKey = '6c3ebf7c'
  const url = 'http://www.omdbapi.com/'

  const response = await fetch(`${url}?apikey=${apiKey}&s=${searchName}`)
  const data: OMDBResponse = await response.json()
  
  return data.Search
}

async function fetchJackettApi(imdbId: string): Promise<JackettItem[]> {
  const url = 'http://localhost:9117/api/v2.0/indexers/all/results/torznab'

  const response = await fetch(`${url}?apikey=5ud4rkwctn6wcr8d6ldsr5ysl94zgxey&t=movie&imdbid=${imdbId}`)
  const text = await response.text()
  
  const parser = new XMLParser()
  const data = parser.parse(text)
  
  if (!data.rss && !data.rss.channel && !data.rss.channel.item) {
    throw new Error('Missing items from trackers')
  }

  return data.rss.channel.item
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
