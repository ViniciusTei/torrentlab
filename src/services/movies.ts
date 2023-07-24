export type MovieDataTorrent = {
  url: string
  hash: string
  quality: string
  seeds: number
  peers: number
  size: string
  size_bytes: number
}

const THEMOVIEDB = 'https://api.themoviedb.org/'

export type TheMovieDbResult = {
  id: number
  backdrop_path: string
  title: string
  original_language: string
  original_title: string
  overview: string
  poster_path: string
  popularity: number
  release_date: string
  genre_ids: number[]
}

export type TheMovieDbResponse = {
  page: number
  total_page: number
  total_results: number
  results: TheMovieDbResult[]
}

async function fetchTheMovieDb(url: string) {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
    }
  }

  const response = await fetch(url, options)
  return await response.json()
}

export async function fetchTrendingMovies(): Promise<TheMovieDb[]> {
  const trendingUrl = `${THEMOVIEDB}3/trending/movie/day`
  const header = {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
  }

  const response = await fetch(trendingUrl, {
    method: 'GET',
    headers: header
  })

  const data: TheMovieDbResponse = await response.json()

  return constructMoviesResponseWithImages(data.results)
}

export async function fetchAllTrending(): Promise<TheMovieDb[]> {
  const trendingUrl = `${THEMOVIEDB}3/trending/all/day`
  const header = {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
  }

  const response = await fetch(trendingUrl, {
    method: 'GET',
    headers: header
  })

  const data: TheMovieDbResponse = await response.json()

  return constructMoviesResponseWithImages(data.results.slice(0, 10))
}

export interface TheMovieDb extends Omit<TheMovieDbResult, 'backdrop_path' | 'poster_path'> {
  images: {
    backdrop_paths: {
      sm: string
      md: string
      lg: string
    },
    poster_paths: {
      sm: string
      md: string
      lg: string
    }
  }
  genres: string[]
}

async function fetchTheMovieConfiguration() {
  const data = await fetchTheMovieDb(`${THEMOVIEDB}3/configuration`)
  
  if (!data.images) {
    throw new Error('Missing images configuration data')
  }

  const { base_url, backdrop_sizes, poster_sizes } = data.images
  
  return { base_url, backdrop_sizes , poster_sizes }
}

async function fetchTheMovieDbGenres() {
  const response = await fetchTheMovieDb(`${THEMOVIEDB}3/genre/movie/list`)

  return response.genres
}


async function constructMoviesResponseWithImages(entryData: TheMovieDbResult[]): Promise<TheMovieDb[]> {
  const { base_url, backdrop_sizes, poster_sizes } = await fetchTheMovieConfiguration()
  const batchGenres = await fetchTheMovieDbGenres()

  const result = entryData.map(entry => {
    const entryMap = {
      ...entry,
      images: {
        backdrop_paths: {
          sm: `${base_url}/${backdrop_sizes.find(s => s === 'w300') ?? 'original'}${entry.backdrop_path}`, 
          md: `${base_url}/${backdrop_sizes.find(s => s === 'w700') ?? 'original'}${entry.backdrop_path}`, 
          lg: `${base_url}/${backdrop_sizes.find(s => s === 'w1280') ?? 'original'}${entry.backdrop_path}`, 
        },
        poster_paths: {
          sm: `${base_url}/${poster_sizes.find(s => s === 'w92') ?? 'original'}${entry.poster_path}`, 
          md: `${base_url}/${poster_sizes.find(s => s === 'w185') ?? 'original'}${entry.poster_path}`, 
          lg: `${base_url}/${poster_sizes.find(s => s === 'w780') ?? 'original'}${entry.poster_path}`, 

        }
      },
      genres: entry.genre_ids.map(id => (batchGenres.find(x => x.id === id)?.name ?? 'Outros'))
    }

    delete entryMap.backdrop_path
    delete entryMap.poster_path

    return entryMap
  })

  return result
}
