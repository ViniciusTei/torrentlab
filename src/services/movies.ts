import TheMoviesDB, { TheMovieDbDetailResponse, TheMovieDbResponse, TheMovieDbResult } from "./themoviedb"

const THEMOVIEDB = 'https://api.themoviedb.org/'

export interface MovieType extends Omit<TheMovieDbResult, 'backdrop_path' | 'poster_path' | 'genre_ids'> {
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

class Movies extends TheMoviesDB {
  constructor() {
    super()
  }

  public async fetchMovies(fetch_url: string): Promise<MovieType[]> {
    const data: TheMovieDbResponse = await this.fetchTheMovieDb(fetch_url)

    return this.constructMoviesResponseWithImages(data.results)
  }

  public async fetchDetails(fetch_url: string): Promise<MovieType> {
    const data: TheMovieDbDetailResponse = await this.fetchTheMovieDb(fetch_url)
    const { base_url, backdrop_sizes, poster_sizes } = await this.fetchTheMovieConfiguration()

    const response: MovieType = {
      id: data.id,
      title: data.title || data.original_name || data.original_title || "",
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.release_date).toLocaleDateString("pt-BR"),
      original_title: data.original_name,
      original_language: data.original_language,
      images: {
        backdrop_paths: {
          sm: `${base_url}/${backdrop_sizes.find(s => s === 'w300') ?? 'original'}${data.backdrop_path}`, 
          md: `${base_url}/${backdrop_sizes.find(s => s === 'w700') ?? 'original'}${data.backdrop_path}`, 
          lg: `${base_url}/${backdrop_sizes.find(s => s === 'w1280') ?? 'original'}${data.backdrop_path}`, 
        },
        poster_paths: {
          sm: `${base_url}/${poster_sizes.find(s => s === 'w92') ?? 'original'}${data.poster_path}`, 
          md: `${base_url}/${poster_sizes.find(s => s === 'w185') ?? 'original'}${data.poster_path}`, 
          lg: `${base_url}/${poster_sizes.find(s => s === 'w780') ?? 'original'}${data.poster_path}`, 
        }
      },
      genres: data.genres.map(g => g.name),
      imdb_id: data.imdb_id,
    }
  
    return response
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


  private async constructMoviesResponseWithImages(entryData: TheMovieDbResult[]): Promise<MovieType[]> {
    const { base_url, backdrop_sizes, poster_sizes } = await this.fetchTheMovieConfiguration()
    const batchGenres = await this.fetchTheMovieDbGenres()

    const arrResult = [] as MovieType[]

    for (const entry of entryData) {
      const data: MovieType = {
        id: entry.id,
        title: entry.title || entry.original_name || entry.original_title || "",
        overview: entry.overview,
        popularity: entry.popularity,
        release_date: new Date(entry.release_date).toLocaleDateString("pt-BR"),
        original_title: entry.original_name,
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

export default Movies

