import axios, { AxiosError } from 'axios'
import Movies from './movies'
import { TheMovieDbDetailsType, TheMovieDbTrendingType } from './types/themoviedb'

class API {
  private moviesAPI: Movies

  constructor() {
    this.moviesAPI = new Movies()
  }

  public async fetchDownloaded() {
    try {
      const result = await axios.get<{ the_movie_db_id: number }[]>('http://localhost:5174/downloads')
      const ids = result.data.map(d => d.the_movie_db_id)
      const downloaded = [] as TheMovieDbDetailsType[]
      for (const id of ids) {
        const detail = await this.fetchMovieDetails(id)
        downloaded.push(detail)
      }
      return downloaded
    } catch (error) {
      throw error
    }
  }

  public async fetchTrendingMovies(): Promise<TheMovieDbTrendingType[]> {
    const data = await this.moviesAPI.fetchTheMovieDBTrending('/3/trending/movie/day?language=pt-BR')

    return data
  }

  public async fetchAllTrending(): Promise<TheMovieDbTrendingType[]> {
    const data = await this.moviesAPI.fetchTheMovieDBTrending('/3/trending/all/day?language=pt-BR')

    return data
  }

  public async fetchTrendingTvShows(): Promise<TheMovieDbTrendingType[]> {
    const data = await this.moviesAPI.fetchTheMovieDBTrending('/3/trending/tv/day?language=pt-BR')

    return data
  }

  public async fetchMovieDetails(movie_id: number) {
    try {
      const trendingUrl = `/3/movie/${movie_id}?language=pt-BR`

      const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl)

      return data
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error
      }

      throw new Error('Algo de errado aconteceu ao tentar buscar os detalhes do filme.')
    }
  }

  public async fetchTvShowsDetails(id: number) {
    const trendingUrl = `/3/tv/${id}?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl, false)

    return data
  }

  public async searchAll(query: string) {
    return await this.moviesAPI.fetchTheMovieDBSearch(query)
  }

  public async downloadSubtitles(id: number) {
    return this.moviesAPI.downloadSubs(id)
  }
}

let globalAPI: API | null = null

function getAPI() {
  if (!globalAPI) {
    globalAPI = new API()
  }

  return globalAPI
}

export default getAPI

