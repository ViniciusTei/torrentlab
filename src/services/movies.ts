import axios, { RawAxiosRequestConfig } from "axios"
import { TheMovieDbDetailResponse, TheMovieDbDetailsType, TheMovieDbResult, TheMovieDbTrendingResponse, TheMovieDbTrendingType } from "./themoviedb"

const THEMOVIEDB = 'https://api.themoviedb.org/'

class TheMoviesDB {
  private token: string

  constructor() {
    this.token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
  }

  private async fetchTheMovieDb(fetch_url: string) {
    const options: RawAxiosRequestConfig = {
      baseURL: THEMOVIEDB,
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: this.token
      }
    }

    const response = await axios.get(fetch_url, options)
    return response.data
  }

  public async fetchTheMovieDBSearch(query: string): Promise<TheMovieDbTrendingResponse> {
    const fetch_url = `/3/search/multi?query=${query}&include_adult=false&language=pt-BR&page=1`
    return this.fetchTheMovieDb(fetch_url)
  }

  public async fetchTheMovieDBTrending(fetch_url: string): Promise<TheMovieDbTrendingType[]> {
    const data: TheMovieDbTrendingResponse = await this.fetchTheMovieDb(fetch_url)

    return this.constructMoviesResponseWithImages(data.results)
  }

  public async fetchTheMovieDBDetails(fetch_url: string, is_movie = true): Promise<TheMovieDbDetailsType> {
    const data: TheMovieDbDetailResponse = await this.fetchTheMovieDb(fetch_url)
    const { base_url, backdrop_sizes, poster_sizes } = await this.fetchTheMovieConfiguration()

    if (is_movie) {
      const response = {
        id: data.id,
        title: data.title || data.original_name || data.original_title || "",
        overview: data.overview,
        popularity: data.popularity,
        release_date: new Date(data.release_date || data.first_air_date || "").toLocaleDateString("pt-BR"),
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
        genres: data.genres?.map(g => g.name),
        imdb_id: data.imdb_id,
        is_movie,
        is_tv_show: false
      }

      return response
    }

    const response = {
      id: data.id,
      title: data.title || data.original_name || data.original_title || "",
      overview: data.overview,
      popularity: data.popularity,
      release_date: new Date(data.release_date || data.first_air_date || "").toLocaleDateString("pt-BR"),
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
      genres: data.genres?.map(g => g.name),
      imdb_id: data.imdb_id,
      is_movie,
      is_tv_show: true
    }

    return response
  }

  private async constructMoviesResponseWithImages(entryData: TheMovieDbResult[]): Promise<TheMovieDbTrendingType[]> {
    const { base_url, backdrop_sizes, poster_sizes } = await this.fetchTheMovieConfiguration()
    const batchGenres = await this.fetchTheMovieDbGenres()

    const arrResult = [] as TheMovieDbTrendingType[]

    for (const entry of entryData) {
      const data: TheMovieDbTrendingType = {
        id: entry.id,
        title: entry.title || entry.original_name || entry.original_title || "",
        overview: entry.overview,
        popularity: entry.popularity,
        release_date: new Date(entry.release_date || entry.first_air_date || "").toLocaleDateString("pt-BR"),
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
        genres: entry.genre_ids.map(id => (batchGenres.find(x => x.id === id)?.name ?? 'Outros')),
        is_movie: entry.media_type === "movie"
      }

      arrResult.push(data)
    }

    return arrResult
  }

  private async fetchTheMovieConfiguration(): Promise<{ base_url: string, backdrop_sizes: string[], poster_sizes: string[] }> {
    const data = await this.fetchTheMovieDb(`${THEMOVIEDB}3/configuration`)

    if (!data.images) {
      throw new Error('Missing images configuration data')
    }

    const { base_url, backdrop_sizes, poster_sizes } = data.images

    return { base_url, backdrop_sizes, poster_sizes }
  }

  private async fetchTheMovieDbGenres(): Promise<{ id: number, name: string }[]> {
    const response = await this.fetchTheMovieDb(`${THEMOVIEDB}3/genre/movie/list`)

    return response.genres
  }

}

export default TheMoviesDB

