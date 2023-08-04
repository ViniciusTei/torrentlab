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

class APIFacade {
  private token: string

  constructor() {
    this.token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
  }

  private async fetchTheMovieDb(url: string) {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: this.token
      }
    }

    const response = await fetch(url, options)
    return await response.json()
  }

  public async fetchTrendingMovies(): Promise<TheMovieDb[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/movie/day`

    const data: TheMovieDbResponse = await this.fetchTheMovieDb(trendingUrl)

    return this.constructMoviesResponseWithImages(data.results)
  }

  public async fetchAllTrending(): Promise<TheMovieDb[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/all/day`

    const data: TheMovieDbResponse = await this.fetchTheMovieDb(trendingUrl)

    return this.constructMoviesResponseWithImages(data.results.slice(0, 10))
  }

  private async fetchTheMovieConfiguration(): Promise<{ base_url: string, backdrop_sizes: string[], poster_sizes: string[]}> {
    const data = await this.fetchTheMovieDb(`${THEMOVIEDB}3/configuration`)
    
    if (!data.images) {
      throw new Error('Missing images configuration data')
    }

    const { base_url, backdrop_sizes, poster_sizes } = data.images
    
    return { base_url, backdrop_sizes , poster_sizes }
  }

  private async fetchTheMovieDbGenres(): Promise<{ id: number, name: string}[]> {
    const response = await this.fetchTheMovieDb(`${THEMOVIEDB}3/genre/movie/list`)

    return response.genres
  }


  private async constructMoviesResponseWithImages(entryData: TheMovieDbResult[]): Promise<TheMovieDb[]> {
    const { base_url, backdrop_sizes, poster_sizes } = await this.fetchTheMovieConfiguration()
    const batchGenres = await this.fetchTheMovieDbGenres()

    const arrResult = [] as TheMovieDb[]

    for (const entry of entryData) {
        const data: TheMovieDb = {
          id: entry.id,
          title: entry.title,
          overview: entry.overview,
          genre_ids: entry.genre_ids,
          popularity: entry.popularity,
          release_date: entry.release_date,
          original_title: entry.original_title,
          original_language: entry.original_language,
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
        
        arrResult.push(data)
    }

    return arrResult
  }
}

let globalAPI: APIFacade | null = null

function getAPI() {
  if (!globalAPI) {
    globalAPI = new APIFacade()
  }

  return globalAPI

}


export default getAPI

