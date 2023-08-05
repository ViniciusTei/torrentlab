export type TheMovieDbResult = {
  id: number
  backdrop_path: string
  title: string
  original_language: string
  original_name?: string
  original_title?: string
  overview: string
  poster_path: string
  popularity: number
  release_date: string
  genre_ids: number[]
  imdb_id?: string
}

export type TheMovieDbResponse = {
  page: number
  total_page: number
  total_results: number
  results: TheMovieDbResult[]
}

export interface TheMovieDbDetailResponse extends Omit<TheMovieDbResult, 'genre_ids'> {
  genres: { id: number, name: string }[]
}

class TheMoviesDB {
   private token: string

  constructor() {
    this.token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c'
  }

  public async fetchTheMovieDb(fetch_url: string) {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: this.token
      }
    }

    const response = await fetch(fetch_url, options)
    return await response.json()
  }
}

export default TheMoviesDB

