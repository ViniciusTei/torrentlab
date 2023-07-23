export type MovieDataTorrent = {
  url: string
  hash: string
  quality: string
  seeds: number
  peers: number
  size: string
  size_bytes: number
}

export type MovieData = {
  id: number
  title: string 
  title_long: string 
  slug: string 
  year: number
  rating: number
  genres: string[]
  summary: string 
  description_full: string
  background_image: string
  small_cover_image: string
  medium_cover_image: string
  large_cover_image: string
  torrents: MovieDataTorrent[]
}

type JSONResponse = {
  data: {
    movies: MovieData[]
  } 
}

export async function fetchMovieData(limit: number | undefined, page: number | undefined, query_term: string | undefined): Promise<MovieData[]> {
  const yts_uri = 'https://yts.mx/api/v2/list_movies.json'
  const url = `${yts_uri}?limit=${limit ?? 30}&page=${page ?? 1}&query_term=${query_term ?? 0}&sort_by=year`
  
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch page initial data')
  }

  const data: JSONResponse = await response.json()

  return data.data.movies
}
