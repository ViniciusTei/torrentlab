import Movies, { MovieType } from './movies'
const THEMOVIEDB = 'https://api.themoviedb.org/'

class APIFacade {
  private moviesAPI: Movies

  constructor() {
    this.moviesAPI = new Movies()
  }

  public async fetchTrendingMovies(): Promise<MovieType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/movie/day?language=pt-BR`

    const data = await this.moviesAPI.fetchMovies(trendingUrl)

    return data 
  }

  public async fetchAllTrending(): Promise<MovieType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/all/day?language=pt-BR`

    const data = await this.moviesAPI.fetchMovies(trendingUrl)

    return data
  }

  public async fetchTrendingTvShows(): Promise<MovieType[]> {
    const trendingUrl = `${THEMOVIEDB}3/trending/tv/day?language=pt-BR`

    const data = await this.moviesAPI.fetchMovies(trendingUrl)

    return data
  }
  
  public async fetchMovieDetails(movie_id: number): Promise<MovieType> {
    const trendingUrl = `${THEMOVIEDB}3/movie/${movie_id}?language=pt-BR`

    const data = await this.moviesAPI.fetchDetails(trendingUrl)

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

