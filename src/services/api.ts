import Movies from './movies'
import { TheMovieDbDetailResponse, TheMovieDbTrendingType } from './themoviedb'
const THEMOVIEDB = 'https://api.themoviedb.org/'

class APIFacade {
  private moviesAPI: Movies

  constructor() {
    this.moviesAPI = new Movies()
  }

  public async fetchTrendingMovies(): Promise<TheMovieDbTrendingType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/movie/day?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBTrending(trendingUrl)

    return data
  }

  public async fetchAllTrending(): Promise<TheMovieDbTrendingType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/all/day?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBTrending(trendingUrl)

    return data
  }

  public async fetchTrendingTvShows(): Promise<TheMovieDbTrendingType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/tv/day?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBTrending(trendingUrl)

    return data
  }

  public async fetchMovieDetails(movie_id: number) {
    const trendingUrl = `${THEMOVIEDB}3/movie/${movie_id}?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl)

    return data
  }

  public async fetchTvShowsDetails(id: number) {
    const trendingUrl = `${THEMOVIEDB}3/tv/${id}?language=pt-BR`

    const data = await this.moviesAPI.fetchTheMovieDBDetails(trendingUrl, false)

    return data
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

