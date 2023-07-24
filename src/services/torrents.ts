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

async function fetchOMBDApi(searchName: string): Promise<OMDBSearch[]> {
  const apiKey = '6c3ebf7c'
  const url = 'http://www.omdbapi.com/'

  const response = await fetch(`${url}?apikey=${apiKey}&s=${searchName}`)
  const data: OMDBResponse = await response.json()
  
  return data.Search
}

async function fetchJackettApi(imdbId: string) {
  const url = 'http://localhost:9117/api/v2.0/indexers/all/results/torznab'

  const response = await fetch(`${url}?apikey=5ud4rkwctn6wcr8d6ldsr5ysl94zgxey&t=movie&imdbid=${imdbId}`)
  const text = await response.text()
  const xml = new window.DOMParser().parseFromString(text, 'text/xml')
  console.log('From jackett', xml)
  return xml
}

export async function torrentFactory(search: string) {
  const response = await fetchOMBDApi(search)
  const movie = response.find(f => f.Title === search && f.Type === "movie")

  if (!movie) {
    throw new Error("Could not find a correspondenting imdb movie");
  }

  const data = await fetchJackettApi(movie.imdbID)
  
  if (!data) {
    throw new Error("Could not find a torrent for your movie")
  }

  return data
}
