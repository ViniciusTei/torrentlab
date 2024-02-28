import Movies from './movies'
import { TheMovieDbTrendingType } from './types/themoviedb'

class API {
  private moviesAPI: Movies

  constructor() {
    this.moviesAPI = new Movies()
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
    const trendingUrl = `/3/movie/${movie_id}?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl)

    return data
  }

  public async fetchTvShowsDetails(id: number) {
    const trendingUrl = `/3/tv/${id}?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl, false)

    return data
  }

  public async searchAll(query: string) {
    return await this.moviesAPI.fetchTheMovieDBSearch(query)
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

